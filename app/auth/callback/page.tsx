import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { provisionMemberFromSupabaseUser } from "@/lib/auth/provision-member";
import HashCallbackClient from "./hash-callback-client";

export const dynamic = "force-dynamic";

/**
 * Supabase Auth Callback
 *
 * Supabase sends users here after invite / signup / password-reset flows.
 * Two token delivery formats are possible depending on how Supabase issued
 * the link:
 *
 *   1. PKCE — tokens arrive as `?code=...` in the query string. We handle
 *      this server-side by exchanging the code for a session.
 *   2. Implicit — access / refresh tokens arrive in the URL fragment
 *      (`#access_token=...&refresh_token=...&type=invite`). Fragments never
 *      reach the server, so we render a small client component that reads
 *      them from `window.location.hash` and calls `setSession()`.
 *
 * The fallback client also owns the retry surface if either flow fails,
 * so users don't get dumped on a generic /login page mid-invite.
 */
export default async function AuthCallbackPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string; next?: string; error?: string; error_description?: string }>;
}) {
    const params = await searchParams;
    const next = params.next && params.next.startsWith("/") ? params.next : "/portal";

    // Query-string errors from Supabase (e.g. "otp_expired") — surface them
    // to the client so the user sees something actionable.
    if (params.error) {
        return (
            <HashCallbackClient
                next={next}
                initialError={params.error_description || params.error}
            />
        );
    }

    if (params.code) {
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
                            cookieStore.set(name, value, options),
                        );
                    },
                },
            }
        );

        const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error || !data.user) {
            console.error("[auth/callback] PKCE exchange failed:", error?.message);
            return (
                <HashCallbackClient
                    next={next}
                    initialError={error?.message ?? "Session exchange failed."}
                />
            );
        }

        await provisionMemberFromSupabaseUser(data.user);
        redirect(next);
    }

    // No code — fall through to the client so it can pick up hash tokens.
    return <HashCallbackClient next={next} />;
}
