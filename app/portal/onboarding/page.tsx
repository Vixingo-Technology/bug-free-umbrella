import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import OnboardingWizard from "@/components/portal/onboarding/onboarding-wizard";
import { isProfileComplete } from "@/lib/profile";

export const metadata = {
    title: "Welcome to JKA Bangladesh",
};

/** Fields the member is still missing, for contextual wizard hints. */
function getMissingFields(member: any): string[] {
    const missing: string[] = [];
    if (!member?.phone?.trim())  missing.push("Phone number");
    if (!member?.dojoId?.trim()) missing.push("Dojo");
    return missing;
}

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member = null;
    let dojos: any[] = [];
    let products: any[] = [];
    let alreadyComplete = false;

    try {
        member = await prisma.member.findUnique({ where: { id: user.id } });

        // Only skip onboarding when BOTH conditions are satisfied.
        // If profile is incomplete, let the wizard handle it even for returning users.
        alreadyComplete = !!(member?.onboardingComplete && isProfileComplete(member));

        if (!alreadyComplete) {
            dojos = await prisma.dojo.findMany({
                where: { isActive: true },
                orderBy: { name: "asc" },
                select: { id: true, name: true, city: true },
            });

            // Only load products for first-time flow (not profile-update mode).
            if (!member?.onboardingComplete) {
                products = await prisma.shopProduct.findMany({
                    where: { isActive: true },
                    orderBy: { category: "asc" },
                });
            }
        }
    } catch {
        // DB not ready — still render (wizard handles gracefully)
    }

    // redirect() throws NEXT_REDIRECT — must run outside the try/catch.
    if (alreadyComplete) redirect("/portal");

    // Profile-update mode: returning user with missing required fields.
    const isProfileUpdateMode = !!(member?.onboardingComplete && !isProfileComplete(member));
    const missingFields = getMissingFields(member);

    return (
        <OnboardingWizard
            userId={user.id}
            member={serialize(member)}
            dojos={dojos}
            products={serialize(products)}
            isProfileUpdateMode={isProfileUpdateMode}
            missingFields={missingFields}
        />
    );
}
