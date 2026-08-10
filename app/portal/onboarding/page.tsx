import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import OnboardingWizard from "@/components/portal/onboarding/onboarding-wizard";
import { isProfileComplete } from "@/lib/profile";
import { getFees } from "@/lib/settings/fees";
import type { JoinStage } from "@/prisma/generated/client";

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
    let alreadyComplete = false;

    let joinStage: JoinStage | null = null;
    try {
        const u = await prisma.user.findUnique({
            where: { id: user.id },
            include: { student: true, profile: true },
        });
        if (u) {
            joinStage = u.student?.joinStage ?? null;
            member = {
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                phone: u.phone,
                avatarUrl: u.avatarUrl,
                role: u.roleId,
                memberNumber: u.memberNumber,
                onboardingComplete: u.student?.onboardingComplete ?? false,
                dojoId: u.student?.dojoId ?? null,
                dateOfBirth: u.profile?.dateOfBirth ?? null,
                bloodGroup: u.profile?.bloodGroup ?? null,
                address: u.profile?.address ?? null,
                nationalId: u.profile?.nationalId ?? null,
                fatherName: u.profile?.fatherName ?? null,
                motherName: u.profile?.motherName ?? null,
                emergencyContactName: u.profile?.emergencyContactName ?? null,
                emergencyContactPhone: u.profile?.emergencyContactPhone ?? null,
            };
        }

        alreadyComplete = !!(member?.onboardingComplete && isProfileComplete({
            phone: member?.phone ?? null,
            dojoId: member?.dojoId ?? null,
        }));

        if (!alreadyComplete) {
            dojos = await prisma.dojo.findMany({
                where: { isActive: true },
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    city: true,
                    address: true,
                    latitude: true,
                    longitude: true,
                },
            });
        }
    } catch {
        // DB not ready — still render (wizard handles gracefully)
    }

    // redirect() throws NEXT_REDIRECT — must run outside the try/catch.
    if (alreadyComplete) redirect("/portal");

    // Profile-update mode: returning user with missing required fields.
    const isProfileUpdateMode = !!(member?.onboardingComplete && !isProfileComplete({
        phone: member?.phone ?? null,
        dojoId: member?.dojoId ?? null,
    }));
    // Existing-member mode: student provisioned directly by a Dojo Head
    // (joinStage=JOINED, onboardingComplete=false). Their membership is
    // already active — they only need to complete their profile.
    const isExistingMemberMode = !!(
        member && !member.onboardingComplete && joinStage === "JOINED"
    );
    const missingFields = getMissingFields(member);

    const { membershipFeeBDT } = await getFees();

    return (
        <OnboardingWizard
            userId={user.id}
            member={serialize(member)}
            dojos={dojos}
            isProfileUpdateMode={isProfileUpdateMode}
            isExistingMemberMode={isExistingMemberMode}
            missingFields={missingFields}
            membershipFeeBDT={membershipFeeBDT}
        />
    );
}
