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
                _count: { select: { students: true } },
                owner: {
                    include: { user: { select: { id: true, fullName: true, email: true } } },
                },
            },
        }),
        prisma.user.findMany({
            where: { roleId: { in: ["INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER", "ADMIN"] } },
            select: { id: true, fullName: true, email: true, roleId: true },
            orderBy: { fullName: "asc" },
        }).then((rows) => rows.map((r) => ({ ...r, role: r.roleId }))),
    ]);

    const dojos = dojosRaw.map((d) => {
        const { owner, _count, ...rest } = d;
        const head = owner?.user ?? null;
        return {
            ...rest,
            _count: { members: _count.students },
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
