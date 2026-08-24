"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronsUp,
  Loader2,
  MapPin,
  CalendarSync,
  Save,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  updateScheduledExamAction,
  upsertDraftResultsAction,
  publishResultsAction,
  updatePublishedMarksAction,
} from "@/app/portal/dojo/gradings/actions";
import { bandForMarks, marksEarnDoublePromotion } from "@/lib/grading-marks";
import type { DojoRole } from "@/lib/dojo-roles";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";
import { formatBeltRank } from "@/lib/constants";

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
  /** Rank the candidate lands on at 80+ marks; null when target is the top rank. */
  doubleRankName: string | null;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
};

type Grading = {
  id: string;
  memberId: string;
  result: "PASSED" | "FAILED" | "ABSENT";
  marks: number | null;
  notes: string | null;
  toRankId: string | null;
  fromRankId: string | null;
};

type RowDraft = {
  marks: number | null;
  absent: boolean;
  reviewNotes: string;
};

type ResultDraft = Record<string, RowDraft>;

export default function EventDetailClient({
  viewerRole,
  event,
  applications,
  gradings,
}: {
  viewerRole: DojoRole;
  event: Event;
  applications: Application[];
  gradings: Grading[];
}) {
  const isCancelled = !!event.cancelledAt;
  const isPublished = !!event.resultsPublishedAt;
  const isOwner = viewerRole === "DOJO_OWNER";

  // Cancelled events are always read-only. Published events are read-only for
  // everyone except the Dojo Owner, who can amend marks after the fact.
  const readOnly = isCancelled || (isPublished && !isOwner);

  const enrolled = applications.filter((a) => a.status === "APPROVED" || a.status === "CANCELLED");

  const initialDraft: ResultDraft = useMemo(() => {
    const m: ResultDraft = {};
    for (const a of enrolled) {
      const g = gradings.find((x) => x.memberId === a.memberId);
      m[a.memberId] = {
        marks: g?.marks ?? null,
        absent: g?.result === "ABSENT",
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

      <EventHeaderCard event={event} readOnly={readOnly || isPublished} />

      {isCancelled && (
        <Banner kind="muted">
          Cancelled on {fmtDateTime(event.cancelledAt!)}
          {event.cancelReason ? ` — ${event.cancelReason}` : ""}.
        </Banner>
      )}
      {isPublished && !isOwner && (
        <Banner kind="ok">
          Results published on {fmtDateTime(event.resultsPublishedAt!)}. No further edits allowed.
        </Banner>
      )}
      {isPublished && isOwner && (
        <Banner kind="owner">
          Results published on {fmtDateTime(event.resultsPublishedAt!)}. As Dojo Head, you can still amend marks.
        </Banner>
      )}

      <ResultsSection
        applications={enrolled}
        draft={draft}
        setDraft={setDraft}
        eventId={event.id}
        readOnly={readOnly}
        isPublished={isPublished}
        isOwner={isOwner}
      />
    </>
  );
}

// ─── Header (editable details, cancel) ───────────────────────────────────────

function EventHeaderCard({ event, readOnly }: { event: Event; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);

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
            <SmallBtn onClick={() => setEditing(true)} icon={<CalendarSync size={12} />} variant="ghost">
              Reschedule
            </SmallBtn>
          </div>
        )}
      </div>

      {editing && <EditDialog event={event} onClose={() => setEditing(false)} />}
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
    <Modal title="Reschedule belt test" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-zinc-500">
          Belt tests can't be cancelled — pick a new date and time for the test.
          Enrolled candidates will be notified of the change.
        </p>
        <Field label="Event name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="New date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} required />
          </Field>
          <Field label="New time">
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

// ─── Per-candidate result form + draft/publish ──────────────────────────────

function ResultsSection({
  applications,
  draft,
  setDraft,
  eventId,
  readOnly,
  isPublished,
  isOwner,
}: {
  applications: Application[];
  draft: ResultDraft;
  setDraft: (next: ResultDraft) => void;
  eventId: string;
  readOnly: boolean;
  isPublished: boolean;
  isOwner: boolean;
}) {
  const [savingDraft, startSavingDraft] = useTransition();
  const [savingAmend, startSavingAmend] = useTransition();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const canAmendPublished = isPublished && isOwner;

  function setRow(memberId: string, patch: Partial<RowDraft>) {
    setDraft({ ...draft, [memberId]: { ...draft[memberId], ...patch } });
  }

  function buildRows() {
    return applications.map((a) => ({
      studentId: a.memberId,
      marks: draft[a.memberId].absent ? null : draft[a.memberId].marks,
      absent: draft[a.memberId].absent,
      reviewNotes: draft[a.memberId].reviewNotes,
    }));
  }

  function saveDraft() {
    setError(null);
    startSavingDraft(async () => {
      const res = await upsertDraftResultsAction({ eventId, rows: buildRows() });
      if ("error" in res) setError(res.error);
      else setSavedAt(new Date());
    });
  }

  function saveAmendments() {
    setError(null);
    startSavingAmend(async () => {
      const res = await updatePublishedMarksAction({ eventId, rows: buildRows() });
      if ("error" in res) setError(res.error);
      else {
        setSavedAt(new Date());
        window.location.reload();
      }
    });
  }

  if (applications.length === 0) {
    return (
      <section className="bg-white border border-zinc-200 rounded-sm shadow-sm mb-6 p-5">
        <p className="text-sm text-zinc-500 italic">No enrolled candidates for this test.</p>
      </section>
    );
  }

  const rowsInteractive = !readOnly || canAmendPublished;

  return (
    <section className="bg-white border border-zinc-200 rounded-sm shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Candidate results</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {readOnly && !canAmendPublished
              ? "Read only — results have been published or the test was cancelled."
              : canAmendPublished
                ? "Results are published. Any marks change will re-evaluate the pass/fail band and student rank."
                : "Enter marks (0–100). Grade + recommendation compute automatically."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-600">
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
          {!readOnly && (
            <>
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
            </>
          )}
          {canAmendPublished && (
            <SmallBtn
              onClick={saveAmendments}
              disabled={savingAmend}
              icon={savingAmend ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            >
              Save amendments
            </SmallBtn>
          )}
        </div>
      </div>

      <div className="hidden md:grid grid-cols-[1.4fr_140px_1.6fr_1.4fr] gap-3 px-5 py-2 text-[10px] tracking-widest uppercase font-bold text-zinc-500 bg-zinc-50 border-b border-zinc-200">
        <span>Candidate</span>
        <span>Marks / Absent</span>
        <span>Grade &amp; recommendation</span>
        <span>Review notes</span>
      </div>

      <ul className="divide-y divide-zinc-200">
        {applications.map((a) => {
          const row = draft[a.memberId];
          return (
            <li key={a.memberId} className="px-5 py-4 grid grid-cols-1 md:grid-cols-[1.4fr_140px_1.6fr_1.4fr] gap-3 items-start">
              <div>
                <p className="font-semibold text-sm text-zinc-900">{a.memberName}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatBeltRank(a.currentRank)}
                  {a.targetRankName && (
                    <>
                      {" → "}
                      <span className="text-accent-red font-semibold">{formatBeltRank(a.targetRankName)}</span>
                    </>
                  )}
                </p>
                {a.status === "CANCELLED" && (
                  <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">
                    Was cancelled
                  </p>
                )}
              </div>

              <MarksInput
                value={row?.marks ?? null}
                absent={row?.absent ?? false}
                onMarks={(v) => setRow(a.memberId, { marks: v })}
                onAbsent={(v) => setRow(a.memberId, { absent: v, marks: v ? null : row?.marks ?? null })}
                disabled={!rowsInteractive}
              />

              <GradeBadge
                marks={row?.marks ?? null}
                absent={row?.absent ?? false}
                doubleRankName={a.doubleRankName}
              />

              <textarea
                value={row?.reviewNotes ?? ""}
                onChange={(e) => setRow(a.memberId, { reviewNotes: e.target.value })}
                placeholder="Review notes (optional) — shared with the student on publish."
                rows={2}
                disabled={!rowsInteractive}
                className={`${input} disabled:bg-zinc-50 disabled:text-zinc-500`}
              />
            </li>
          );
        })}
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

function MarksInput({
  value,
  absent,
  onMarks,
  onAbsent,
  disabled,
}: {
  value: number | null;
  absent: boolean;
  onMarks: (v: number | null) => void;
  onAbsent: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        inputMode="numeric"
        value={absent ? "" : value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onMarks(null);
            return;
          }
          const n = Number(raw);
          if (Number.isNaN(n)) return;
          onMarks(Math.max(0, Math.min(100, Math.round(n))));
        }}
        placeholder="0–100"
        disabled={disabled || absent}
        className={`${input} disabled:bg-zinc-50 disabled:text-zinc-400 w-full`}
        aria-label="Marks"
      />
      <label className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-zinc-500 select-none">
        <input
          type="checkbox"
          checked={absent}
          onChange={(e) => onAbsent(e.target.checked)}
          disabled={disabled}
          className="rounded-sm border-zinc-300 text-accent-red focus:ring-accent-red disabled:opacity-40"
        />
        Absent
      </label>
    </div>
  );
}

function GradeBadge({
  marks,
  absent,
  doubleRankName,
}: {
  marks: number | null;
  absent: boolean;
  doubleRankName: string | null;
}) {
  if (absent) {
    return (
      <div className="flex items-start">
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border bg-zinc-50 text-zinc-600 border-zinc-200">
          Absent · No score
        </span>
      </div>
    );
  }
  if (marks == null) {
    return (
      <div className="text-[11px] text-zinc-400 italic pt-1">Awaiting marks…</div>
    );
  }
  const band = bandForMarks(marks);
  const isDouble = marksEarnDoublePromotion(marks);
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border w-max ${band.color}`}>
        {band.letter} · {band.remark}
      </span>
      <span className="text-[11px] text-zinc-600">
        {band.recommendation}
      </span>
      {isDouble && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700">
          <ChevronsUp size={12} />
          {doubleRankName
            ? `Skips a rank → ${doubleRankName}`
            : "Already at the top rank — single promotion"}
        </span>
      )}
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
        The Dojo Head can still amend marks afterwards.
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

function Banner({ kind, children }: { kind: "muted" | "ok" | "owner"; children: React.ReactNode }) {
  const cls =
    kind === "ok"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : kind === "owner"
        ? "bg-amber-50 border-amber-200 text-amber-800"
        : "bg-zinc-50 border-zinc-200 text-zinc-700";
  return <div className={`border rounded-sm px-4 py-3 mb-6 text-sm ${cls}`}>{children}</div>;
}

function fmtDateTime(s: string): string {
  const d = new Date(s);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" ,
 timeZone: DEFAULT_TIME_ZONE,
})} · ${d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true ,
 timeZone: DEFAULT_TIME_ZONE,
})}`;
}
