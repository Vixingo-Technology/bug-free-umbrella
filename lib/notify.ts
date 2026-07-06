import { prisma } from "@/lib/prisma";
import type { Prisma, NotificationType } from "@/prisma/generated/client";
import { findUserIdsByRoles } from "@/lib/notify/recipients";
import { sendPushToUsers } from "@/lib/push/server";

export type NotifyPayload = {
    title: string;
    message: string;
    type: NotificationType;
    link?: string | null;
};

type TxLike = Prisma.TransactionClient | typeof prisma;

// When a caller passes a transaction client we can't safely fire push
// yet — the surrounding tx might still roll back. Defer the fan-out
// to after commit by returning an "after" callback the caller can await.
// For the common no-tx case we just await inside notifyMembers.
function isTx(client: TxLike): client is Prisma.TransactionClient {
    return client !== prisma;
}

async function pushAfterInsert(userIds: string[], payload: NotifyPayload): Promise<void> {
    // Non-fatal: caller's DB work has already committed.
    try {
        await sendPushToUsers(userIds, {
            title: payload.title,
            body: payload.message,
            link: payload.link ?? null,
            type: payload.type,
        });
    } catch (err) {
        console.warn("[notify] push fan-out failed", err);
    }
}

/**
 * Insert one notification row per recipient. Silently skips empty lists so
 * callers don't need to guard. Designed to be called inside a $transaction
 * via the `tx` parameter, or stand-alone with the default prisma client.
 *
 * Web push fan-out fires automatically for the non-tx path. When called
 * inside a caller-owned transaction, push is deferred: await the returned
 * `flushPush` **after** the transaction commits, or ignore it.
 */
export async function notifyMembers(
    userIds: string[],
    payload: NotifyPayload,
    tx: TxLike = prisma
): Promise<{ flushPush: () => Promise<void> }> {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    if (unique.length === 0) return { flushPush: async () => {} };
    await tx.notification.createMany({
        data: unique.map((userId) => ({
            userId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            link: payload.link ?? null,
        })),
    });

    if (isTx(tx)) {
        // Caller controls when to flush.
        return { flushPush: () => pushAfterInsert(unique, payload) };
    }
    await pushAfterInsert(unique, payload);
    return { flushPush: async () => {} };
}

/**
 * Fan out to every ADMIN account. Use for events the back-office cares
 * about: new dojo applications, paid orders, etc.
 */
export async function notifyAdmins(
    payload: NotifyPayload,
    tx: TxLike = prisma
): Promise<{ flushPush: () => Promise<void> }> {
    const ids = await findUserIdsByRoles(["ADMIN"]);
    return notifyMembers(ids, payload, tx);
}

/**
 * Fan out to a single dojo's staff (Instructor / Manager / Owner).
 */
export async function notifyDojoStaff(
    dojoId: string,
    payload: NotifyPayload,
    tx: TxLike = prisma,
    opts: { minRank?: "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" } = {}
): Promise<{ flushPush: () => Promise<void> }> {
    if (!dojoId) return { flushPush: async () => {} };
    const min = opts.minRank ?? "INSTRUCTOR";
    const allowed =
        min === "DOJO_OWNER"
            ? (["DOJO_OWNER"] as const)
            : min === "DOJO_MANAGER"
              ? (["DOJO_MANAGER", "DOJO_OWNER"] as const)
              : (["INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER"] as const);

    const ids = await findUserIdsByRoles([...allowed], { dojoId });
    return notifyMembers(ids, payload, tx);
}
