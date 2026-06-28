"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { createAnnouncementAction } from "@/app/actions/announcements";

export default function AnnouncementForm({
    eyebrow = "Quick post",
    submitLabel = "Publish announcement",
    redirectAfter,
}: {
    eyebrow?: string;
    submitLabel?: string;
    /** Where to navigate after a successful post (typically the Posted tab). */
    redirectAfter?: string;
}) {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    function submit(formData: FormData) {
        setError(null);
        startTransition(async () => {
            const res = await createAnnouncementAction(formData);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            const form = document.getElementById(
                "announcement-form",
            ) as HTMLFormElement | null;
            form?.reset();
            if (redirectAfter) router.push(redirectAfter);
        });
    }

    return (
        <form
            id="announcement-form"
            action={submit}
            className="bg-white border border-zinc-200 rounded-sm shadow-sm p-5"
        >
            <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500 mb-4">
                {eyebrow}
            </h3>
            <input
                name="title"
                required
                type="text"
                placeholder="Headline"
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm mb-3"
            />
            <textarea
                name="body"
                rows={5}
                placeholder="Write your announcement…"
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm mb-3"
            />
            <input
                name="link"
                type="url"
                placeholder="Link (optional)"
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm mb-3"
            />
            <label className="block mb-3">
                <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                    Attachment (optional · PDF or image)
                </span>
                <input
                    name="attachment"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/avif"
                    className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-zinc-200 file:bg-zinc-50 file:text-zinc-700 file:text-[10px] file:font-bold file:uppercase file:tracking-widest hover:file:bg-zinc-100 cursor-pointer"
                />
            </label>
            {error && (
                <p className="text-xs text-red-600 mb-3">{error}</p>
            )}
            <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 transition-colors rounded-sm"
            >
                {isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Send size={14} />
                )}
                {submitLabel}
            </button>
        </form>
    );
}
