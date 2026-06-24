import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import DojosAdminClient from "@/components/portal/admin/dojos-client";

export const dynamic = "force-dynamic";

export default async function AdminDojosPage() {
    await requireAdmin();

    const [dojosRaw, instructors] = await Promise.all([
        prisma.dojo.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { members: true } },
                members: {
                    where: { role: "DOJO_OWNER" },
                    select: { id: true, fullName: true, email: true },
                    take: 1,
                },
            },
        }),
        prisma.member.findMany({
            where: { role: { in: ["INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER", "ADMIN"] } },
            select: { id: true, fullName: true, email: true, role: true },
            orderBy: { fullName: "asc" },
        }),
    ]);

    // Project the head from the unified members table onto the legacy field name
    // the client component expects.
    const dojos = dojosRaw.map((d) => {
        const { members, ...rest } = d;
        const head = members[0] ?? null;
        return {
            ...rest,
            headInstructorId: head?.id ?? null,
            headInstructor: head,
        };
    });

    return (
        <DojosAdminClient
            dojos={serialize(dojos) as never}
            instructors={instructors}
        />
    );
}
