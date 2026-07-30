"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { markGradingsVerifiedAction } from "@/app/portal/dojo/gradings/actions";

export type QualifiedPassed = {
  gradingId: string;
  studentId: string;
  name: string;
  fromRank: string | null;
  toRank: string | null;
  marks: number | null;
  isDoublePromotion: boolean;
  publishedOn: string;
  eventName: string;
  // Populated only for SUBMITTED-stage rows so the Submitted tab can show
  // whether JKA HQ has approved the certificate and where to download it.
  certificateStatus?:
    | "PENDING_PAYMENT"
    | "PAID"
    | "GENERATING"
    | "ISSUED"
    | "FAILED"
    | null;
  certificateUrl?: string | null;
};

export default function QualifiedStage({
  rows,
  canVerify,
}: {
  rows: QualifiedPassed[];
  canVerify: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <p className="py-4 text-sm text-zinc-500 italic">
        No qualified students yet — passed candidates land here once results are published.
      </p>
    );
  }

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    setError(null);
  }

  function toggleAll() {
    if (checked.size === rows.length) setChecked(new Set());
    else setChecked(new Set(rows.map((r) => r.gradingId)));
  }

  function handleVerify() {
    const ids = Array.from(checked);
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await markGradingsVerifiedAction({ gradingIds: ids });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setChecked(new Set());
      router.refresh();
    });
  }

  const allChecked = checked.size === rows.length && rows.length > 0;

  return (
    <div className="space-y-3">
      {canVerify && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200 pb-3">
          <label className="flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-zinc-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="w-4 h-4"
            />
            {checked.size > 0 ? `${checked.size} selected` : "Select all"}
          </label>
          <button
            type="button"
            onClick={handleVerify}
            disabled={checked.size === 0 || pending}
            className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm bg-accent-red text-white hover:bg-accent-red/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={14} />
            {pending ? "Sending…" : `Send to Verified${checked.size ? ` (${checked.size})` : ""}`}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <ul className="divide-y divide-zinc-200">
        {rows.map((q) => (
          <li
            key={q.gradingId}
            className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <label className="flex items-center gap-4 flex-1 cursor-pointer">
              {canVerify && (
                <input
                  type="checkbox"
                  checked={checked.has(q.gradingId)}
                  onChange={() => toggle(q.gradingId)}
                  className="w-4 h-4"
                />
              )}
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-sm">
                {q.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <Link
                  href={`/portal/dojo/members/${q.studentId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-zinc-900 text-sm hover:text-accent-red hover:underline"
                >
                  {q.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {q.fromRank ?? "—"} →{" "}
                  <span className="text-accent-red font-semibold">{q.toRank ?? "—"}</span>
                  {q.isDoublePromotion && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      <Sparkles size={10} /> Double promotion
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold mt-1">
                  {q.eventName} · Published {q.publishedOn}
                </p>
              </div>
            </label>
            <span className="inline-flex items-baseline gap-1 text-xs tracking-widest uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full self-start md:self-auto">
              <span className="text-base leading-none font-black">{q.marks ?? "—"}</span>
              <span className="text-[10px]">/ 100</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
