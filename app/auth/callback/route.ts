import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { provisionMemberFromSupabaseUser } from "@/lib/auth/provision-member";

/**
 * Supabase Auth Callback
 *
 * Supabase redirects here after:
 *   - Email verification (signup confirmation link)
 *   - Password reset links
 *   - OAuth provider callbacks
 *
 * Flow:
 *   1. Exchange the `code` param for a session
 *   2. Upsert a members row (safety net — the DB trigger should handle this,
 *      but this covers cases where the trigger hasn't been applied yet)
 *   3. Redirect to /portal (portal layout will redirect to /onboarding if needed)
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // `next` param lets callers specify a redirect target after auth
    const next = searchParams.get("next") ?? "/portal";

    if (!code) {
        // No code — likely a direct hit or malformed link
        return NextResponse.redirect(`${origin}/login?error=missing_code`);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
        console.error("[auth/callback] Session exchange failed:", error?.message);
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }

    await provisionMemberFromSupabaseUser(data.user);

    // Redirect to portal (or the `next` param if specified)
    const redirectUrl = next.startsWith("/") ? `${origin}${next}` : origin + "/portal";
    return NextResponse.redirect(redirectUrl);
}
