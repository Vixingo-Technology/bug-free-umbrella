"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import { generateCertificatePdf } from "@/lib/certificates/generate";
import { SKIP_CERTIFICATE_PAYMENT } from "@/lib/certificates/config";

const requestSchema = z.object({
    gradingIds: z.array(z.string().uuid()).min(1).max(100),
});

type ActionResult =
    | { success: true; orderId: string }
    | { error: string };

/**
 * Create a CertificateRequest per selected grading and bundle them into a
 * single ShopOrder under the dojo owner's memberId. Caller redirects to
 * /portal/checkout?orderId=... after success.
 */
export async function createCertificateOrderAction(input: {
    gradingIds: string[];
}): Promise<ActionResult | never> {
    const session = await requireDojoRole("DOJO_MANAGER");
    if (!session.dojo) {
        return { error: "Your dojo is not set up yet." };
    }
    const dojoId = session.dojo.id;

    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) {
        return { error: "Select at least one student before continuing." };
    }

    const dojo = await prisma.dojo.findUnique({
        where: { id: dojoId },
        select: { ownerSignatureUrl: true, name: true },
    });
    if (!dojo?.ownerSignatureUrl) {
        return {
            error:
                "Upload the Dojo Owner signature in Settings before requesting certificates.",
        };
    }

    const owner = await prisma.dojoOwner.findUnique({
        where: { dojoId },
        select: { id: true },
    });
    if (!owner) {
        return {
            error: "Assign a Dojo Owner before requesting certificates.",
        };
    }

    // Load each grading + member + rank. Reject any that don't belong to
    // this dojo's roster or aren't PASSED.
    const gradings = await prisma.grading.findMany({
        where: {
            id: { in: parsed.data.gradingIds },
            result: "PASSED",
            student: { dojoId },
        },
        include: {
            student: {
                include: { user: { select: { fullName: true } } },
            },
            toRank: {
                select: { name: true, certificatePrice: true },
            },
        },
    });

    if (gradings.length === 0) {
        return { error: "No eligible gradings selected." };
    }

    // Reject any students missing parent names — needed for the certificate.
    const missingParents = gradings.filter(
        (g) => !g.student.fatherName?.trim() || !g.student.motherName?.trim(),
    );
    if (missingParents.length > 0) {
        return {
            error: `Father's and mother's name missing for: ${missingParents
                .map((g) => g.student.user.fullName)
                .join(", ")}. Ask them to complete their profile first.`,
        };
    }

    // Skip gradings that already have an open (not-yet-ISSUED) request to
    // avoid double-charging.
    const existingOpen = await prisma.certificateRequest.findMany({
        where: {
            gradingId: { in: gradings.map((g) => g.id) },
            status: { in: ["PENDING_PAYMENT", "PAID", "GENERATING", "ISSUED"] },
        },
        select: { gradingId: true, status: true },
    });
    const blockedIds = new Set(existingOpen.map((r) => r.gradingId));
    const eligible = gradings.filter((g) => !blockedIds.has(g.id));
    if (eligible.length === 0) {
        return {
            error:
                "Every selected grading already has a certificate request in progress or issued.",
        };
    }

    const lineItems = eligible.map((g) => {
        const price =
            g.toRank?.certificatePrice != null
                ? Number(g.toRank.certificatePrice)
                : 0;
        return {
            gradingId: g.id,
            studentId: g.student.id,
            rankName: g.toRank?.name ?? "Unknown rank",
            memberName: g.student.user.fullName,
            fatherName: g.student.fatherName ?? null,
            motherName: g.student.motherName ?? null,
            price,
        };
    });

    const total = lineItems.reduce((s, l) => s + l.price, 0);
    if (total <= 0) {
        return {
            error:
                "No certificate price set for the selected ranks. Ask the federation admin to configure pricing.",
        };
    }

    try {
        const { orderId, requestIds } = await prisma.$transaction(
            async (tx) => {
                const order = await tx.shopOrder.create({
                    data: {
                        userId: owner.id,
                        certDojoId: dojoId,
                        includesCertificates: true,
                        total,
                        paymentStatus: SKIP_CERTIFICATE_PAYMENT ? "PAID" : "PENDING",
                        notes: `Certificates — ${dojo.name} (${lineItems.length})`,
                    },
                });

                await tx.certificateRequest.createMany({
                    data: lineItems.map((l) => ({
                        gradingId: l.gradingId,
                        studentId: l.studentId,
                        dojoId,
                        orderId: order.id,
                        status: SKIP_CERTIFICATE_PAYMENT ? "PAID" : "PENDING_PAYMENT",
                        price: l.price,
                        memberName: l.memberName,
                        fatherName: l.fatherName,
                        motherName: l.motherName,
                        rankName: l.rankName,
                    })),
                });

                const created = await tx.certificateRequest.findMany({
                    where: { orderId: order.id },
                    select: { id: true },
                });

                return {
                    orderId: order.id,
                    requestIds: created.map((c) => c.id),
                };
            },
        );

        if (SKIP_CERTIFICATE_PAYMENT) {
            // Generate PDFs inline. Failures land on the individual request
            // row (FAILED + failureReason) — the dojo sees them in history.
            for (const id of requestIds) {
                const res = await generateCertificatePdf({
                    certificateRequestId: id,
                });
                if (!res.ok) {
                    console.error(
                        "[certificate] inline generation failed",
                        id,
                        res.reason,
                    );
                }
            }
            revalidatePath("/portal/dojo/certificates");
            redirect(`/portal/dojo/certificates?issued=${requestIds.length}`);
        }

        revalidatePath("/portal/dojo/certificates");
        redirect(`/portal/checkout?orderId=${orderId}`);
    } catch (err) {
        if (
            err &&
            typeof err === "object" &&
            "digest" in err &&
            typeof (err as { digest?: unknown }).digest === "string" &&
            (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
            throw err;
        }
        console.error("[createCertificateOrder] failed", err);
        return { error: "Could not start checkout. Try again." };
    }
}
