"use server";

export type DojoEnlistmentInput = {
    dojoName: string;
    email: string;
    phone: string;
    contactName: string;
    contactRole: string;
    address: string;
    latitude: string;
    longitude: string;
    trainers: { name: string; rank: string; contact: string }[];
};

export async function submitDojoEnlistment(
    input: DojoEnlistmentInput
): Promise<{ error?: string }> {
    // UI-first stub. Real implementation will:
    //   1. Insert into a `dojo_applications` table with status PENDING_EMAIL
    //   2. Trigger Supabase email OTP for `input.email`
    //   3. Emit a webhook to n8n for staff notification
    if (!input.email || !input.dojoName) {
        return { error: "Missing required fields." };
    }
    await new Promise((r) => setTimeout(r, 400));
    return {};
}

export async function verifyDojoOtp(
    _email: string,
    code: string
): Promise<{ error?: string }> {
    // UI-first stub. Real implementation will call
    // supabase.auth.verifyOtp({ email, token: code, type: 'email' }).
    if (!code || code.length < 6) {
        return { error: "Please enter the 6-digit code from your email." };
    }
    await new Promise((r) => setTimeout(r, 400));
    return {};
}

export async function initiateDojoEnlistmentPayment(
    _email: string
): Promise<{ error?: string; redirectUrl?: string }> {
    // UI-first stub. Real implementation will create an SSLCommerz
    // session for the enlistment fee and return the gateway redirect URL.
    await new Promise((r) => setTimeout(r, 400));
    return {};
}
