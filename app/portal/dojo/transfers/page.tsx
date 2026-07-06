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

    const requests = await prisma.studentTransferRequest.findMany({
        where: { fromDojoId: session.dojo.id },
        include: {
            student: {
                include: {
                    user: { select: { id: true, fullName: true, avatarUrl: true } },
                },
            },
            toDojo: { select: { id: true, name: true, city: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <>
            <DojoPageHeader
                eyebrow="Dojo Head"
                title="Transfer requests"
                description="Give clearance for students who want to move to another dojo. Once you decide, the request goes to JKA admin for final approval."
            />
            <DojoTransfersClient requests={serialize(requests) as never} />
        </>
    );
}
