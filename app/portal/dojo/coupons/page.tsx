import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { serialize } from "@/lib/serialize";
import DojoCouponsClient from "@/components/dojo/coupons-client";

export const metadata = { title: "Service coupons — Dojo" };
export const dynamic = "force-dynamic";

export default async function DojoCouponsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const current = await loadCurrentUser(user.id);
    if (
        !current ||
        (current.role !== "DOJO_OWNER" && current.role !== "DOJO_MANAGER") ||
        !current.dojoId
    ) {
        redirect("/portal");
    }

    const [services, coupons] = await Promise.all([
        prisma.service.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true, slug: true, feeBDT: true },
        }),
        prisma.serviceCoupon.findMany({
            where: { dojoId: current.dojoId },
            include: { service: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900">Service coupons</h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        Issue single-use discount codes your students can redeem when requesting a service.
                        A 100% coupon covers the fee entirely and skips the payment page.
                    </p>
                </div>
                <DojoCouponsClient
                    services={services.map((s) => ({ id: s.id, name: s.name, feeBDT: Number(s.feeBDT) }))}
                    coupons={serialize(coupons) as never}
                />
            </div>
        </div>
    );
}
