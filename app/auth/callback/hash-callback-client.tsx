"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
    next: string;
    initialError?: string;
};

/**
 * Consumes the URL hash tokens Supabase leaves on implicit-flow redirects.
 *
 * Supabase's invite / recovery emails land here with tokens in the fragment,
 * which the server never sees. We read them here, hand them to setSession()
 * so `@supabase/ssr` writes the session cookies, then hard-navigate to
 * `next` — the full navigation guarantees the RSC fetch runs with the new
 * session cookies present.
 */
export default function HashCallbackClient({
    next,
    initialError,
}: Props) {
    const [status, setStatus] = useState<"working" | "error">(
        initialError ? "error" : "working"
    );
    const [message, setMessage] = useState<string | null>(initialError ?? null);
    // React strict-mode fires effects twice in dev; a ref guarantees setSession
    // runs exactly once so the second invocation doesn't fail with "token used".
    const started = useRef(false);

    useEffect(() => {
        if (initialError) return;
        if (started.current) return;
        started.current = true;

        const hash = window.location.hash?.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash ?? "";
        const params = new URLSearchParams(hash);

        const errParam =
            params.get("error_description") ?? params.get("error");
        if (errParam) {
            setStatus("error");
            setMessage(decodeURIComponent(errParam.replace(/\+/g, " ")));
            return;
        }

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) {
            setStatus("error");
            setMessage(
                "This invite link is missing its authentication token. Ask the sender to resend the invite."
            );
            return;
        }

        // Race against a 15s timeout so a stalled network call doesn't leave
        // the user staring at a spinner forever.
        const supabase = createClient();
        const timeout = new Promise<{ error: Error }>((resolve) =>
            setTimeout(
                () =>
                    resolve({
                        error: new Error(
                            "Sign-in is taking too long. Please try the link again."
                        ),
                    }),
                15000
            )
        );

        Promise.race([
            supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            }),
            timeout,
        ])
            .then((result) => {
                const err = (result as { error?: { message: string } })?.error;
                if (err) {
                    setStatus("error");
                    setMessage(err.message);
                    return;
                }
                // Strip the fragment so a reload doesn't re-run this path
                // with a now-consumed token.
                window.history.replaceState(
                    null,
                    "",
                    window.location.pathname + window.location.search
                );
                // Full navigation — guarantees the server RSC fetch reads
                // the newly-written session cookies instead of racing with
                // Next's client cache.
                window.location.assign(next);
            })
            .catch((e) => {
                setStatus("error");
                setMessage(
                    e instanceof Error
                        ? e.message
                        : "Could not activate your session."
                );
            });
    }, [initialError, next]);

    if (status === "working") {
        return (
            <div className="min-h-screen bg-bg-charcoal flex items-center justify-center px-6">
                <div className="flex flex-col items-center gap-4 text-zinc-500">
                    <Loader2 size={22} className="animate-spin text-accent-red" />
                    <p className="text-xs tracking-widest uppercase font-bold">
                        Signing you in…
                    </p>
                    <p className="text-[11px] text-zinc-400 max-w-xs text-center leading-relaxed">
                        This can take a few seconds. Don&apos;t reload this page —
                        the invite link is one-use.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-charcoal flex items-center justify-center px-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
                <div className="bg-accent-red/10 border-b border-accent-red/30 px-6 py-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-red text-white flex items-center justify-center shrink-0">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent-red mb-1">
                            Sign-in failed
                        </p>
                        <h1 className="font-serif text-lg font-bold text-zinc-900">
                            We couldn&apos;t verify your link
                        </h1>
                    </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-zinc-700 leading-relaxed">
                        {message ??
                            "This invite link couldn't be verified. It may have expired or already been used."}
                    </p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Ask the Dojo Head to resend the invitation from the
                        Members page. Each invite email works only once.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center w-full bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase rounded-sm hover:bg-accent-red/90 transition-colors"
                    >
                        Go to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
