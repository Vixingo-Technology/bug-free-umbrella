import { NextResponse } from "next/server";
import { markDojoEnlistmentPaidInternal } from "@/app/actions/enlist-dojo";

// Called by SSLCommerz after a successful dojo enlistment payment
// (success_url). tran_id is the DojoApplication.id. We validate the IPN,
// activate the dojo, mark the application PAID, then land the owner on
// /enlist-dojo/success.

async function validateIpn(valId: string | null): Promise<boolean> {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";
    if (!storeId || !storePassword) return true; // dev bypass
    if (!valId) return false;
    const validateUrl = `https://${isSandbox ? "sandbox" : "securepay"}.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&v=1&format=json`;
    try {
        const res = await fetch(validateUrl);
        const json = await res.json();
        return json.status === "VALID" || json.status === "VALIDATED";
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const valId = (formData.get("val_id") as string) ?? null;
        const tranId = formData.get("tran_id") as string;
        const url = new URL(request.url);
        const applicationId =
            url.searchParams.get("applicationId") ?? tranId ?? null;

        if (!applicationId) {
            return NextResponse.redirect(new URL("/enlist-dojo", request.url));
        }

        const ok = await validateIpn(valId);
        if (!ok) {
            return NextResponse.redirect(
                new URL(
                    `/enlist-dojo/failed?applicationId=${applicationId}`,
                    request.url,
                ),
            );
        }

        await markDojoEnlistmentPaidInternal(
            applicationId,
            valId ?? `SSLCOMMERZ-${Date.now()}`,
        );

        return NextResponse.redirect(
            new URL(
                `/enlist-dojo/success?applicationId=${applicationId}`,
                request.url,
            ),
        );
    } catch (err) {
        console.error("SSLCommerz dojo-success webhook error:", err);
        return NextResponse.redirect(new URL("/enlist-dojo", request.url));
    }
}

// Dev bypass — SSLCommerz not configured, initiator redirects here with GET.
export async function GET(request: Request) {
    const url = new URL(request.url);
    const applicationId = url.searchParams.get("applicationId");
    if (!applicationId) {
        return NextResponse.redirect(new URL("/enlist-dojo", request.url));
    }
    await markDojoEnlistmentPaidInternal(
        applicationId,
        `DEV-${Date.now()}`,
    );
    return NextResponse.redirect(
        new URL(
            `/enlist-dojo/success?applicationId=${applicationId}`,
            request.url,
        ),
    );
}
