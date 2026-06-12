import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

        if (
            validationData.status === "VALID" ||
            validationData.status === "VALIDATED"
        ) {
            // 2. Update the order status in Supabase (if configured)
            if (!supabase) {
                console.error("Supabase client not configured");
                return NextResponse.json(
                    { error: "Supabase not configured" },
                    { status: 500 },
                );
            }

            const { error } = await (supabase as any)
                .from("shop_orders")
                .update({ payment_status: "PAID" })
                .eq("id", tran_id); // Assuming tran_id holds our shop_orders ID

            if (error) {
                console.error("Supabase update error:", error);
                throw error;
            }

            return NextResponse.json(
                { message: "IPN handled successfully" },
                { status: 200 },
            );
        } else {
            return NextResponse.json({ error: "Invalid IPN" }, { status: 400 });
        }
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 },
        );
    }
}
