"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_DURATION_YEARS } from "@/lib/constants";
import { getFees } from "@/lib/settings/fees";
import { notifyAdmins, notifyDojoStaff } from "@/lib/notify";
import { provisionMemberFromSupabaseUser } from "@/lib/auth/provision-member";
import { ensureRegNo } from "@/lib/members/reg-no";
import { formatDateLong } from "@/lib/format/datetime";

// Onboarding pages skip the provisioning that the portal layout normally
// performs, so the users row may not exist yet when these actions fire.
async function ensureMemberRow(user: { id: string } & Record<string, any>) {
    const existing = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true },
    });
    if (!existing) {
        await provisionMemberFromSupabaseUser(user as any);
    }
}

// ─── Step 1: Save profile ────────────────────────────────────────────────────

export async function saveProfileAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const fullName = (formData.get("fullName") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const contactEmailRaw = (formData.get("contactEmail") as string)?.trim().toLowerCase() || null;
    const dojoId = (formData.get("dojoId") as string) || null;
    const dateOfBirth = (formData.get("dateOfBirth") as string) || null;
    const genderRaw = (formData.get("gender") as string)?.trim() || null;
    const bloodGroup = (formData.get("bloodGroup") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const nationalId = (formData.get("nationalId") as string)?.trim() || null;
    const fatherName = (formData.get("fatherName") as string)?.trim() || null;
    const motherName = (formData.get("motherName") as string)?.trim() || null;
    const emergencyContactName = (formData.get("emergencyContactName") as string)?.trim() || null;
    const emergencyContactPhone = (formData.get("emergencyContactPhone") as string)?.trim() || null;

    if (!fullName) return { error: "Full name is required." };
    if (!phone) return { error: "Phone number is required." };
    if (!dojoId) return { error: "Please select a dojo." };
    if (!dateOfBirth) return { error: "Date of birth is required." };
    if (!genderRaw || (genderRaw !== "MALE" && genderRaw !== "FEMALE")) {
        return { error: "Please select your gender." };
    }
    if (!nationalId) return { error: "National ID, Passport, or Birth Certificate number is required." };
    if (!fatherName) return { error: "Father's name is required." };
    if (!motherName) return { error: "Mother's name is required." };
    if (contactEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailRaw)) {
        return { error: "Enter a valid contact email address." };
    }
    const gender = genderRaw as "MALE" | "FEMALE";

    // Guard against the "no dojos available" sentinel and any other non-UUID
    // value sneaking through — Prisma will otherwise blow up on @db.Uuid.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(dojoId)) {
        return { error: "No dojo is available yet. Please contact the admin." };
    }

    const meta = user.user_metadata ?? {};

    // The authoritative role lives on `users.role_id`. Reading from
    // `user_metadata.role` can misfire when someone started an enlist-dojo
    // signup (which stamps role=DOJO_OWNER on metadata) but never finished,
    // then reappears in the generic /portal/onboarding wizard.
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { roleId: true },
    });
    const metaRole =
        meta.role === "ADMIN" ? "ADMIN"
        : meta.role === "DOJO_OWNER" ? "DOJO_OWNER"
        : meta.role === "DOJO_MANAGER" ? "DOJO_MANAGER"
        : meta.role === "INSTRUCTOR" ? "INSTRUCTOR"
        : "STUDENT";
    const role: "ADMIN" | "DOJO_OWNER" | "DOJO_MANAGER" | "INSTRUCTOR" | "STUDENT" =
        (dbUser?.roleId as typeof metaRole | undefined) ?? metaRole;

    const studentData = {
        dojoId,
    };

    const profileData = {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        bloodGroup,
        address,
        nationalId,
        fatherName,
        motherName,
        emergencyContactName,
        emergencyContactPhone,
    };

    try {
        await prisma.user.upsert({
            where: { id: user.id },
            create: {
                id: user.id,
                email: user.email!,
                contactEmail: contactEmailRaw,
                fullName,
                phone,
                roleId: role,
            },
            update: {
                fullName,
                phone,
                roleId: role,
                ...(contactEmailRaw !== null ? { contactEmail: contactEmailRaw } : {}),
            },
        });

        await prisma.profile.upsert({
            where: { id: user.id },
            create: { id: user.id, ...profileData },
            update: profileData,
        });

        if (role === "STUDENT") {
            await prisma.student.upsert({
                where: { id: user.id },
                create: {
                    id: user.id,
                    currentRank: "White Belt",
                    requestedRank: "White Belt",
                    onboardingComplete: false,
                    membershipStatus: "PENDING",
                    joinStage: "FEE_UNPAID",
                    ...studentData,
                },
                update: studentData,
            });
        } else {
            // Non-student roles still track their dojo on the role-specific table.
            const data = { dojoId: studentData.dojoId };
            if (role === "INSTRUCTOR")  await prisma.instructor.upsert({ where: { id: user.id }, create: { id: user.id, ...data }, update: data });
            if (role === "DOJO_MANAGER") await prisma.dojoManager.upsert({ where: { id: user.id }, create: { id: user.id, ...data }, update: data });
            if (role === "DOJO_OWNER") {
                // dojo_owners.dojo_id is UNIQUE — surface a friendly error instead
                // of letting Prisma throw the constraint violation.
                const takenBy = await prisma.dojoOwner.findUnique({
                    where: { dojoId: studentData.dojoId },
                    select: { id: true },
                });
                if (takenBy && takenBy.id !== user.id) {
                    return { error: "This dojo already has an owner. Please pick a different dojo or contact the admin." };
                }
                await prisma.dojoOwner.upsert({ where: { id: user.id }, create: { id: user.id, ...data }, update: data });
            }
            if (role === "ADMIN")        await prisma.admin.upsert({ where: { id: user.id }, create: { id: user.id }, update: {} });
        }

        await ensureRegNo(user.id);

        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Failed to save profile." };
    }
}

