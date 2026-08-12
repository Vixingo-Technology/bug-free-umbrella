import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import MembersAdminClient from "@/components/portal/admin/members-client";

export const dynamic = "force-dynamic";

const dojoSelect = { select: { id: true, name: true } } as const;

export default async function AdminMembersPage() {
    await requireAdmin();

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            student: { include: { dojo: dojoSelect } },
            instructor: { include: { dojo: dojoSelect } },
            dojoManager: { include: { dojo: dojoSelect } },
            dojoOwner: { include: { dojo: dojoSelect } },
        },
    });

    // Load latest dojo application per owner for status derivation.
    const ownerIds = users
        .filter((u) => u.roleId === "DOJO_OWNER")
        .map((u) => u.id);

    const ownerApplications = ownerIds.length
        ? await prisma.dojoApplication.findMany({
              where: { userId: { in: ownerIds } },
              orderBy: { createdAt: "desc" },
              select: { userId: true, status: true, createdAt: true },
          })
        : [];

    const latestAppByUser = new Map<string, "PENDING_PAYMENT" | "PAID" | "APPROVED" | "REJECTED">();
    for (const app of ownerApplications) {
        if (!app.userId) continue;
        if (!latestAppByUser.has(app.userId)) {
            latestAppByUser.set(app.userId, app.status);
        }
    }

    const members = users.map((u) => {
        const role = u.roleId as "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" | "ADMIN";
        const dojo =
            u.student?.dojo ??
            u.instructor?.dojo ??
            u.dojoManager?.dojo ??
            u.dojoOwner?.dojo ??
            null;

        // Derive a role-appropriate status.
        let status: "ACTIVE" | "PENDING" | "EXPIRED" | "SUSPENDED" | "UNPAID" | "AWAITING_APPROVAL" | "REJECTED";
        if (role === "STUDENT") {
            status = u.student?.membershipStatus ?? "PENDING";
        } else if (role === "DOJO_OWNER") {
            const app = latestAppByUser.get(u.id);
            if (!u.isActive) status = "SUSPENDED";
            else if (app === "PENDING_PAYMENT") status = "UNPAID";
            else if (app === "PAID") status = "AWAITING_APPROVAL";
            else if (app === "REJECTED") status = "REJECTED";
            else status = "ACTIVE"; // APPROVED or no application row
        } else {
            // INSTRUCTOR / DOJO_MANAGER / ADMIN — driven purely by isActive.
            status = u.isActive ? "ACTIVE" : "SUSPENDED";
        }

        return {
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            contactEmail: u.contactEmail,
            phone: u.phone,
            avatarUrl: u.avatarUrl,
            role,
            isActive: u.isActive,
            createdAt: u.createdAt,
            status,
            currentRank: u.student?.currentRank ?? "—",
            memberNumber: u.memberNumber ?? null,
            onboardingComplete: u.student?.onboardingComplete ?? (u.roleId !== "STUDENT"),
            dojo,
        };
    });

    return <MembersAdminClient members={serialize(members) as never} />;
}
