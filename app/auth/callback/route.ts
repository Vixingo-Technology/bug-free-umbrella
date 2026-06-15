import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { emitMemberCreated } from "@/lib/n8n";

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

    const user = data.user;

    // ── Upsert members row ──────────────────────────────────────────────────
    // The Supabase trigger on auth.users should have already created the row
    // when the user signed up. This upsert is a safety net for:
    //   - Environments where the trigger hasn't been applied
    //   - Race conditions
    try {
        const meta = user.user_metadata ?? {};
        const fullName: string =
            meta.full_name ??
            [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
            user.email!;

        await prisma.member.upsert({
            where: { id: user.id },
            create: {
                id: user.id,
                email: user.email!,
                fullName,
                currentRank: meta.current_rank ?? "White Belt",
                role: meta.role === "INSTRUCTOR" ? "INSTRUCTOR"
                    : meta.role === "ADMIN" ? "ADMIN"
                    : "STUDENT",
                onboardingComplete: false,
                membershipStatus: "PENDING",
            },
            update: {
                // Only update email in case it changed (e.g. email change confirmation)
                email: user.email!,
            },
        });

        // Emit welcome webhook to n8n (WhatsApp + email) only on new member creation
        // Check if row was just created by looking at createdAt ≈ now
        const freshMember = await prisma.member.findUnique({ where: { id: user.id } });
        const isNew = freshMember && (Date.now() - freshMember.createdAt.getTime()) < 30_000;
        if (isNew) {
            await emitMemberCreated({
                id: freshMember.id,
                fullName: freshMember.fullName,
                email: freshMember.email,
                phone: freshMember.phone,
                currentRank: freshMember.currentRank,
            });
        }
    } catch (err) {
        // Non-fatal — log and continue. Portal layout will handle missing members gracefully.
        console.error("[auth/callback] Member upsert failed:", err);
    }

    // Redirect to portal (or the `next` param if specified)
    const redirectUrl = next.startsWith("/") ? `${origin}${next}` : origin + "/portal";
    return NextResponse.redirect(redirectUrl);
}
