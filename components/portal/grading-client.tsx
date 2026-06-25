"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import {
  Award, Calendar, MapPin, CheckCircle2, Clock,
  XCircle, Loader2, AlertCircle, FileText, Send,
} from "lucide-react";
import {
  requestBeltTestAction,
  withdrawRequestAction,
} from "@/app/portal/grading/actions";

type RequestKind = "pending" | "scheduled" | "declined" | "cancelled";

interface Props {
  member: { fullName: string; currentRank: string } | null;
  currentRequest:
    | { kind: RequestKind; row: any }
    | null;
  myGradings: any[];
  nextRankName: string | null;
  blockReason: string | null;
}

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-amber-50 text-amber-600",
  APPROVED:  "bg-emerald-50 text-emerald-600",
  REJECTED:  "bg-red-50 text-red-600",
};

export default function GradingClient({
  member, currentRequest, myGradings, nextRankName, blockReason,
}: Props) {
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequest() {
    setFeedback(null);
    startTransition(async () => {
      const res = await requestBeltTestAction(notes);
      if ("error" in res) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({ type: "success", message: "Request submitted. Your dojo will be in touch." });
        setNotes("");
      }
    });
  }

  function handleWithdraw(id: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await withdrawRequestAction(id);
      if ("error" in res) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({ type: "success", message: "Request withdrawn." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Belt grading</h1>
        <p className="text-sm text-zinc-500">
          Current rank: <span className="font-semibold text-zinc-700">{member?.currentRank ?? "—"}</span>
        </p>
      </header>

      {/* Top card: request state */}
      <TiltCard className="p-6">
        {currentRequest?.kind === "pending" && (
          <PendingCard row={currentRequest.row} onWithdraw={handleWithdraw} disabled={isPending} />
        )}
        {currentRequest?.kind === "scheduled" && (
          <ScheduledCard row={currentRequest.row} />
        )}
        {currentRequest?.kind === "declined" && (
          <DeclinedCard
            row={currentRequest.row}
            nextRankName={nextRankName}
            blockReason={blockReason}
            notes={notes}
            setNotes={setNotes}
            onRequest={handleRequest}
            disabled={isPending}
          />
        )}
        {currentRequest?.kind === "cancelled" && (
          <CancelledCard
            row={currentRequest.row}
            nextRankName={nextRankName}
            blockReason={blockReason}
            notes={notes}
            setNotes={setNotes}
            onRequest={handleRequest}
            disabled={isPending}
          />
        )}
        {!currentRequest && (
          <NoRequestCard
            nextRankName={nextRankName}
            blockReason={blockReason}
            notes={notes}
            setNotes={setNotes}
            onRequest={handleRequest}
            disabled={isPending}
          />
        )}

        <AnimatePresence>
          {feedback && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 text-sm font-medium ${
                feedback.type === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {feedback.message}
            </motion.p>
          )}
        </AnimatePresence>
      </TiltCard>

      {/* History */}
      <section>
        <h2 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
          <FileText size={14} /> Grading history
        </h2>
        {myGradings.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No grading history yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 bg-white rounded-sm border border-zinc-200">
            {myGradings.map((g: any) => (
              <li key={g.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {g.fromRank?.name ?? "—"} → {g.toRank?.name ?? "—"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(g.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {g.gradingEvent?.name ? ` · ${g.gradingEvent.name}` : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${statusColors[g.result] ?? ""}`}>
                    {g.result}
                  </span>
                </div>
                {g.notes && (
                  <p className="text-xs text-zinc-600 italic border-l-2 border-zinc-200 pl-3">
                    {g.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NoRequestCard({
  nextRankName, blockReason, notes, setNotes, onRequest, disabled,
}: {
  nextRankName: string | null;
  blockReason: string | null;
  notes: string;
  setNotes: (s: string) => void;
  onRequest: () => void;
  disabled: boolean;
}) {
  const blocked = blockReason !== null || nextRankName === null;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-accent-red/10 text-accent-red">
          <Award size={18} />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-900">Ready to test?</h2>
          <p className="text-sm text-zinc-500">
            {nextRankName
              ? <>Your next rank is <span className="font-semibold text-zinc-700">{nextRankName}</span>.</>
              : blockReason ?? "Loading eligibility…"}
          </p>
        </div>
      </div>

      {!blocked && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Anything you want your dojo to know (optional)"
            className="w-full text-sm border border-zinc-200 rounded-sm px-3 py-2 focus:outline-none focus:border-accent-red"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={onRequest}
            disabled={disabled}
            className="inline-flex items-center gap-2 bg-accent-red text-white text-xs font-bold tracking-widest uppercase px-4 py-2.5 rounded-sm hover:bg-accent-red/90 disabled:opacity-40"
          >
            {disabled ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Request belt test{nextRankName ? ` for ${nextRankName}` : ""}
          </button>
        </>
      )}
      {blocked && blockReason && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-sm">
          <AlertCircle size={14} className="mt-0.5" />
          <span>{blockReason}</span>
        </div>
      )}
    </div>
  );
}

function PendingCard({ row, onWithdraw, disabled }: { row: any; onWithdraw: (id: string) => void; disabled: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
          <Clock size={11} /> Waiting on your dojo
        </span>
      </div>
      <h2 className="text-base font-bold text-zinc-900">
        Request submitted for {row.targetRank?.name ?? "next rank"}
      </h2>
      <p className="text-xs text-zinc-500">
        Sent {new Date(row.appliedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </p>
      {row.notes && <p className="text-sm text-zinc-600 italic">&quot;{row.notes}&quot;</p>}
      <button
        type="button"
        onClick={() => onWithdraw(row.id)}
        disabled={disabled}
        className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-600 border border-zinc-300 px-3 py-2 rounded-sm hover:border-accent-red hover:text-accent-red disabled:opacity-40"
      >
        <XCircle size={12} /> Withdraw request
      </button>
    </div>
  );
}

function ScheduledCard({ row }: { row: any }) {
  const ev = row.gradingEvent;
  const date = new Date(ev.eventDate);
  return (
    <div className="space-y-3">
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
        <CheckCircle2 size={11} /> Scheduled
      </span>
      <h2 className="text-base font-bold text-zinc-900">
        {row.targetRank?.name ?? "Belt"} test — {ev.name}
      </h2>
      <div className="space-y-1 text-sm text-zinc-600">
        <p className="flex items-center gap-2">
          <Calendar size={13} />
          {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          {" · "}
          {date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}
        </p>
        {ev.location && (
          <p className="flex items-center gap-2">
            <MapPin size={13} /> {ev.location}
          </p>
        )}
      </div>
    </div>
  );
}

function DeclinedCard({
  row, nextRankName, blockReason, notes, setNotes, onRequest, disabled,
}: {
  row: any;
  nextRankName: string | null;
  blockReason: string | null;
  notes: string;
  setNotes: (s: string) => void;
  onRequest: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
        <XCircle size={11} /> Declined
      </span>
      <div>
        <h2 className="text-base font-bold text-zinc-900">Previous request declined</h2>
        {row.declineReason && (
          <p className="text-sm text-zinc-600 italic mt-1">&quot;{row.declineReason}&quot;</p>
        )}
      </div>
      <hr className="border-zinc-200" />
      <NoRequestCard
        nextRankName={nextRankName}
        blockReason={blockReason}
        notes={notes}
        setNotes={setNotes}
        onRequest={onRequest}
        disabled={disabled}
      />
    </div>
  );
}

function CancelledCard({
  row, nextRankName, blockReason, notes, setNotes, onRequest, disabled,
}: {
  row: any;
  nextRankName: string | null;
  blockReason: string | null;
  notes: string;
  setNotes: (s: string) => void;
  onRequest: () => void;
  disabled: boolean;
}) {
  const ev = row.gradingEvent;
  return (
    <div className="space-y-4">
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-1 rounded-full">
        <XCircle size={11} /> Cancelled
      </span>
      <div>
        <h2 className="text-base font-bold text-zinc-900">
          Belt test cancelled{ev?.name ? ` — ${ev.name}` : ""}
        </h2>
        {ev?.cancelReason && (
          <p className="text-sm text-zinc-600 italic mt-1">&quot;{ev.cancelReason}&quot;</p>
        )}
        <p className="text-xs text-zinc-500 mt-1">
          You can request a new belt test below.
        </p>
      </div>
      <hr className="border-zinc-200" />
      <NoRequestCard
        nextRankName={nextRankName}
        blockReason={blockReason}
        notes={notes}
        setNotes={setNotes}
        onRequest={onRequest}
        disabled={disabled}
      />
    </div>
  );
}
