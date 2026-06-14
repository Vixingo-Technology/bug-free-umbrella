import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ProgressClient from "@/components/portal/progress-client";

export default async function ProgressPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member = null;
    let allBeltRanks: any[] = [];
    let gradings: any[] = [];

    try {
        member = await prisma.member.findUnique({
            where: { id: user.id },
            include: { dojo: true },
        });

        allBeltRanks = await prisma.beltRank.findMany({
            orderBy: { orderIndex: "asc" },
        });

        gradings = await prisma.grading.findMany({
            where: { memberId: user.id },
            include: { fromRank: true, toRank: true, gradingEvent: true },
            orderBy: { createdAt: "desc" },
        });
    } catch {
        // DB not configured
    }

    return (
        <ProgressClient
            member={member}
            allBeltRanks={allBeltRanks}
            gradings={gradings}
        />
    );
}
