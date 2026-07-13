import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import ActivityClient from "./activity-client";

export const metadata: Metadata = {
    title: "Activity Monitor — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
    await requireAdmin();

    const rows = await prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
            actor: { select: { fullName: true, email: true, roleId: true } },
        },
    });

    const initial = rows.map((r) => ({
        id: r.id,
        action: r.action,
        message: r.message,
        severity: r.severity,
        actor_id: r.actorId,
        actor_label: r.actorLabel ?? r.actor?.fullName ?? r.actor?.email ?? null,
        actor_role: r.actorRole ?? r.actor?.roleId ?? null,
        resource: r.resource,
        resource_id: r.resourceId,
        ip: r.ip ?? null,
        user_agent: r.userAgent ?? null,
        metadata: (r.metadata ?? {}) as Record<string, unknown>,
        created_at: r.createdAt.toISOString(),
    }));

    return (
        <main className="max-w-6xl mx-auto p-6 md:p-8">
            <div className="mb-6">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                    Admin
                </p>
                <h1 className="font-serif text-2xl font-bold text-zinc-900">
                    Activity Monitor
                </h1>
                <p className="text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                    Real-time feed of every action across the system — auth,
                    admin changes, payments, and errors. Warnings and worse
                    also fan out as notifications to every admin.
                </p>
            </div>
            <ActivityClient initial={initial} />
        </main>
    );
}
