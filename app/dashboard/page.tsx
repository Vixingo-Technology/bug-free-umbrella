import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import StudentDashboard from "@/components/dashboard/student-dashboard";
import InstructorDashboard from "@/components/dashboard/instructor-dashboard";
import AdminDashboard from "@/components/dashboard/admin-dashboard";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch member profile with related data
    let member;
    try {
        member = await prisma.member.findUnique({
            where: { id: user.id },
            include: {
                dojo: true,
                gradings: {
                    include: {
                        fromRank: true,
                        toRank: true,
                    },
                    orderBy: { id: "desc" },
                },
                orders: {
                    orderBy: { id: "desc" },
                    take: 10,
                },
            },
        });
    } catch {
        // Database might not be configured yet — render fallback
        member = null;
    }

    // Fallback if member profile doesn't exist yet (e.g. trigger hasn't run or DB not connected)
    const role = member?.role ?? "STUDENT";
    const displayName = member?.fullName ?? user.user_metadata?.full_name ?? user.email ?? "Member";
    const email = member?.email ?? user.email ?? "";

    // Fetch role-specific data
    let roleData: Record<string, unknown> = {};

    try {
        if (role === "INSTRUCTOR" && member) {
            const dojoMembers = await prisma.member.findMany({
                where: { dojoId: member.dojoId ?? undefined },
                take: 50,
            });
            const dojoGradings = await prisma.grading.findMany({
                where: {
                    memberId: { in: dojoMembers.map((m) => m.id) },
                },
                include: {
                    member: true,
                    fromRank: true,
                    toRank: true,
                },
                orderBy: { id: "desc" },
                take: 20,
            });
            roleData = { dojoMembers, dojoGradings };
        }

        if (role === "ADMIN") {
            const totalMembers = await prisma.member.count();
            const totalDojos = await prisma.dojo.count();
            const totalOrders = await prisma.shopOrder.count();
            const recentMembers = await prisma.member.findMany({
                orderBy: { id: "desc" },
                take: 10,
                include: { dojo: true },
            });
            const allDojosRaw = await prisma.dojo.findMany({
                include: {
                    _count: { select: { members: true } },
                    members: {
                        where: { role: "DOJO_OWNER" },
                        select: { id: true, fullName: true, email: true },
                        take: 1,
                    },
                },
            });
            const allDojos = allDojosRaw.map((d) => ({
                ...d,
                headInstructor: d.members[0] ?? null,
            }));
            roleData = { totalMembers, totalDojos, totalOrders, recentMembers, allDojos };
        }
    } catch {
        // DB queries might fail if not configured
    }

    return (
        <DashboardShell displayName={displayName} email={email} role={role}>
            {role === "ADMIN" ? (
                <AdminDashboard
                    member={serialize(member)}
                    totalMembers={(roleData.totalMembers as number) ?? 0}
                    totalDojos={(roleData.totalDojos as number) ?? 0}
                    totalOrders={(roleData.totalOrders as number) ?? 0}
                    recentMembers={serialize((roleData.recentMembers as any[]) ?? [])}
                    allDojos={serialize((roleData.allDojos as any[]) ?? [])}
                />
            ) : role === "INSTRUCTOR" ? (
                <InstructorDashboard
                    member={serialize(member)}
                    dojoMembers={serialize((roleData.dojoMembers as any[]) ?? [])}
                    dojoGradings={serialize((roleData.dojoGradings as any[]) ?? [])}
                />
            ) : (
                <StudentDashboard member={serialize(member)} />
            )}
        </DashboardShell>
    );
}
