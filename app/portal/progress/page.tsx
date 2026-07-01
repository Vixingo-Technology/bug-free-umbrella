import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import ProgressClient from "@/components/portal/progress-client";

export default async function ProgressPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member = null;
    let allBeltRanks: any[] = [];
    let gradings: any[] = [];

    try {
        const student = await prisma.student.findUnique({
            where: { id: user.id },
            include: { dojo: true, user: true },
        });
        if (student) {
            member = {
                ...student,
                fullName: student.user.fullName,
                email: student.user.email,
                phone: student.user.phone,
                avatarUrl: student.user.avatarUrl,
                role: student.user.roleId,
            };
        }

        allBeltRanks = await prisma.beltRank.findMany({
            orderBy: { orderIndex: "asc" },
        });

        gradings = await prisma.grading.findMany({
            where: { studentId: user.id },
            include: { fromRank: true, toRank: true, gradingEvent: true },
            orderBy: { createdAt: "desc" },
        });
    } catch {
        // DB not configured
    }

    return (
        <ProgressClient
            member={serialize(member)}
            allBeltRanks={serialize(allBeltRanks)}
            gradings={serialize(gradings)}
        />
    );
}
