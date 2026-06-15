import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import PortalShell from "@/components/portal/portal-shell";
import { isProfileComplete } from "@/lib/profile";

export const metadata: Metadata = {
    title: "Member Portal — JKA Bangladesh",
    description: "Your personal JKA Bangladesh member portal.",
};

// These paths skip the onboarding redirect check (user is mid-flow)
const ONBOARDING_EXEMPT = [
    "/portal/onboarding",
    "/portal/checkout",
    "/portal/payment-success",
    "/portal/renew",
];

// These paths render fullscreen (no sidebar shell)
const FULLSCREEN_PATHS = [
    "/portal/onboarding",
    "/portal/checkout",
    "/portal/payment-success",
];

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Read pathname injected by Supabase SSR middleware
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";

    const isExempt = ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p));

    if (!isExempt) {
        let needsOnboarding = false;

        try {
            let member = await prisma.member.findUnique({
                where: { id: user.id },
                select: { onboardingComplete: true, phone: true, dojoId: true },
            });

            // Safety net: create the member row if it doesn't exist yet
            // (e.g. DB trigger not applied, or race condition on first login)
            if (!member) {
                const meta = user.user_metadata ?? {};
                const fullName: string =
                    meta.full_name ??
                    [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
                    user.email!;

                member = await prisma.member.upsert({
                    where: { id: user.id },
                    create: {
                        id: user.id,
                        email: user.email!,
                        fullName,
                        currentRank: meta.current_rank ?? "White Belt",
                        role: "STUDENT",
                        onboardingComplete: false,
                        membershipStatus: "PENDING",
                    },
                    update: {},
                    select: { onboardingComplete: true, phone: true, dojoId: true },
                });
            }

            needsOnboarding = !member.onboardingComplete || !isProfileComplete(member);
        } catch {
            // DB not configured — allow through
        }

        // redirect() must run OUTSIDE the try/catch — it throws NEXT_REDIRECT
        // which the framework needs to catch.
        if (needsOnboarding) redirect("/portal/onboarding");
    }

    // Onboarding / checkout / success → fullscreen, no sidebar shell
    if (FULLSCREEN_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;

    return <PortalShell userId={user.id}>{children}</PortalShell>;
}
