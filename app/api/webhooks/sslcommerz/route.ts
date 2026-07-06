import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { generateCertificatePdf } from "@/lib/certificates/generate";
import { markRegistrationPaid } from "@/lib/events/ticket-payment";

// Setup Supabase client only if environment variables are present.
// Creating the client at import-time with empty values can throw during build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
    console.warn(
        "Supabase not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
    );
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const status = formData.get("status");
        const val_id = formData.get("val_id");
        const tran_id = formData.get("tran_id");

        // 1. Validate the IPN with SSLCommerz to prevent spoofing
        const validationUrl = `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${process.env.SSLC_STORE_ID}&store_passwd=${process.env.SSLC_STORE_PASSWORD}&v=1&format=json`;
        const validationResponse = await fetch(validationUrl);
        const validationData = await validationResponse.json();

        const isValid =
            validationData.status === "VALID" ||
            validationData.status === "VALIDATED";
        if (!isValid) {
            return NextResponse.json({ error: "Invalid IPN" }, { status: 400 });
        }

        // Event-ticket payments also point their IPN here — tran_id is the
        // event_registrations.id. Handle those before the shop-order path.
        // (Guard the uuid shape so a malformed tran_id can't blow up the
        // Postgres uuid cast.)
        const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                String(tran_id),
            );
        const eventReg = isUuid
            ? await prisma.eventRegistration.findUnique({
                  where: { id: String(tran_id) },
                  select: { id: true },
              })
            : null;
        if (eventReg) {
            await markRegistrationPaid(eventReg.id, String(val_id ?? "SSLCOMMERZ"));
            return NextResponse.json(
                { message: "IPN handled successfully" },
                { status: 200 },
            );
        }

        if (!supabase) {
            console.error("Supabase client not configured");
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 },
            );
        }

        // 2. Mark the order PAID
        const { error } = await (supabase as any)
            .from("shop_orders")
            .update({ payment_status: "PAID" })
            .eq("id", tran_id);
        if (error) {
            console.error("Supabase update error:", error);
            throw error;
        }

        // 3. Side-effects per order type. We post-process via Prisma so RLS
        //    isn't in the way and Decimal/Date types are normalized.
        try {
            await handleOrderSideEffects(String(tran_id));
        } catch (e) {
            console.error("[sslcommerz] post-paid side effects failed", e);
            // We still ack the webhook — SSLCommerz only needs the order to
            // be marked PAID. Failed cert PDFs end up in FAILED status and
            // can be retried by an admin.
        }

        return NextResponse.json(
            { message: "IPN handled successfully" },
            { status: 200 },
        );
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 },
        );
    }
}

async function handleOrderSideEffects(orderId: string) {
    const order = await prisma.shopOrder.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            includesCertificates: true,
            includesTransferRequest: true,
            certificateRequests: { select: { id: true } },
            transferRequest: { select: { id: true, status: true } },
        },
    });
    if (!order) return;

    // Idempotent fallback for transfer requests — the success route usually
    // handles this, but if the user closes the browser before the redirect
    // fires we still advance the request out of PENDING_PAYMENT.
    if (
        order.includesTransferRequest &&
        order.transferRequest &&
        order.transferRequest.status === "PENDING_PAYMENT"
    ) {
        await prisma.studentTransferRequest.update({
            where: { id: order.transferRequest.id },
            data: { status: "AWAITING_DOJO", paidAt: new Date() },
        });
    }

    if (!order.includesCertificates || order.certificateRequests.length === 0) {
        return;
    }

    // Flip every PENDING_PAYMENT request on this order to PAID, then render
    // each PDF. We do this sequentially to avoid hammering Cloudinary in
    // bursts and to keep memory tight.
    await prisma.certificateRequest.updateMany({
        where: { orderId: order.id, status: "PENDING_PAYMENT" },
        data: { status: "PAID" },
    });

    for (const r of order.certificateRequests) {
        const res = await generateCertificatePdf({
            certificateRequestId: r.id,
        });
        if (!res.ok) {
            console.error(
                "[certificate] generation failed",
                r.id,
                res.reason,
            );
        }
    }
}
