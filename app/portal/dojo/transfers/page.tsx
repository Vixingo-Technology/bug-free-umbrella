import type { Metadata } from "next";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import DojoTransfersClient from "@/components/dojo/transfers-client";

export const metadata: Metadata = { title: "Transfer Requests — Dojo" };

export const dynamic = "force-dynamic";

export default async function DojoTransfersPage() {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) {
        return (
            <>
                <DojoPageHeader
                    eyebrow="Dojo Head"
                    title="Transfer requests"
                    description="Approve or reject student transfer requests. Your dojo must be provisioned before any transfer flow reaches you."
                />
                <p className="text-sm text-zinc-500">
                    Your dojo isn't provisioned yet. Complete your enlistment application first.
                </p>
            </>
        );
    }

    const [outgoing, incoming, beltRanks] = await Promise.all([
        prisma.studentTransferRequest.findMany({
            where: { fromDojoId: session.dojo.id },
            include: {
                student: {
                    include: {
                        user: { select: { id: true, fullName: true, avatarUrl: true } },
                    },
                },
                toDojo: { select: { id: true, name: true, city: true } },
                fromDojo: { select: { id: true, name: true, city: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.studentTransferRequest.findMany({
            where: { toDojoId: session.dojo.id, status: { in: ["AWAITING_NEW_DOJO", "APPROVED"] } },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phone: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                toDojo: { select: { id: true, name: true, city: true } },
                fromDojo: { select: { id: true, name: true, city: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.beltRank.findMany({
            select: { id: true, name: true, orderIndex: true },
            orderBy: { orderIndex: "asc" },
        }),
    ]);

    return (
        <>
            <DojoPageHeader
                eyebrow="Dojo Head"
                title="Transfer requests"
                description="Give clearance for students moving out. When JKA admin approves an incoming transfer, review the student and accept them into your dojo."
            />
            <DojoTransfersClient
                requests={serialize(outgoing) as never}
                incoming={serialize(incoming) as never}
                beltRanks={beltRanks}
            />
        </>
    );
}
