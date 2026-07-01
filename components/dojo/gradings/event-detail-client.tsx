"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import {
  updateScheduledExamAction,
  cancelScheduledExamAction,
  upsertDraftResultsAction,
  publishResultsAction,
} from "@/app/portal/dojo/gradings/actions";

type Event = {
  id: string;
  name: string;
  eventDate: string;
  location: string | null;
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  resultsPublishedAt: string | null;
};

type Application = {
  id: string;
  memberId: string;
  memberName: string;
  currentRank: string;
  targetRankId: string | null;
  targetRankName: string | null;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
};

type Grading = {
  id: string;
  memberId: string;
  result: "PASSED" | "FAILED" | "ABSENT";
  notes: string | null;
  toRankId: string | null;
  fromRankId: string | null;
};

type ResultDraft = Record<string, { result: "PASSED" | "FAILED" | "ABSENT"; reviewNotes: string }>;

export default function EventDetailClient({
  event,
  applications,
  gradings,
}: {
  event: Event;
  applications: Application[];
  gradings: Grading[];
}) {
  const isCancelled = !!event.cancelledAt;
  const isPublished = !!event.resultsPublishedAt;
  const readOnly = isCancelled || isPublished;

  const enrolled = applications.filter((a) => a.status === "APPROVED" || a.status === "CANCELLED");

  const initialDraft: ResultDraft = useMemo(() => {
    const m: ResultDraft = {};
    for (const a of enrolled) {
      const g = gradings.find((x) => x.memberId === a.memberId);
      m[a.memberId] = {
        result: g?.result ?? "PASSED",
        reviewNotes: g?.notes ?? "",
      };
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draft, setDraft] = useState<ResultDraft>(initialDraft);

  return (
    <>
      <div className="mb-4">
        <Link
          href="/portal/dojo/gradings"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
        >
          <ArrowLeft size={12} />
          Back to gradings
        </Link>
      </div>

      <EventHeaderCard event={event} readOnly={readOnly} />

      {isCancelled && (
        <Banner kind="muted">
          Cancelled on {fmtDateTime(event.cancelledAt!)}
          {event.cancelReason ? ` — ${event.cancelReason}` : ""}.
        </Banner>
      )}
      {isPublished && (
        <Banner kind="ok">
          Results published on {fmtDateTime(event.resultsPublishedAt!)}. No further edits allowed.
        </Banner>
      )}

      <ResultsSection
        applications={enrolled}
        draft={draft}
        setDraft={setDraft}
        eventId={event.id}
        readOnly={readOnly}
      />
    </>
  );
}

// ─── Header (editable details, cancel) ───────────────────────────────────────

function EventHeaderCard({ event, readOnly }: { event: Event; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  return (
    <section className="bg-white border border-zinc-200 rounded-sm shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-zinc-900">{event.name}</h1>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} />
              {fmtDateTime(event.eventDate)}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {event.location}
              </span>
            )}
          </p>
          {event.notes && (
            <p className="text-xs text-zinc-600 mt-2 whitespace-pre-line">{event.notes}</p>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 shrink-0">
            <SmallBtn onClick={() => setEditing(true)} icon={<Pencil size={12} />} variant="ghost">
              Edit
            </SmallBtn>
            <SmallBtn onClick={() => setCancelling(true)} icon={<XCircle size={12} />} variant="ghost">
              Cancel test
            </SmallBtn>
          </div>
        )}
      </div>

      {editing && <EditDialog event={event} onClose={() => setEditing(false)} />}
      {cancelling && <CancelDialog event={event} onClose={() => setCancelling(false)} />}
    </section>
  );
}

function EditDialog({ event, onClose }: { event: Event; onClose: () => void }) {
  const d = new Date(event.eventDate);
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  );
  const [time, setTime] = useState(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  const [location, setLocation] = useState(event.location ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const iso = new Date(`${date}T${time}:00`).toISOString();
    startTransition(async () => {
      const res = await updateScheduledExamAction({
        eventId: event.id,
        name,
        eventDate: iso,
        location,
        notes,
      });
      if ("error" in res) setError(res.error);
      else {
        onClose();
        window.location.reload();
      }
    });
  }

  return (
    <Modal title="Edit belt test" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Event name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} required />
          </Field>
          <Field label="Time">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} required />
          </Field>
        </div>
        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={input} />
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} />
        </Field>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <SmallBtn type="button" onClick={onClose} disabled={isPending} variant="ghost">
            Discard
          </SmallBtn>
          <SmallBtn type="submit" disabled={isPending} icon={isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}>
            Save changes
          </SmallBtn>
        </div>
      </form>
    </Modal>
  );
}

function CancelDialog({ event, onClose }: { event: Event; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await cancelScheduledExamAction({ eventId: event.id, reason });
      if ("error" in res) setError(res.error);
      else {
        onClose();
        window.location.reload();
      }
    });
  }

  return (
    <Modal title="Cancel belt test" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-zinc-600">
          Enrolled candidates will be notified. Cancellation can't be undone — you'll need to create a new test.
        </p>
        <Field label="Reason (optional)">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={input} placeholder="e.g. weather / venue change" />
        </Field>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <SmallBtn type="button" onClick={onClose} disabled={isPending} variant="ghost">
            Keep test
          </SmallBtn>
          <SmallBtn type="submit" disabled={isPending} icon={isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}>
            Cancel test
          </SmallBtn>
        </div>
      </form>
    </Modal>
  );
}

// ─── Per-candidate result form + draft/publish ──────────────────────────────

