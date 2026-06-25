"use client";

import { useState, useTransition } from "react";
import { XCircle, Loader2 } from "lucide-react";
import { declineRequestAction } from "@/app/portal/dojo/gradings/actions";

export default function DeclineButton({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await declineRequestAction({ applicationId, reason });
      if ("error" in res) setError(res.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm border border-zinc-300 text-zinc-600 hover:border-accent-red hover:text-accent-red"
      >
        <XCircle size={14} /> Decline
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full md:max-w-sm">
      <textarea
        rows={2}
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Optional reason"
        className="text-xs border border-zinc-200 rounded-sm px-2 py-1.5"
        disabled={isPending}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-accent-red text-white text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm hover:bg-accent-red/90 disabled:opacity-40"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
          Confirm decline
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setReason(""); setError(null); }}
          disabled={isPending}
          className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-zinc-900"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
