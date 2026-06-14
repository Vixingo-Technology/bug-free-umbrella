import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import GradingClient from "@/components/portal/grading-client";

export default async function GradingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member = null;
    let gradingEvents: any[] = [];
    let myApplications: any[] = [];
    let myGradings: any[] = [];

    try {
        member = await prisma.member.findUnique({
            where: { id: user.id },
        });

        gradingEvents = await prisma.gradingEvent.findMany({
            where: {
                eventDate: { gte: new Date() },
            },
            include: { targetRank: true },
            orderBy: { eventDate: "asc" },
            take: 10,
        });

        myApplications = await prisma.gradingApplication.findMany({
            where: { memberId: user.id },
            include: { gradingEvent: true, targetRank: true },
            orderBy: { appliedAt: "desc" },
        });

        myGradings = await prisma.grading.findMany({
            where: { memberId: user.id },
            include: { fromRank: true, toRank: true, gradingEvent: true },
            orderBy: { createdAt: "desc" },
            take: 10,
        });
    } catch {
        // DB not configured
    }

    // IDs the member already applied to
    const appliedEventIds = myApplications.map((a: any) => a.gradingEventId);

    return (
        <GradingClient
            member={member}
            gradingEvents={gradingEvents}
            myApplications={myApplications}
            myGradings={myGradings}
            appliedEventIds={appliedEventIds}
            userId={user.id}
        />
    );
}
