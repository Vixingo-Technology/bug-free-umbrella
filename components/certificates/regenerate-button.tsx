"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { regenerateCertificateAction } from "@/app/portal/admin/certificates/actions";

export default function RegenerateButton({ requestId }: { requestId: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function onClick() {
        setError(null);
        startTransition(async () => {
            const res = await regenerateCertificateAction({
                certificateRequestId: requestId,
            });
            if ("error" in res) {
                setError(res.error);
                return;
            }
            // Hard refresh so the iframe re-fetches the new PDF instead of
            // serving the cached one.
            router.refresh();
            setTimeout(() => window.location.reload(), 50);
        });
    }

    return (
        <div className="flex items-center gap-2">
            {error && (
                <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
                    <AlertCircle size={10} /> {error}
                </span>
            )}
            <button
                type="button"
                onClick={onClick}
                disabled={pending}
                className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-sm disabled:opacity-50"
            >
                {pending ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <RefreshCw size={12} />
                )}
                Regenerate
            </button>
        </div>
    );
}
