import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import DojosAdminClient from "@/components/portal/admin/dojos-client";

export const dynamic = "force-dynamic";

export default async function AdminDojosPage() {
    await requireAdmin();

    // Backfill missing expiry dates. Dojos created before renewals shipped
    // don't have `expiryDate`; anchor them to createdAt + 1 year so the
    // admin table and every downstream reminder can quote a concrete date
    // and days-left. Idempotent — only touches rows where expiryDate IS NULL.
    const stale = await prisma.dojo.findMany({
        where: { expiryDate: null },
        select: { id: true, createdAt: true },
    });
    if (stale.length > 0) {
        await Promise.all(
            stale.map((d) => {
                const anchor = new Date(d.createdAt);
                anchor.setFullYear(anchor.getFullYear() + 1);
                return prisma.dojo.update({
                    where: { id: d.id },
                    data: { expiryDate: anchor },
                });
            }),
        );
    }

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