function ResultsSection({
  applications,
  draft,
  setDraft,
  eventId,
  readOnly,
}: {
  applications: Application[];
  draft: ResultDraft;
  setDraft: (next: ResultDraft) => void;
  eventId: string;
  readOnly: boolean;
}) {
  const [savingDraft, startSavingDraft] = useTransition();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function setRow(memberId: string, patch: Partial<{ result: "PASSED" | "FAILED" | "ABSENT"; reviewNotes: string }>) {
    setDraft({ ...draft, [memberId]: { ...draft[memberId], ...patch } });
  }

  function saveDraft() {
    setError(null);
    const rows = applications.map((a) => ({
      studentId: a.memberId,
      result: draft[a.memberId].result,
      reviewNotes: draft[a.memberId].reviewNotes,
    }));
    startSavingDraft(async () => {
      const res = await upsertDraftResultsAction({ eventId, rows });
      if ("error" in res) setError(res.error);
      else setSavedAt(new Date());
    });
  }

  if (applications.length === 0) {
    return (
      <section className="bg-white border border-zinc-200 rounded-sm shadow-sm mb-6 p-5">
        <p className="text-sm text-zinc-500 italic">No enrolled candidates for this test.</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-zinc-200 rounded-sm shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Candidate results</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {readOnly
              ? "Read only — results have been published or the test was cancelled."
              : "Draft each candidate's result. Nothing reaches the student until you publish."}
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {savedAt && (
              <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-600">
                Saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            <SmallBtn
              onClick={saveDraft}
              disabled={savingDraft}
              variant="ghost"
              icon={savingDraft ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            >
              Save draft
            </SmallBtn>
            <SmallBtn
              onClick={() => setPublishing(true)}
              icon={<Send size={12} />}
            >
              Publish results
            </SmallBtn>
          </div>
        )}
      </div>

      <ul className="divide-y divide-zinc-200">
        {applications.map((a) => (
          <li key={a.memberId} className="px-5 py-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_2fr] gap-3 items-start">
            <div>
              <p className="font-semibold text-sm text-zinc-900">{a.memberName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {a.currentRank}
                {a.targetRankName && (
                  <>
                    {" → "}
                    <span className="text-accent-red font-semibold">{a.targetRankName}</span>
                  </>
                )}
              </p>
              {a.status === "CANCELLED" && (
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">
                  Was cancelled
                </p>
              )}
            </div>

            <div>
              <ResultPicker
                value={draft[a.memberId]?.result ?? "PASSED"}
                onChange={(v) => setRow(a.memberId, { result: v })}
                disabled={readOnly}
              />
            </div>

            <div>
              <textarea
                value={draft[a.memberId]?.reviewNotes ?? ""}
                onChange={(e) => setRow(a.memberId, { reviewNotes: e.target.value })}
                placeholder="Review notes (optional) — shared with the student on publish."
                rows={2}
                disabled={readOnly}
                className={`${input} disabled:bg-zinc-50 disabled:text-zinc-500`}
              />
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <div className="px-5 py-3 border-t border-zinc-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {publishing && (
        <PublishDialog
          eventId={eventId}
          onClose={() => setPublishing(false)}
        />
      )}
    </section>
  );
}

function ResultPicker({
  value,
  onChange,
  disabled,
}: {
  value: "PASSED" | "FAILED" | "ABSENT";
  onChange: (v: "PASSED" | "FAILED" | "ABSENT") => void;
  disabled: boolean;
}) {
  const opts: Array<{ value: "PASSED" | "FAILED" | "ABSENT"; label: string; cls: string }> = [
    { value: "PASSED", label: "Passed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "FAILED", label: "Failed", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "ABSENT", label: "Absent", cls: "bg-zinc-50 text-zinc-600 border-zinc-200" },
  ];
  return (
    <div className="inline-flex rounded-sm border border-zinc-200 overflow-hidden">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 transition-colors disabled:opacity-50 ${
              active ? o.cls : "text-zinc-500 hover:bg-zinc-50"
            } ${o !== opts[0] ? "border-l border-zinc-200" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PublishDialog({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await publishResultsAction({ eventId });
      if ("error" in res) setError(res.error);
      else {
        onClose();
        window.location.reload();
      }
    });
  }

  return (
    <Modal title="Publish results" onClose={onClose}>
      <p className="text-sm text-zinc-600">
        Members will be notified and emailed with their result. Ranks on PASSED grades will update immediately.
        This can't be undone.
      </p>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <SmallBtn type="button" onClick={onClose} disabled={isPending} variant="ghost">
          Cancel
        </SmallBtn>
        <SmallBtn
          type="button"
          onClick={submit}
          disabled={isPending}
          icon={isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
        >
          Publish now
        </SmallBtn>
      </div>
    </Modal>
  );
}

// ─── Bits ────────────────────────────────────────────────────────────────────

const input = "w-full text-sm border border-zinc-200 rounded-sm px-2 py-1.5 focus:outline-none focus:border-zinc-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function SmallBtn({
  children,
  icon,
  variant = "primary",
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const cls =
    variant === "primary"
      ? "bg-accent-red text-white hover:bg-accent-red/90"
      : "border border-zinc-300 text-zinc-600 hover:border-accent-red hover:text-accent-red";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${cls}`}>
      {icon}
      {children}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-900">
            <XCircle size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Banner({ kind, children }: { kind: "muted" | "ok"; children: React.ReactNode }) {
  const cls =
    kind === "ok"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-zinc-50 border-zinc-200 text-zinc-700";
  return <div className={`border rounded-sm px-4 py-3 mb-6 text-sm ${cls}`}>{children}</div>;
}

function fmtDateTime(s: string): string {
  const d = new Date(s);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}
