import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import MembersAdminClient from "@/components/portal/admin/members-client";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
    await requireAdmin();

    const members = await prisma.member.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            dojo: { select: { id: true, name: true } },
        },
    });

    return <MembersAdminClient members={serialize(members) as never} />;
}
