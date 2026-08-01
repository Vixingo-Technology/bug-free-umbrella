import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import AdminCertificatesClient from "@/components/portal/admin/certificates-client";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
    await requireAdmin();

    const recentRequests = await prisma.certificateRequest
        .findMany({
            orderBy: { createdAt: "desc" },
            take: 500,
            include: {
                student: {
                    select: {
                        user: {
                            select: { fullName: true, memberNumber: true },
                        },
                    },
                },
                dojo: { select: { name: true } },
            },
        })
        .then((rows) =>
            rows.map((r) => ({
                ...r,
                member: {
                    fullName: r.student.user.fullName,
                    memberNumber: r.student.user.memberNumber,
                },
            })),
        );

    return (
        <AdminCertificatesClient
            recentRequests={serialize(recentRequests) as never}
        />
    );
}
