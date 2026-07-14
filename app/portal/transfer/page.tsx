import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { getFees } from "@/lib/settings/fees";
import TransferClient from "@/components/portal/transfer-client";

export const metadata = { title: "Transfer Dojo — JKA Bangladesh" };

const OPEN_STATUSES = ["PENDING_PAYMENT", "AWAITING_DOJO", "AWAITING_ADMIN"] as const;

export default async function TransferPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Sweep stale PENDING_PAYMENT rows (>30m) so the "one open at a time" guard
    // never gets stuck when a student abandons checkout.
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.studentTransferRequest.updateMany({
        where: { studentId: user.id, status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
        data: { status: "CANCELLED" },
    });

    const student = await prisma.student.findUnique({
        where: { id: user.id },
        include: {
            dojo: { select: { id: true, name: true } },
            user: { select: { fullName: true } },
        },
    });

    if (!student) redirect("/portal");

    const activeRequest = await prisma.studentTransferRequest.findFirst({
        where: { studentId: user.id, status: { in: [...OPEN_STATUSES] } },
        include: {
            fromDojo: { select: { id: true, name: true } },
            toDojo:   { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const history = await prisma.studentTransferRequest.findMany({
        where: { studentId: user.id, status: { in: ["APPROVED", "DENIED", "CANCELLED"] } },
        include: {
            fromDojo: { select: { id: true, name: true } },
            toDojo:   { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
    });

    // Only offer transfer if the student has a current dojo & active membership.
    const canRequest =
        !activeRequest &&
        !!student.dojoId &&
        student.membershipStatus === "ACTIVE";

    const availableDojos = canRequest
        ? await prisma.dojo.findMany({
              where: { isActive: true, id: { not: student.dojoId! } },
              select: { id: true, name: true, city: true },
              orderBy: { name: "asc" },
          })
        : [];

    const { transferFeeBDT } = await getFees();

    return (
        <TransferClient
            fee={transferFeeBDT}
            student={{
                fullName: student.user.fullName,
                membershipStatus: student.membershipStatus,
                currentDojo: student.dojo ? { id: student.dojo.id, name: student.dojo.name } : null,
            }}
            activeRequest={serialize(activeRequest) as never}
            history={serialize(history) as never}
            availableDojos={availableDojos}
            canRequest={canRequest}
        />
    );
}
