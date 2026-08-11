"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { cancelRegistrationByIdAction } from "@/app/portal/events/actions";

/**
 * Admin-only "Cancel registration" control shown on the participant detail
 * page. Confirms with the admin before deleting the row (and any siblings
 * in the same payment group) and routes back to the participants list.
 */
export default function AdminCancelRegistrationButton({
    registrationId,
    eventId,
    participantName,
}: {
    registrationId: string;
    eventId: string;
    participantName: string;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    function onCancel() {
        const ok = window.confirm(
            `Cancel registration for ${participantName}? This removes them from the event. Refunds must be processed separately.`,
        );
        if (!ok) return;

        setError(null);
        startTransition(async () => {
            const res = await cancelRegistrationByIdAction(registrationId);
            if (res.error) {
                setError(res.error);
                return;
            }
            router.push(`/portal/admin/events/${eventId}/participants`);
            router.refresh();
        });
    }

    return (
        <div className="mt-4 pt-4 border-t border-zinc-200">
            {error && (
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
                    <AlertTriangle size={14} className="shrink-0" />
                    {error}
                </div>
            )}
            <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-3 py-2 text-[10px] tracking-widest uppercase font-bold text-red-700 border border-red-200 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
                {isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <X size={12} />
                )}
                Cancel registration
            </button>
        </div>
    );
}
