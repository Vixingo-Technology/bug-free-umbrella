"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAnnouncementAction } from "@/app/actions/announcements";

export default function DeleteAnnouncementButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();

    function handle() {
        if (!confirm("Delete this announcement?")) return;
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
            const res = await deleteAnnouncementAction(fd);
            if (!res.ok) alert(res.error);
        });
    }

    return (
        <button
            type="button"
            onClick={handle}
            disabled={isPending}
            className="text-zinc-400 hover:text-accent-red disabled:opacity-40 transition-colors"
            aria-label="Delete announcement"
        >
            {isPending ? (
                <Loader2 size={14} className="animate-spin" />
            ) : (
                <Trash2 size={14} />
            )}
        </button>
    );
}
