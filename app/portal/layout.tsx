import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { RoleId } from "@/lib/auth/load-current-user";
import { provisionMemberFromSupabaseUser } from "@/lib/auth/provision-member";
import PortalShell from "@/components/portal/portal-shell";
import { isProfileComplete } from "@/lib/profile";

export const metadata: Metadata = {
    title: "Member Portal — JKA Bangladesh",
    description: "Your personal JKA Bangladesh member portal.",
};

const ONBOARDING_EXEMPT = [
    "/portal/onboarding",
    "/portal/checkout",
    "/portal/payment-success",
    "/portal/renew",
];

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

    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";
    const isPostPaymentLanding =
        headersList.get("x-post-payment-landing") === "1";

    if (!user && !isPostPaymentLanding) redirect("/login");

    // Unauthenticated post-payment visitor — skip role/onboarding checks
    // and let the page render its own popup + shell-less body.
    if (!user) return <>{children}</>;

    const isExempt = ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p));

    let role: RoleId = "STUDENT";

    if (!isExempt) {
        let needsOnboarding = false;

        try {
            let appUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { roleId: true, phone: true },
            });

            if (!appUser) {
                await provisionMemberFromSupabaseUser(user);
                appUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { roleId: true, phone: true },
                });
            }

            role = (appUser?.roleId as RoleId) ?? "STUDENT";

            if (role === "STUDENT") {
                const student = await prisma.student.findUnique({
                    where: { id: user.id },
                    select: { onboardingComplete: true, dojoId: true },
                });
                needsOnboarding =
                    !student ||
                    !student.onboardingComplete ||
                    !isProfileComplete({
                        phone: appUser?.phone ?? null,
                        dojoId: student.dojoId,
                    });
            }
        } catch {
            // DB not configured — allow through
        }

        if (needsOnboarding) redirect("/portal/onboarding");
    } else {
        try {
            const u = await prisma.user.findUnique({
                where: { id: user.id },
                select: { roleId: true },
            });
            if (u?.roleId) role = u.roleId as RoleId;
        } catch {
            // ignore
        }
    }

    if (FULLSCREEN_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;

    return <PortalShell userId={user.id} initialRole={role}>{children}</PortalShell>;
}
