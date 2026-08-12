import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import ReportsAdminClient from "@/components/portal/admin/reports-client";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
    await requireAdmin();

    const [dojos, members, events, categoryRows] = await Promise.all([
        prisma.dojo.findMany({
            select: { id: true, name: true, shortName: true },
            orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                contactEmail: true,
                memberNumber: true,
                roleId: true,
            },
            orderBy: { fullName: "asc" },
        }),
        prisma.event.findMany({
            select: {
                id: true,
                title: true,
                eventDate: true,
                category: true,
                dojo: { select: { name: true } },
            },
            orderBy: { eventDate: "desc" },
            take: 500,
        }),
        prisma.tournamentParticipant.findMany({
            where: { category: { not: null } },
            select: { category: true },
            distinct: ["category"],
            orderBy: { category: "asc" },
        }),
    ]);

    const categories = categoryRows
        .map((r) => r.category)
        .filter((c): c is string => !!c && c.trim().length > 0);

    return (
        <ReportsAdminClient
            dojos={dojos}
            members={members}
            events={events.map((e) => ({
                id: e.id,
                title: e.title,
                eventDate: e.eventDate.toISOString(),
                category: e.category,
                dojoName: e.dojo?.name ?? null,
            }))}
            categories={categories}
        />
    );
}
