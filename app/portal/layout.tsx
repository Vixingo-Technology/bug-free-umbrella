import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { RoleId } from "@/lib/auth/load-current-user";
import { provisionMemberFromSupabaseUser } from "@/lib/auth/provision-member";
import PortalShell from "@/components/portal/portal-shell";
import { isProfileComplete } from "@/lib/profile";
import {
    featureForPath,
    type FeatureKey,
} from "@/lib/dojo/feature-locks";
import { resolveDojoFeatureLocks } from "@/lib/dojo/feature-locks.server";
import { isDojoRole } from "@/lib/dojo-roles";
import { getCurrentDojoForUser } from "@/lib/dojo-resolver";

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

// A DOJO_OWNER whose enlistment fee is still PENDING_PAYMENT can only
// reach these paths. Everything under /portal/dojo/* is bounced back to
// /portal, where the dashboard renders locked (blurred + payment CTA).
const DOJO_ACTIVATION_ALLOW = [
    "/portal",
    "/portal/notifications",
    "/portal/account",
    "/portal/profile",
];

// After the fee is PAID but before admin approval, the owner also gets
// access to the Dojo Settings page — so they can finish polishing the
// profile while JKA staff reviews the application.
const DOJO_AWAITING_APPROVAL_ALLOW = [
    ...DOJO_ACTIVATION_ALLOW,
    "/portal/dojo/settings",
];

export type DojoLockState = "UNPAID" | "AWAITING_APPROVAL" | null;

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
    let initialDojoLock: DojoLockState = null;
    let initialLockedFeatures: FeatureKey[] = [];
    let initialAvatarUrl: string | null = null;
    let initialFullName: string = "";
    let initialEmail: string = "";

    if (!isExempt) {
        let needsOnboarding = false;
        let needsJoining = false;
        let needsDojoActivation = false;
        let needsFeatureRedirect = false;

        try {
            let appUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { roleId: true, phone: true, avatarUrl: true, fullName: true, email: true },
            });

            if (!appUser) {
                await provisionMemberFromSupabaseUser(user);
                appUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { roleId: true, phone: true, avatarUrl: true, fullName: true, email: true },
                });
            }

            role = (appUser?.roleId as RoleId) ?? "STUDENT";
            initialAvatarUrl = appUser?.avatarUrl ?? null;
            initialFullName = appUser?.fullName ?? "";
            initialEmail = appUser?.email ?? "";

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
            } else if (
                role === "DOJO_OWNER" ||
                role === "DOJO_MANAGER" ||
                role === "INSTRUCTOR"
            ) {
                // Dojo activation gate.
                //   PENDING_PAYMENT → fee unpaid; whole console locked.
                //   PAID            → fee paid, awaiting JKA approval;
                //                     Dojo Settings is unlocked, rest locked.
                //   APPROVED        → fully unlocked.
                const app = await prisma.dojoApplication.findFirst({
                    where: {
                        userId: user.id,
                        status: { in: ["PENDING_PAYMENT", "PAID"] },
                    },
                    orderBy: { createdAt: "desc" },
                    select: { status: true },
                });
                if (app?.status === "PENDING_PAYMENT") {
                    initialDojoLock = "UNPAID";
                } else if (app?.status === "PAID") {
                    initialDojoLock = "AWAITING_APPROVAL";
                }

                if (initialDojoLock) {
                    const allowList =
                        initialDojoLock === "AWAITING_APPROVAL"
                            ? DOJO_AWAITING_APPROVAL_ALLOW
                            : DOJO_ACTIVATION_ALLOW;
                    const allowed = allowList.some((p) =>
                        p === "/portal"
                            ? pathname === "/portal"
                            : pathname === p || pathname.startsWith(p + "/"),
                    );
                    if (!allowed) needsDojoActivation = true;
                } else if (isDojoRole(role)) {
                    // Fully approved dojo staff — apply feature locks
                    // (milestone + admin-set) to the dojo console routes.
                    const membership = await getCurrentDojoForUser(user.id);
                    if (membership) {
                        const locks = await resolveDojoFeatureLocks(
                            membership.dojo.id,
                        );
                        initialLockedFeatures = Array.from(locks.locked);
                        const feature = featureForPath(pathname);
                        if (feature && locks.locked.has(feature)) {
                            needsFeatureRedirect = true;
                        }
                    }
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
        // Unpaid dojo owners get bounced to /portal for the same reason.
        if (needsDojoActivation) redirect("/portal");
        // Feature-locked dojo route (either milestone-locked or admin-
        // locked) — send them back to the dashboard.
        if (needsFeatureRedirect) redirect("/portal");
    } else {
        try {
            const u = await prisma.user.findUnique({
                where: { id: user.id },
                select: { roleId: true, avatarUrl: true, fullName: true, email: true },
            });
            if (u?.roleId) role = u.roleId as RoleId;
            initialAvatarUrl = u?.avatarUrl ?? null;
            initialFullName = u?.fullName ?? "";
            initialEmail = u?.email ?? "";
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
            initialDojoLock={initialDojoLock}
            initialLockedFeatures={initialLockedFeatures}
            initialAvatarUrl={initialAvatarUrl}
            initialFullName={initialFullName}
            initialEmail={initialEmail}
        >
            {children}
        </PortalShell>
    );
}
