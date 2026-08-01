import { prisma } from "@/lib/prisma";

export type CouponPreview = {
    id: string;
    code: string;
    discountPercent: number;
    serviceId: string | null;
    dojoName: string;
    discountAmount: number;
    finalAmount: number;
};

/**
 * Look up a coupon by code and validate that it can be applied to the given
 * service + student (dojo match, expiry, usage limit, active flag). Returns
 * a preview with the computed discount/final amounts, or an error string.
 *
 * The coupon must be issued by the student's own dojo — cross-dojo redemption
 * is not allowed.
 */
export async function previewCoupon(input: {
    code: string;
    studentDojoId: string;
    serviceId: string;
    fee: number;
}): Promise<{ preview: CouponPreview } | { error: string }> {
    const code = input.code.trim().toUpperCase();
    if (!code) return { error: "Please enter a coupon code." };

    const coupon = await prisma.serviceCoupon.findUnique({
        where: { code },
        include: { dojo: { select: { name: true } } },
    });

    if (!coupon || !coupon.isActive) return { error: "That coupon is not valid." };
    if (coupon.dojoId !== input.studentDojoId) {
        return { error: "This coupon was issued by a different dojo." };
    }
    if (coupon.serviceId && coupon.serviceId !== input.serviceId) {
        return { error: "This coupon cannot be used for this service." };
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return { error: "This coupon has expired." };
    }
    if (coupon.usedCount >= coupon.usageLimit) {
        return { error: "This coupon has already been used." };
    }

    const discountAmount = Math.round((input.fee * coupon.discountPercent) / 100);
    const finalAmount = Math.max(0, input.fee - discountAmount);

    return {
        preview: {
            id: coupon.id,
            code: coupon.code,
            discountPercent: coupon.discountPercent,
            serviceId: coupon.serviceId,
            dojoName: coupon.dojo.name,
            discountAmount,
            finalAmount,
        },
    };
}
