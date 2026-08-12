import type { Metadata } from "next";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { getFees } from "@/lib/settings/fees";
import DojoJoinRequestsClient from "@/components/dojo/join-requests-client";
import { BELT_RANKS_ORDERED } from "@/lib/constants";

export const metadata: Metadata = { title: "Join Requests — Dojo" };
export const dynamic = "force-dynamic";

export default async function DojoJoinRequestsPage() {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) {
        return (
            <>
                <DojoPageHeader
                    eyebrow="Dojo Head"
                    title="Join requests"
                    description="Accept new students and confirm their rank."
                />
                <p className="text-sm text-zinc-500">
                    Your dojo isn&apos;t provisioned yet. Complete your enlistment application first.
                </p>
            </>
        );
    }

    const requests = await prisma.student.findMany({
        where: {
            dojoId: session.dojo.id,
            joinStage: "AWAITING_APPROVAL",
        },
        include: {
            user: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    contactEmail: true,
                    phone: true,
                    avatarUrl: true,
                    memberNumber: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    // Recently joined via this dojo — for a small "recently accepted" list.
    const recentlyJoined = await prisma.student.findMany({
        where: {
            dojoId: session.dojo.id,
            joinStage: "JOINED",
        },
        include: {
            user: {
                select: { id: true, fullName: true, avatarUrl: true },
            },
        },
        orderBy: { joinedAt: "desc" },
        take: 5,
    });

    const { pastBeltFeePerRankBDT } = await getFees();

    return (
        <>
            <DojoPageHeader
                eyebrow="Dojo Head"
                title="Join requests"
                description="Confirm each new student's rank so they can complete the joining flow."
            />
            <DojoJoinRequestsClient
                requests={serialize(requests) as never}
                recentlyJoined={serialize(recentlyJoined) as never}
                ranks={[...BELT_RANKS_ORDERED]}
                pastBeltFeePerRankBDT={pastBeltFeePerRankBDT}
            />
        </>
    );
}
