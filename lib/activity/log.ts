import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { findUserIdsByRoles } from "@/lib/notify/recipients";
import type { ActivitySeverity } from "@/prisma/generated/client";

/**
 * System-wide activity logger. Every meaningful action (auth, admin CRUD,
 * payment webhook, role change) should call `logActivity` so the admin
 * real-time monitor picks it up. WARNING / ERROR / CRITICAL rows also
 * fan out as in-app notifications to every ADMIN so anomalies are surfaced
 * even if no one is watching the sidebar.
 *
 * Fail-safe: this helper never throws. Instrumentation must not break the
 * hosting request path.
 */

export type ActivityInput = {
    action: string;                      // dot.notation: "auth.signout", "admin.member.delete"
    message: string;                     // human-readable, shown in the monitor
    severity?: ActivitySeverity;         // defaults to INFO
    actorId?: string | null;
    actorLabel?: string | null;          // pre-computed name/email to avoid a join at read time
    actorRole?: string | null;
    resource?: string | null;            // "member" | "dojo" | "order" | ...
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
};

const ANOMALY: ActivitySeverity[] = ["ERROR", "CRITICAL"];

export async function logActivity(input: ActivityInput): Promise<void> {
    try {
        const { ip, userAgent } = await readRequestContext();

        const row = await prisma.activityLog.create({
            data: {
                action: input.action,
                message: input.message,
                severity: input.severity ?? "INFO",
                actorId: input.actorId ?? null,
                actorLabel: input.actorLabel ?? null,
                actorRole: input.actorRole ?? null,
                resource: input.resource ?? null,
                resourceId: input.resourceId ?? null,
                ip: ip ?? undefined,
                userAgent: userAgent ?? undefined,
                metadata: (input.metadata ?? {}) as never,
            },
            select: { id: true, severity: true, action: true, message: true },
        });

        if (ANOMALY.includes(row.severity)) {
            await fanoutAnomalyNotification(row.severity, row.action, row.message);
        }
    } catch (err) {
        // Never let logging break the hosting request. Surface in server logs only.
        console.error("[activity] logActivity failed", err);
    }
}

async function readRequestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
    try {
        const h = await headers();
        const fwd = h.get("x-forwarded-for");
        const ip = fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
        const userAgent = h.get("user-agent");
        return { ip, userAgent };
    } catch {
        return { ip: null, userAgent: null };
    }
}

async function fanoutAnomalyNotification(
    severity: ActivitySeverity,
    action: string,
    message: string,
): Promise<void> {
    try {
        const adminIds = await findUserIdsByRoles(["ADMIN"]);
        if (adminIds.length === 0) return;

        const title = severity === "CRITICAL"
            ? "Critical system event"
            : "System warning";

        await prisma.notification.createMany({
            data: adminIds.map((userId) => ({
                userId,
                title,
                message: `[${action}] ${message}`,
                type: "WARNING" as const,
                link: "/portal/admin/activity",
            })),
        });
    } catch (err) {
        console.error("[activity] anomaly fan-out failed", err);
    }
}
