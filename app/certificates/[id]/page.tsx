import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CertificatePreview from "@/components/certificates/preview";
import { getSignedCloudinaryUrl, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    if (!UUID_RE.test(id)) return { title: "Certificate" };

    let req: { memberName: string; rankName: string } | null = null;
    try {
        req = await prisma.certificateRequest.findUnique({
            where: { id },
            select: { memberName: true, rankName: true },
        });
    } catch {
        // ignore
    }

    if (!req) return { title: "Certificate — JKA Bangladesh" };
    return {
        title: `${req.memberName} — ${req.rankName} · JKA Bangladesh`,
        description: `Official JKA Bangladesh ${req.rankName} certificate issued to ${req.memberName}.`,
    };
}

export default async function CertificatePreviewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!UUID_RE.test(id)) notFound();

    let req: any = null;
    let settings: any = null;
    try {
        [req, settings] = await Promise.all([
            prisma.certificateRequest.findUnique({
                where: { id },
                include: {
                    member: {
                        select: { memberNumber: true, avatarUrl: true },
                    },
                    dojo: {
                        select: { name: true, ownerSignatureUrl: true },
                    },
                    grading: {
                        select: {
                            createdAt: true,
                            gradingEvent: { select: { name: true, eventDate: true } },
                            toRank: { select: { colorHex: true } },
                        },
                    },
                },
            }),
            prisma.systemSettings.findUnique({ where: { id: "default" } }),
        ]);
    } catch {
        notFound();
    }

    if (!req) notFound();

    // Show the "Regenerate" button only for admins. Public visitors who land
    // here via the QR code just see the certificate.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let canRegenerate = false;
    if (user) {
        const m = await prisma.member.findUnique({
            where: { id: user.id },
            select: { role: true },
        });
        canRegenerate = m?.role === "ADMIN";
    }

    // Cloudinary blocks public delivery of PDFs by default ("Restricted media
    // types"). Sign the URL so it bypasses that restriction. Public id mirrors
    // what generate.ts uploads to.
    let signedUrl: string | null = null;
    if (req.certificateUrl) {
        try {
            signedUrl = await getSignedCloudinaryUrl({
                publicId: `${CLOUDINARY_FOLDERS.certificates}/cert-${req.id}`,
                resourceType: "raw",
                format: "pdf",
            });
        } catch (e) {
            console.warn("[certificate/view] failed to sign URL", e);
            signedUrl = req.certificateUrl;
        }
    }

    return (
        <CertificatePreview
            requestId={req.id}
            status={req.status}
            certificateUrl={signedUrl}
            memberName={req.memberName}
            memberNumber={req.member?.memberNumber ?? null}
            fatherName={req.fatherName}
            motherName={req.motherName}
            rankName={req.rankName}
            rankColorHex={req.grading?.toRank?.colorHex ?? null}
            eventName={req.grading?.gradingEvent?.name ?? null}
            issuedDate={
                req.updatedAt
                    ? new Date(req.updatedAt).toISOString()
                    : new Date(req.createdAt).toISOString()
            }
            dojoName={req.dojo?.name ?? ""}
            adminSignatureUrl={settings?.adminSignatureUrl ?? null}
            adminSignerName={
                settings?.adminSignerName ?? "President, JKA Bangladesh"
            }
            ownerSignatureUrl={req.dojo?.ownerSignatureUrl ?? null}
            logoUrl={settings?.certificateLogoUrl ?? null}
            canRegenerate={canRegenerate}
        />
    );
}
