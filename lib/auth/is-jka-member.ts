import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * A "JKA member" for pricing purposes is any signed-in user affiliated with
 * the federation:
 *   - Student with an ACTIVE membership
 *   - Instructor, Dojo Manager, or Dojo Owner (staff always qualify)
 * PENDING/EXPIRED students and plain accounts do not qualify.
 */
export async function isJkaMember(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roleId: true },
    });
    if (!user) return false;

    if (
        user.roleId === "INSTRUCTOR" ||
        user.roleId === "DOJO_MANAGER" ||
        user.roleId === "DOJO_OWNER"
    ) {
        return true;
    }
    if (user.roleId === "STUDENT") {
        const student = await prisma.student.findUnique({
            where: { id: userId },
            select: { membershipStatus: true },
        });
        return student?.membershipStatus === "ACTIVE";
    }
    return false;
}

/**
 * Read the current auth cookies and return whether the caller is a JKA
 * member. Returns false for guests and non-student roles.
 */
export async function currentUserIsJkaMember(): Promise<boolean> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    return isJkaMember(user.id);
}

/**
 * Apply a discount to a base price. Rounds to two decimals so we never emit
 * fractions the payment gateway would reject.
 */
export function applyDiscount(basePrice: number, percent: number): number {
    if (!Number.isFinite(basePrice) || basePrice <= 0) return basePrice;
    if (!Number.isFinite(percent) || percent <= 0) return basePrice;
    const p = Math.max(0, Math.min(100, Math.floor(percent)));
    const discounted = basePrice * (1 - p / 100);
    return Math.round(discounted * 100) / 100;
}
