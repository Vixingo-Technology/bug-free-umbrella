import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import SubscriptionsClient from "./subscriptions-client";

export const metadata: Metadata = {
    title: "Subscriptions — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
    await requireAdmin();

    const row = await prisma.systemSettings.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default" },
        select: {
            dojoEnlistmentFeeBDT: true,
            dojoRenewalFeeBDT: true,
            membershipFeeBDT: true,
        },
    });

    return (
        <main className="max-w-3xl mx-auto p-6 md:p-8">
            <div className="mb-6">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                    Admin
                </p>
                <h1 className="font-serif text-2xl font-bold text-zinc-900">
                    Subscriptions
                </h1>
                <p className="text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                    Set the fees the platform charges dojos and members. Blank
                    values inherit the built-in defaults.
                </p>
            </div>

            <SubscriptionsClient
                stored={{
                    dojoEnlistmentFeeBDT:
                        row.dojoEnlistmentFeeBDT != null
                            ? Number(row.dojoEnlistmentFeeBDT)
                            : null,
                    dojoRenewalFeeBDT:
                        row.dojoRenewalFeeBDT != null
                            ? Number(row.dojoRenewalFeeBDT)
                            : null,
                    membershipFeeBDT:
                        row.membershipFeeBDT != null
                            ? Number(row.membershipFeeBDT)
                            : null,
                }}
            />
        </main>
    );
}