// ─── Step 2 → 3: Create pending order with selected products ─────────────────
// Returns the order ID so the wizard can pass it to checkout.

export async function createOnboardingOrderAction(productIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        await ensureMemberRow(user);
        // Fetch selected products
        const products = productIds.length > 0
            ? await prisma.shopProduct.findMany({
                where: { id: { in: productIds }, isActive: true },
            })
            : [];

        const productTotal = products.reduce((sum, p) => sum + Number(p.price), 0);
        const { membershipFeeBDT } = await getFees();
        const membershipFee = membershipFeeBDT;
        const grandTotal = productTotal + membershipFee;

        // Delete any previous pending onboarding orders to avoid duplicates
        await prisma.shopOrder.deleteMany({
            where: {
                userId: user.id,
                paymentStatus: "PENDING",
                includesMembership: true,
            },
        });

        // Create new order
        const order = await prisma.shopOrder.create({
            data: {
                userId: user.id,
                total: grandTotal,
                membershipFee: membershipFee,
                includesMembership: true,
                paymentStatus: "PENDING",
                orderItems: productIds.length > 0
                    ? {
                        create: products.map((p) => ({
                            productId: p.id,
                            quantity: 1,
                            unitPrice: p.price,
                        })),
                    }
                    : undefined,
            },
        });

        return { success: true, orderId: order.id };
    } catch (err: any) {
        return { error: err?.message ?? "Failed to create order." };
    }
}

// ─── Existing member (created by Dojo Head): finish onboarding ──────────────
// Dojo-Head-provisioned students land on the profile step with their
// membership already active and joinStage=JOINED. After they save the
// profile, this action closes out onboarding and fires their welcome
// notification with the expiry date they should see on the dashboard.

export async function completeExistingMemberOnboardingAction() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        const student = await prisma.student.findUnique({
            where: { id: user.id },
            select: {
                onboardingComplete: true,
                joinStage: true,
                expiryDate: true,
            },
        });
        if (!student) return { error: "Student profile not found." };

        // Only welcome-notify the first time this transition happens.
        const alreadyWelcomed = student.onboardingComplete;

        if (!alreadyWelcomed) {
            await prisma.student.update({
                where: { id: user.id },
                data: { onboardingComplete: true },
            });

            const expiryLabel = student.expiryDate
                ? formatDateLong(student.expiryDate)
                : null;

            await prisma.notification.create({
                data: {
                    userId: user.id,
                    title: "Welcome to the JKA Bangladesh member portal",
                    message: expiryLabel
                        ? `Your account is ready. Your membership is active until ${expiryLabel}.`
                        : "Your account is ready. Explore your dashboard to view your rank, events, and grading history.",
                    type: "SUCCESS",
                    link: "/portal",
                },
            });
        }

        revalidatePath("/portal");
    } catch (err: any) {
        return { error: err?.message ?? "Failed to finish onboarding." };
    }

    // redirect() throws NEXT_REDIRECT — must run OUTSIDE the try/catch.
    // A server-side redirect (rather than a client-side router.push) forces
    // the shared /portal layout to re-execute; a client push would leave the
    // layout stuck on its onboarding fullscreen render and hide the sidebar.
    redirect("/portal");
}

// ─── Pay Later: Mark onboarding complete, status stays PENDING ───────────────

export async function payLaterAction(orderId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        await ensureMemberRow(user);
        await prisma.student.update({
            where: { id: user.id },
            data: {
                onboardingComplete: true,
                membershipStatus: "PENDING",
            },
        });
        const u = await prisma.user.findUnique({
            where: { id: user.id },
            select: { fullName: true },
        });
        const student = await prisma.student.findUnique({
            where: { id: user.id },
            select: { dojoId: true },
        });

        // Heads-up to admins + the student's dojo: a new member is waiting
        // to settle their membership fee.
        await notifyAdmins({
            title: "Pending membership",
            message: `${u?.fullName ?? "A new member"} completed sign-up and is waiting to pay the membership fee.`,
            type: "INFO",
            link: "/portal/admin/members",
        });
        if (student?.dojoId) {
            await notifyDojoStaff(student.dojoId, {
                title: "New member at your dojo",
                message: `${u?.fullName ?? "A new member"} has joined and is waiting to pay the membership fee.`,
                type: "INFO",
                link: "/portal/dojo/members",
            });
        }

        revalidatePath("/portal");
    } catch (err: any) {
        return { error: err?.message ?? "Failed." };
    }

    // redirect() throws NEXT_REDIRECT — must be outside try/catch.
    redirect("/portal");
}

// ─── Pay Now: Mark onboarding complete, redirect to checkout ─────────────────

export async function payNowAction(orderId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        await ensureMemberRow(user);
        await prisma.student.update({
            where: { id: user.id },
            data: { onboardingComplete: true },
        });
    } catch (err: any) {
        return { error: err?.message ?? "Failed." };
    }

    redirect(`/portal/checkout?orderId=${orderId}`);
}
