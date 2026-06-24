"use client";

import { useState, useTransition } from "react";
import { Loader2, CalendarPlus, X } from "lucide-react";
import { scheduleExamAction } from "@/app/dojo/dashboard/gradings/actions";

export default function ScheduleDialog({
  selectedIds, dojoAddress, onClose, onScheduled,
}: {
  selectedIds: string[];
  dojoAddress: string | null;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const defaultName = `Belt Grading — ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState("");          // yyyy-mm-dd
  const [time, setTime] = useState("10:00");      // HH:mm
  const [location, setLocation] = useState(dojoAddress ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date || !time) {
      setError("Date and time are required.");
      return;
    }
    const iso = new Date(`${date}T${time}:00`).toISOString();
    startTransition(async () => {
      const res = await scheduleExamAction({
        applicationIds: selectedIds,
        name,
        eventDate: iso,
        location,
        notes,
      });
      if ("error" in res) setError(res.error);
      else {
        onScheduled();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <CalendarPlus size={16} /> Schedule exam for {selectedIds.length} candidate(s)
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-900">
            <X size={16} />
          </button>
        </div>

        <Field label="Event name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm border border-zinc-200 rounded-sm px-2 py-1.5"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded-sm px-2 py-1.5"
              required
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded-sm px-2 py-1.5"
              required
            />
          </Field>
        </div>
        <Field label="Location">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-sm border border-zinc-200 rounded-sm px-2 py-1.5"
          />
        </Field>
        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full text-sm border border-zinc-200 rounded-sm px-2 py-1.5"
          />
        </Field>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-zinc-900 px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-accent-red text-white text-[10px] tracking-widest uppercase font-bold px-4 py-2 rounded-sm hover:bg-accent-red/90 disabled:opacity-40"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={12} />}
            Schedule
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
