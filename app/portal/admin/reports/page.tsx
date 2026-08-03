import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import ReportsAdminClient from "@/components/portal/admin/reports-client";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
    await requireAdmin();

    const [dojos, members] = await Promise.all([
        prisma.dojo.findMany({
            select: { id: true, name: true, shortName: true },
            orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                memberNumber: true,
                roleId: true,
            },
            orderBy: { fullName: "asc" },
        }),
    ]);

    return <ReportsAdminClient dojos={dojos} members={members} />;
}
