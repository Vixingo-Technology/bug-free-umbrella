import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import DojosAdminClient from "@/components/portal/admin/dojos-client";

export const dynamic = "force-dynamic";

export default async function AdminDojosPage() {
    await requireAdmin();

    const [dojos, instructors] = await Promise.all([
        prisma.dojo.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                headInstructor: { select: { id: true, fullName: true, email: true } },
                _count: { select: { members: true } },
            },
        }),
        prisma.member.findMany({
            where: { role: { in: ["INSTRUCTOR", "ADMIN"] } },
            select: { id: true, fullName: true, email: true, role: true },
            orderBy: { fullName: "asc" },
        }),
    ]);

    return (
        <DojosAdminClient
            dojos={serialize(dojos) as never}
            instructors={instructors}
        />
    );
}
