import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitWebhook } from "@/lib/n8n";
import { notifyMembers } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Cron target — hits this endpoint daily (Vercel Cron or n8n). It scans for
// dojo + student memberships that expire in exactly ~30 days and fans out
// both an in-app notification and an n8n webhook so an email/WhatsApp goes
// out. Sending twice on adjacent days is fine (upserted notifications carry
// a link, not a stateful timer) — n8n's own dedupe will squash re-sends.
export async function GET(request: Request) {
    // Optional shared secret. Cron dispatcher must pass ?key=... or
    // Authorization: Bearer <secret>.
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const url = new URL(request.url);
        const key = url.searchParams.get("key");
        const auth = request.headers.get("authorization");
        const providedBearer = auth?.startsWith("Bearer ")
            ? auth.slice(7)
            : null;
        if (key !== cronSecret && providedBearer !== cronSecret) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
    }

    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in31 = new Date(now);
    in31.setDate(in31.getDate() + 31);

    // Dojos expiring in the ~30-day window (>= 30 days from now, < 31 days).
    // Using a one-day window makes the daily cron idempotent per-dojo.
    const dojos = await prisma.dojo.findMany({
        where: {
            isActive: true,
            expiryDate: { gte: in30, lt: in31 },
        },
        select: {
            id: true,
            name: true,
            email: true,
            annualFee: true,
            expiryDate: true,
            owner: {
                select: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            },
        },
    });

    // Students expiring in the same window.
    const students = await prisma.student.findMany({
        where: {
            membershipStatus: "ACTIVE",
            expiryDate: { gte: in30, lt: in31 },
        },
        select: {
            id: true,
            expiryDate: true,
            user: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                },
            },
        },
    });

    for (const dojo of dojos) {
        const owner = dojo.owner?.user;
        if (owner?.id) {
            await notifyMembers([owner.id], {
                title: "Dojo membership expires in 30 days",
                message: `${dojo.name} — expires ${dojo.expiryDate?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) ?? "soon"}. Renew now to avoid interruption.`,
                type: "PAYMENT",
                link: "/portal/dojo/renewals",
            });
        }
        const recipientEmail = owner?.email ?? dojo.email;
        if (recipientEmail) {
            await emitWebhook("jka.renewal.reminder", {
                kind: "dojo",
                dojoId: dojo.id,
                dojoName: dojo.name,
                recipientEmail,
                recipientName: owner?.fullName ?? dojo.name,
                recipientPhone: owner?.phone ?? null,
                expiryDate: dojo.expiryDate?.toISOString() ?? null,
                annualFee: dojo.annualFee != null ? Number(dojo.annualFee) : null,
                renewUrl: "/portal/dojo/renewals",
                daysLeft: 30,
            });
        }
    }

    for (const student of students) {
        const u = student.user;
        if (u?.id) {
            await notifyMembers([u.id], {
                title: "Membership expires in 30 days",
                message: `Your JKA membership expires ${student.expiryDate?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) ?? "soon"}. Renew now to keep training.`,
                type: "PAYMENT",
                link: "/portal/renew",
            });
        }
        if (u?.email) {
            await emitWebhook("jka.renewal.reminder", {
                kind: "student",
                memberId: u.id,
                recipientEmail: u.email,
                recipientName: u.fullName,
                recipientPhone: u.phone ?? null,
                expiryDate: student.expiryDate?.toISOString() ?? null,
                renewUrl: "/portal/renew",
                daysLeft: 30,
            });
        }
    }

    return NextResponse.json({
        ok: true,
        dojos: dojos.length,
        students: students.length,
    });
}
