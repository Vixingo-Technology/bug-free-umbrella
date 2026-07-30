"use client";

import { useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import ScheduleDialog from "./schedule-dialog";
import DeclineButton from "./decline-button";

export type AppliedCandidate = {
  id: string;
  name: string;
  currentRank: string;
  targetRank: string;
  appliedOn: string;
  notes: string | null;
};

export default function AppliedStage({
  candidates,
  canSchedule,
  dojoAddress,
}: {
  candidates: AppliedCandidate[];
  canSchedule: boolean;
  dojoAddress: string | null;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, AppliedCandidate[]>();
    for (const c of candidates) {
      const key = c.targetRank || "Unspecified";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries());
  }, [candidates]);

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  if (candidates.length === 0) {
    return <p className="py-4 text-sm text-zinc-500 italic">No new requests.</p>;
  }

  return (
    <div className="space-y-6 p-6">
      {grouped.map(([rankName, rows]) => (
        <div key={rankName}>
          <h3 className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
            {rankName} — {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
          </h3>
          <ul className="divide-y divide-zinc-200">
            {rows.map((c) => (
              <li
                key={c.id}
                className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  {canSchedule && (
                    <input
                      type="checkbox"
                      checked={checked.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="w-4 h-4"
                    />
                  )}
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-sm">
                    {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">{c.name}</p>
                    <p className="text-xs text-zinc-500">
                      {c.currentRank} → <span className="text-accent-red font-semibold">{c.targetRank}</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold mt-1">
                      Applied {c.appliedOn}
                    </p>
                    {c.notes && <p className="text-xs text-zinc-500 italic mt-1">&quot;{c.notes}&quot;</p>}
                  </div>
                </label>
                {canSchedule && <DeclineButton applicationId={c.id} />}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {canSchedule && checked.size > 0 && (
        <div className="sticky bottom-4 z-30 flex justify-end">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 bg-accent-red text-white text-xs font-bold tracking-widest uppercase px-4 py-2.5 rounded-sm shadow-lg hover:bg-accent-red/90"
          >
            <CalendarPlus size={14} />
            Schedule exam for {checked.size} candidate(s) →
          </button>
        </div>
      )}

      {dialogOpen && (
        <ScheduleDialog
          selectedIds={Array.from(checked)}
          dojoAddress={dojoAddress}
          onClose={() => setDialogOpen(false)}
          onScheduled={() => {
            setChecked(new Set());
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
