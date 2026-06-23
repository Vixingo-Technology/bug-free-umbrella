import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import DojoApplicationsClient from "@/components/portal/admin/dojo-applications-client";

export const metadata: Metadata = {
    title: "Dojo applications — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminDojoApplicationsPage() {
    await requireAdmin();

    const applications = await prisma.dojoApplication.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
                <Link
                    href="/portal/admin/dojos"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-6"
                >
                    <ArrowLeft size={14} />
                    Back to dojos
                </Link>
                <DojoApplicationsClient
                    applications={serialize(applications) as never}
                />
            </div>
        </div>
    );
}
