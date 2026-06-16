import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that uses the SERVICE_ROLE key.
 *
 * Bypasses RLS. Only call from server actions or API routes that have
 * already verified the caller is an admin. NEVER expose to the browser.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error("Supabase admin client missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
