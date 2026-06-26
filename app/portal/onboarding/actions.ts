"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE_BDT, MEMBERSHIP_DURATION_YEARS } from "@/lib/constants";

// ─── Step 1: Save profile ────────────────────────────────────────────────────

export async function saveProfileAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const fullName = (formData.get("fullName") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const dojoId = (formData.get("dojoId") as string) || null;
    const dateOfBirth = (formData.get("dateOfBirth") as string) || null;
    const bloodGroup = (formData.get("bloodGroup") as string) || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const nationalId = (formData.get("nationalId") as string)?.trim() || null;
    const fatherName = (formData.get("fatherName") as string)?.trim() || null;
    const motherName = (formData.get("motherName") as string)?.trim() || null;
    const emergencyContactName = (formData.get("emergencyContactName") as string)?.trim() || null;
    const emergencyContactPhone = (formData.get("emergencyContactPhone") as string)?.trim() || null;

    if (!fullName) return { error: "Full name is required." };
    if (!phone) return { error: "Phone number is required." };
    if (!dojoId) return { error: "Please select a dojo." };

    // Guard against the "no dojos available" sentinel and any other non-UUID
    // value sneaking through — Prisma will otherwise blow up on @db.Uuid.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(dojoId)) {
        return { error: "No dojo is available yet. Please contact the admin." };
    }

    try {
        await prisma.member.update({
            where: { id: user.id },
            data: {
                fullName,
                phone,
                dojoId,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                bloodGroup,
                address,
                nationalId,
                fatherName,
                motherName,
                emergencyContactName,
                emergencyContactPhone,
            },
        });

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
        // Fetch selected products
        const products = productIds.length > 0
            ? await prisma.shopProduct.findMany({
                where: { id: { in: productIds }, isActive: true },
            })
            : [];

        const productTotal = products.reduce((sum, p) => sum + Number(p.price), 0);
        const membershipFee = MEMBERSHIP_FEE_BDT;
        const grandTotal = productTotal + membershipFee;

        // Delete any previous pending onboarding orders to avoid duplicates
        await prisma.shopOrder.deleteMany({
            where: {
                memberId: user.id,
                paymentStatus: "PENDING",
                includesMembership: true,
            },
        });

        // Create new order
        const order = await prisma.shopOrder.create({
            data: {
                memberId: user.id,
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

// ─── Pay Later: Mark onboarding complete, status stays PENDING ───────────────

export async function payLaterAction(orderId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        await prisma.member.update({
            where: { id: user.id },
            data: {
                onboardingComplete: true,
                membershipStatus: "PENDING",
            },
        });

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
        await prisma.member.update({
            where: { id: user.id },
            data: { onboardingComplete: true },
        });
    } catch (err: any) {
        return { error: err?.message ?? "Failed." };
    }

    redirect(`/portal/checkout?orderId=${orderId}`);
}
