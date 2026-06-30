import { prisma } from "@/lib/prisma";
import type { Prisma, NotificationType } from "@/prisma/generated/client";

export type NotifyPayload = {
    title: string;
    message: string;
    type: NotificationType;
    link?: string | null;
};

type TxLike = Prisma.TransactionClient | typeof prisma;

/**
 * Insert one notification row per recipient. Silently skips empty lists so
 * callers don't need to guard. Designed to be called inside a $transaction
 * via the `tx` parameter, or stand-alone with the default prisma client.
 */
export async function notifyMembers(
    memberIds: string[],
    payload: NotifyPayload,
    tx: TxLike = prisma
): Promise<void> {
    const unique = Array.from(new Set(memberIds.filter(Boolean)));
    if (unique.length === 0) return;
    await tx.notification.createMany({
        data: unique.map((memberId) => ({
            memberId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            link: payload.link ?? null,
        })),
    });
}

/**
 * Fan out to every ADMIN account. Use for events the back-office cares
 * about: new dojo applications, paid orders, etc.
 */
export async function notifyAdmins(
    payload: NotifyPayload,
    tx: TxLike = prisma
): Promise<void> {
    const admins = await tx.member.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
    });
    await notifyMembers(admins.map((m) => m.id), payload, tx);
}

/**
 * Fan out to a single dojo's staff (Instructor / Manager / Owner).
 * Use for events tied to a specific dojo — belt-test requests, new
 * enlistments, etc.
 */
export async function notifyDojoStaff(
    dojoId: string,
    payload: NotifyPayload,
    tx: TxLike = prisma,
    opts: { minRank?: "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" } = {}
): Promise<void> {
    if (!dojoId) return;
    const min = opts.minRank ?? "INSTRUCTOR";
    const allowed =
        min === "DOJO_OWNER"
            ? (["DOJO_OWNER"] as const)
            : min === "DOJO_MANAGER"
              ? (["DOJO_MANAGER", "DOJO_OWNER"] as const)
              : (["INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER"] as const);

    const staff = await tx.member.findMany({
        where: {
            dojoId,
            role: { in: allowed as unknown as Array<"INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER"> },
            isActive: true,
        },
        select: { id: true },
    });
    await notifyMembers(staff.map((m) => m.id), payload, tx);
}
