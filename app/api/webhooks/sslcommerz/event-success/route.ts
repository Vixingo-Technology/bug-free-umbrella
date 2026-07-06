import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markRegistrationPaid } from "@/lib/events/ticket-payment";

// Called by SSLCommerz after a successful event-ticket payment (success_url).
// tran_id is the event_registrations.id. We validate the payment, mark the
// registration PAID, then land the participant on their card.

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const valId = formData.get("val_id") as string;
        const tranId = formData.get("tran_id") as string;
        const url = new URL(request.url);
        const regId = url.searchParams.get("regId") ?? tranId;

        const reg = await prisma.eventRegistration.findUnique({
            where: { id: regId },
            select: { qrToken: true, paymentStatus: true },
        });
        if (!reg) return NextResponse.redirect(new URL("/", request.url));

        const successUrl = new URL(
            `/events/payment-success?regId=${regId}`,
            request.url,
        );

        if (reg.paymentStatus === "PAID") {
            return NextResponse.redirect(successUrl);
        }

        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";

        if (storeId && storePassword) {
            const validateUrl = `https://${isSandbox ? "sandbox" : "securepay"}.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&v=1&format=json`;
            const validation = await fetch(validateUrl);
            const json = await validation.json();
            if (json.status !== "VALID" && json.status !== "VALIDATED") {
                return NextResponse.redirect(
                    new URL(`/events/payment-failed?regId=${regId}`, request.url),
                );
            }
        }

        await markRegistrationPaid(regId, valId ?? "SSLCOMMERZ");
        return NextResponse.redirect(successUrl);
    } catch (err) {
        console.error("SSLCommerz event-success webhook error:", err);
        return NextResponse.redirect(new URL("/", request.url));
    }
}

// Dev bypass / manual revisit — land on the success page.
export async function GET(request: Request) {
    const url = new URL(request.url);
    const regId = url.searchParams.get("regId");
    if (!regId) return NextResponse.redirect(new URL("/", request.url));

    const reg = await prisma.eventRegistration.findUnique({
        where: { id: regId },
        select: { id: true },
    });
    if (!reg) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.redirect(
        new URL(`/events/payment-success?regId=${regId}`, request.url),
    );
}
