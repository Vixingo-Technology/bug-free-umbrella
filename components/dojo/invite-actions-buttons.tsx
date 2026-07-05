"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw, Trash2 } from "lucide-react";
import {
    resendDojoInviteAction,
    revokeDojoInviteAction,
} from "@/app/actions/dojo-invite";

type Props = {
    memberId: string;
    /** Called with a status update so the parent can display flash text. */
    onFlash?: (msg: { tone: "ok" | "err"; text: string }) => void;
};

/**
 * Resend / Revoke controls for a pending invite. Wraps the server actions
 * with useTransition so the buttons show a spinner while the request is
 * in flight, and surfaces success / failure to the row so users know the
 * action actually happened.
 */
export function InviteActionButtons({ memberId, onFlash }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [flash, setFlash] = useState<{ tone: "ok" | "err"; text: string } | null>(
        null
    );

    function submit(kind: "resend" | "revoke") {
        setFlash(null);
        const fd = new FormData();
        fd.set("memberId", memberId);
        startTransition(async () => {
            const result =
                kind === "resend"
                    ? await resendDojoInviteAction(fd)
                    : await revokeDojoInviteAction(fd);
            if (result.ok) {
                const msg = {
                    tone: "ok" as const,
                    text:
                        kind === "resend"
                            ? "Invite email sent."
                            : "Invite revoked.",
                };
                setFlash(msg);
                onFlash?.(msg);
                // Force the server component to re-render fresh data so a
                // revoked row disappears and a resend updates the timestamp.
                router.refresh();
            } else {
                const msg = { tone: "err" as const, text: result.error };
                setFlash(msg);
                onFlash?.(msg);
            }
        });
    }

    return (
        <div className="flex items-center gap-2 shrink-0">
            <button
                type="button"
                onClick={() => submit("resend")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-60 transition-colors px-3 py-2 rounded-sm"
            >
                {isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <RotateCcw size={12} />
                )}
                Resend
            </button>
            <button
                type="button"
                onClick={() => submit("revoke")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red disabled:opacity-60 transition-colors px-3 py-2"
            >
                <Trash2 size={12} />
                Revoke
            </button>
            {flash && !isPending && (
                <span
                    role="status"
                    className={`inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold ${
                        flash.tone === "ok"
                            ? "text-emerald-700"
                            : "text-accent-red"
                    }`}
                >
                    {flash.tone === "ok" && <CheckCircle2 size={12} />}
                    {flash.text}
                </span>
            )}
        </div>
    );
}
