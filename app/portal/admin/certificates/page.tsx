import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import AdminCertificatesClient from "@/components/portal/admin/certificates-client";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
    await requireAdmin();

    const [settings, ranksRaw, recentRequests] = await Promise.all([
        prisma.systemSettings.upsert({
            where: { id: "default" },
            update: {},
            create: { id: "default" },
        }),
        prisma.beltRank.findMany({
            orderBy: { orderIndex: "asc" },
            select: {
                id: true,
                name: true,
                kyuDan: true,
                colorHex: true,
                orderIndex: true,
                certificatePrice: true,
            },
        }),
        prisma.certificateRequest.findMany({
            orderBy: { createdAt: "desc" },
            take: 500,
            include: {
                student: { select: { user: { select: { fullName: true, memberNumber: true } } } },
                dojo: { select: { name: true } },
            },
        }).then((rows) => rows.map((r) => ({
            ...r,
            member: { fullName: r.student.user.fullName, memberNumber: r.student.user.memberNumber },
        }))),
    ]);

    return (
        <AdminCertificatesClient
            settings={serialize(settings) as never}
            ranks={serialize(ranksRaw) as never}
            recentRequests={serialize(recentRequests) as never}
        />
    );
}
