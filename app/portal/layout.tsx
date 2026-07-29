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

// Pages a student can reach while joinStage !== JOINED. Everything else
// is redirected to /portal (the locked dashboard view — blurred content
// with a big lock overlay and a "Complete joining" CTA).
const JOINING_ALLOW = [
    "/portal",            // exact — dashboard renders in locked mode
    "/portal/joining",
    "/portal/notifications",
    "/portal/renew",
    "/portal/profile",
    "/portal/checkout",
    "/portal/payment-success",
    "/portal/payment-failed",
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

    let initialJoinStage: "FEE_UNPAID" | "AWAITING_APPROVAL" | "PAST_BELT_UNPAID" | "JOINED" | null = null;

    if (!isExempt) {
        let needsOnboarding = false;
        let needsJoining = false;

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
                    select: {
                        onboardingComplete: true,
                        dojoId: true,
                        joinStage: true,
                    },
                });
                needsOnboarding =
                    !student ||
                    !student.onboardingComplete ||
                    !isProfileComplete({
                        phone: appUser?.phone ?? null,
                        dojoId: student.dojoId,
                    });
                initialJoinStage = student?.joinStage ?? null;

                // Second gate: joining-flow. Onboarded students who haven't
                // finished the join flow are only allowed on a short whitelist
                // (Dashboard, Joining, Renew, Notifications, payment pages).
                // The dashboard itself renders locked (blurred + overlay).
                //
                // Match `/portal` exactly, and other allow-list entries by
                // exact path or subtree — so `/portal` doesn't accidentally
                // whitelist every child of it.
                if (
                    !needsOnboarding &&
                    student &&
                    student.joinStage !== "JOINED" &&
                    !JOINING_ALLOW.some((p) =>
                        p === "/portal"
                            ? pathname === "/portal"
                            : pathname === p || pathname.startsWith(p + "/"),
                    )
                ) {
                    needsJoining = true;
                }
            }
        } catch {
            // DB not configured — allow through
        }

        // redirect() throws NEXT_REDIRECT — must run OUTSIDE the try/catch
        // above, otherwise the throw is swallowed and the page renders
        // instead of redirecting.
        if (needsOnboarding) redirect("/portal/onboarding");
        // Locked students trying to reach a non-allow-listed page get
        // bounced to the dashboard, where the lock overlay lives.
        if (needsJoining) redirect("/portal");
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

    return (
        <PortalShell
            userId={user.id}
            initialRole={role}
            initialJoinStage={initialJoinStage}
        >
            {children}
        </PortalShell>
    );
}
