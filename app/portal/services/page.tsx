import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightLeft, Award, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TRANSFER_REQUEST_FEE_BDT } from "@/lib/constants";

export const metadata = { title: "Request a service — JKA Bangladesh" };

const TRANSFER_SLUG = "transfer-dojo";
const TRANSFER_DEFAULTS = {
    name: "Transfer Dojo",
    description:
        "Move your JKA membership from your current dojo to another. Requires clearance from your current dojo and JKA HQ approval.",
};

function iconFor(slug: string) {
    if (slug === "kyu-dan-conversion") return Award;
    if (slug === TRANSFER_SLUG) return ArrowRightLeft;
    return Award;
}

function hrefFor(slug: string) {
    if (slug === TRANSFER_SLUG) return "/portal/transfer";
    return `/portal/services/${slug}`;
}

export default async function ServicesHubPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Ensure the default Transfer Dojo service row exists so it's always
    // editable from the admin services page and selectable as the target
    // service when a dojo owner issues a coupon.
    await prisma.service.upsert({
        where: { slug: TRANSFER_SLUG },
        update: {},
        create: {
            slug: TRANSFER_SLUG,
            name: TRANSFER_DEFAULTS.name,
            description: TRANSFER_DEFAULTS.description,
            feeBDT: TRANSFER_REQUEST_FEE_BDT,
            handler: TRANSFER_SLUG,
        },
    });

    const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
    });

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                    Request a <span className="text-accent-red">service</span>
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    All service requests are reviewed by your dojo first, then approved by JKA HQ.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {services.map((s) => {
                    const Icon = iconFor(s.slug);
                    return (
                        <ServiceCard
                            key={s.id}
                            href={hrefFor(s.slug)}
                            name={s.name}
                            description={s.description ?? ""}
                            fee={Number(s.feeBDT)}
                            Icon={Icon}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function ServiceCard({
    href,
    name,
    description,
    fee,
    Icon,
}: {
    href: string;
    name: string;
    description: string;
    fee: number;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
    return (
        <Link
            href={href}
            className="group block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-accent-red/40 hover:shadow-md transition"
        >
            <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/10 text-accent-red">
                    <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-bold text-zinc-900 group-hover:text-accent-red transition-colors">
                            {name}
                        </h2>
                        <ChevronRight size={18} className="text-zinc-400 group-hover:text-accent-red transition-colors mt-0.5" />
                    </div>
                    {description && (
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-3">
                            {description}
                        </p>
                    )}
                    <p className="mt-3 text-sm font-semibold text-zinc-900">
                        {fee > 0 ? `৳${fee.toLocaleString()}` : "Free"}
                    </p>
                </div>
            </div>
        </Link>
    );
}
