import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CertificatePreview from "@/components/certificates/preview";

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

    return (
        <CertificatePreview
            requestId={req.id}
            status={req.status}
            certificateUrl={req.certificateUrl}
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
        />
    );
}
