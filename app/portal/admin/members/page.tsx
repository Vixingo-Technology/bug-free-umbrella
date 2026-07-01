import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import MembersAdminClient from "@/components/portal/admin/members-client";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
    await requireAdmin();

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            student: { include: { dojo: { select: { id: true, name: true } } } },
        },
    });

    const members = users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        role: u.roleId,
        isActive: u.isActive,
        createdAt: u.createdAt,
        membershipStatus: u.student?.membershipStatus ?? "PENDING",
        currentRank: u.student?.currentRank ?? "—",
        memberNumber: u.student?.memberNumber ?? null,
        onboardingComplete: u.student?.onboardingComplete ?? (u.roleId !== "STUDENT"),
        dojo: u.student?.dojo ?? null,
    }));

    return <MembersAdminClient members={serialize(members) as never} />;
}
