"use client";

import { useState, useTransition } from "react";
import {
    ArrowRightLeft,
    Check,
    X,
    AlertTriangle,
    Loader2,
    Clock,
    Mail,
    Phone,
    UserPlus,
    ShieldCheck,
} from "lucide-react";
import {
    approveClearanceAction,
    rejectClearanceAction,
    acceptJoinRequestAction,
} from "@/app/portal/dojo/transfers/actions";
import { displayEmail } from "@/lib/format/email";
import { formatBeltRank } from "@/lib/constants";

type Row = {
    id: string;
    status: "PENDING_PAYMENT" | "AWAITING_DOJO" | "AWAITING_ADMIN" | "AWAITING_NEW_DOJO" | "APPROVED" | "DENIED" | "CANCELLED";
    dojoDecision: "PENDING" | "APPROVED" | "REJECTED";
    reason: string | null;
    dojoNote: string | null;
    adminNote: string | null;
    createdAt: string;
    paidAt: string | null;
    student: { user: { id: string; fullName: string; avatarUrl: string | null } };
    toDojo: { id: string; name: string; city: string | null };
    fromDojo: { id: string; name: string; city: string | null };
};

type IncomingRow = {
    id: string;
    status: "AWAITING_NEW_DOJO" | "APPROVED" | (string & {});
    reason: string | null;
    adminNote: string | null;
    assignedRank: string | null;
    createdAt: string;
    adminActedAt: string | null;
    newDojoActedAt: string | null;
    student: {
        currentRank: string;
        user: {
            id: string;
            fullName: string;
            email: string | null;
            contactEmail: string | null;
            phone: string | null;
            avatarUrl: string | null;
        };
    };
    fromDojo: { id: string; name: string; city: string | null };
    toDojo: { id: string; name: string; city: string | null };
};

type BeltRank = { id: string; name: string; orderIndex: number };

const STATUS_LABEL: Record<string, string> = {
    PENDING_PAYMENT: "Awaiting payment",
    AWAITING_DOJO: "Awaiting your clearance",
    AWAITING_ADMIN: "Awaiting JKA admin",
    AWAITING_NEW_DOJO: "Awaiting your acceptance",
    APPROVED: "Approved",
    DENIED: "Denied",
    CANCELLED: "Cancelled",
};

const STATUS_TONE: Record<string, string> = {
    PENDING_PAYMENT: "bg-zinc-100 text-zinc-700 border-zinc-200",
    AWAITING_DOJO: "bg-amber-50 text-amber-800 border-amber-200",
    AWAITING_ADMIN: "bg-blue-50 text-blue-800 border-blue-200",
    AWAITING_NEW_DOJO: "bg-violet-50 text-violet-800 border-violet-200",
    APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    DENIED: "bg-red-50 text-red-800 border-red-200",
    CANCELLED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function StatusPill({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_TONE[status] ?? "bg-zinc-100"}`}>
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

function DecisionDialog({
    row,
    kind,
    onClose,
}: {
    row: Row;
    kind: "approve" | "reject";
    onClose: () => void;
}) {
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function submit() {
        setError(null);
        startTransition(async () => {
            const res =
                kind === "approve"
                    ? await approveClearanceAction(row.id, note)
                    : await rejectClearanceAction(row.id, note);
            if (res && "error" in res && res.error) {
                setError(res.error);
                return;
            }
            onClose();
        });
    }

    const isReject = kind === "reject";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-zinc-900">
                    {isReject ? "Reject clearance" : "Clear this transfer"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                    {row.student.user.fullName} → {row.toDojo.name}
                </p>

                <label className="block text-xs font-semibold text-zinc-700 mt-5 mb-2">
                    {isReject ? "Reason (required)" : "Note (optional)"}
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-accent-red"
                    placeholder={
                        isReject
                            ? "Why can't you clear this student?"
                            : "Any note for JKA admin (optional)"
                    }
                />

                {error && (
                    <div className="mt-3 text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={isPending || (isReject && !note.trim())}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${
                            isReject ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                    >
                        {isPending ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Working…
                            </span>
                        ) : isReject ? (
                            "Reject clearance"
                        ) : (
                            "Approve clearance"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AcceptJoinDialog({
    row,
    beltRanks,
    onClose,
}: {
    row: IncomingRow;
    beltRanks: BeltRank[];
    onClose: () => void;
}) {
    const [rank, setRank] = useState<string>(row.student.currentRank || "");
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function submit() {
        setError(null);
        if (!rank) {
            setError("Please pick a rank for this student.");
            return;
        }
        startTransition(async () => {
            const res = await acceptJoinRequestAction(row.id, rank, note);
            if (res && "error" in res && res.error) {
                setError(res.error);
                return;
            }
            onClose();
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <UserPlus size={18} className="text-violet-600" /> Accept join request
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                    {row.student.user.fullName} — transferring from {row.fromDojo.name}
                </p>

                <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-xs space-y-1.5">
                    {(displayEmail(row.student.user) || row.student.user.email) && (
                        <div className="flex items-center gap-1.5 text-zinc-700">
                            <Mail size={12} /> {displayEmail(row.student.user) || row.student.user.email}
                        </div>
                    )}
                    {row.student.user.phone && (
                        <div className="flex items-center gap-1.5 text-zinc-700">
                            <Phone size={12} /> {row.student.user.phone}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-zinc-500">
                        <ShieldCheck size={12} /> Current rank on file: {formatBeltRank(row.student.currentRank)}
                    </div>
                </div>

                <label className="block text-xs font-semibold text-zinc-700 mt-5 mb-2">
                    Set rank for this student
                </label>
                <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-accent-red"
                >
                    <option value="">Select a rank…</option>
                    {beltRanks.map((r) => (
                        <option key={r.id} value={r.name}>
                            {formatBeltRank(r.name)}
                        </option>
                    ))}
                </select>

                <label className="block text-xs font-semibold text-zinc-700 mt-4 mb-2">
                    Note (optional)
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-accent-red"
                    placeholder="Any internal note about this student"
                />

                {error && (
                    <div className="mt-3 text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={isPending || !rank}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60"
                    >
                        {isPending ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Accepting…
                            </span>
                        ) : (
                            "Accept & set rank"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function IncomingRequestRow({
    row,
    onAct,
}: {
    row: IncomingRow;
    onAct: (row: IncomingRow) => void;
}) {
    const isActionable = row.status === "AWAITING_NEW_DOJO";
    return (
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">
                        {row.student.user.fullName}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                        <ArrowRightLeft size={12} /> From: {row.fromDojo.name}
                        {row.fromDojo.city ? ` · ${row.fromDojo.city}` : ""}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                        Rank on file:{" "}
                        <span className="font-semibold text-zinc-700">{formatBeltRank(row.student.currentRank)}</span>
                        {row.assignedRank && row.status === "APPROVED" && row.assignedRank !== row.student.currentRank && (
                            <span className="ml-1 text-zinc-400">→ set to {formatBeltRank(row.assignedRank)}</span>
                        )}
                    </div>
                    {row.reason && (
                        <div className="text-xs text-zinc-600 mt-2 italic">"{row.reason}"</div>
                    )}
                    {row.adminNote && (
                        <div className="text-xs text-zinc-500 mt-2">
                            <span className="font-semibold text-zinc-700">Admin note:</span>{" "}
                            {row.adminNote}
                        </div>
                    )}
                    <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
                        <Clock size={11} />
                        {row.adminActedAt
                            ? `Approved by admin: ${new Date(row.adminActedAt).toLocaleString("en-GB")}`
                            : new Date(row.createdAt).toLocaleString("en-GB")}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusPill status={row.status} />
                    {isActionable && (
                        <button
                            onClick={() => onAct(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 text-xs font-semibold mt-1"
                        >
                            <UserPlus size={12} /> Review & accept
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function RequestRow({
    row,
    onAct,
}: {
    row: Row;
    onAct: (row: Row, kind: "approve" | "reject") => void;
}) {
    const isActionable = row.status === "AWAITING_DOJO";
    return (
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">
                        {row.student.user.fullName}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                        <ArrowRightLeft size={12} /> Target: {row.toDojo.name}
                        {row.toDojo.city ? ` · ${row.toDojo.city}` : ""}
                    </div>
                    {row.reason && (
                        <div className="text-xs text-zinc-600 mt-2 italic">"{row.reason}"</div>
                    )}
                    {row.dojoNote && (
                        <div className="text-xs text-zinc-500 mt-2">
                            <span className="font-semibold text-zinc-700">
                                Your note:
                            </span>{" "}
                            {row.dojoNote}
                        </div>
                    )}
                    <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
                        <Clock size={11} /> {new Date(row.createdAt).toLocaleString("en-GB")}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusPill status={row.status} />
                    {isActionable && (
                        <div className="flex items-center gap-2 mt-1">
                            <button
                                onClick={() => onAct(row, "approve")}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold"
                            >
                                <Check size={12} /> Clear
                            </button>
                            <button
                                onClick={() => onAct(row, "reject")}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 px-3 py-1.5 text-xs font-semibold"
                            >
                                <X size={12} /> Reject
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DojoTransfersClient({
    requests,
    incoming,
    beltRanks,
}: {
    requests: Row[];
    incoming: IncomingRow[];
    beltRanks: BeltRank[];
}) {
    const [tab, setTab] = useState<"incoming" | "pending" | "all">(
        incoming.some((i) => i.status === "AWAITING_NEW_DOJO") ? "incoming" : "pending",
    );
    const [dialog, setDialog] = useState<{ row: Row; kind: "approve" | "reject" } | null>(null);
    const [joinDialog, setJoinDialog] = useState<IncomingRow | null>(null);

    const pending = requests.filter((r) => r.status === "AWAITING_DOJO");
    const incomingActive = incoming.filter((r) => r.status === "AWAITING_NEW_DOJO");
    const shown = tab === "pending" ? pending : requests;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100">
                <button
                    onClick={() => setTab("incoming")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 flex items-center gap-1.5 ${
                        tab === "incoming"
                            ? "border-violet-500 text-zinc-900"
                            : "border-transparent text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                    <UserPlus size={14} /> Join requests ({incomingActive.length})
                </button>
                <button
                    onClick={() => setTab("pending")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 ${
                        tab === "pending"
                            ? "border-accent-red text-zinc-900"
                            : "border-transparent text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                    Pending clearance ({pending.length})
                </button>
                <button
                    onClick={() => setTab("all")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 ${
                        tab === "all"
                            ? "border-accent-red text-zinc-900"
                            : "border-transparent text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                    All outgoing ({requests.length})
                </button>
            </div>

            {tab === "incoming" ? (
                incoming.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
                        No incoming join requests. When JKA admin approves a transfer to your
                        dojo, the student's join request will appear here.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {incoming.map((r) => (
                            <IncomingRequestRow
                                key={r.id}
                                row={r}
                                onAct={(row) => setJoinDialog(row)}
                            />
                        ))}
                    </div>
                )
            ) : shown.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
                    No {tab === "pending" ? "pending" : ""} transfer requests.
                </div>
            ) : (
                <div className="space-y-3">
                    {shown.map((r) => (
                        <RequestRow
                            key={r.id}
                            row={r}
                            onAct={(row, kind) => setDialog({ row, kind })}
                        />
                    ))}
                </div>
            )}

            {dialog && (
                <DecisionDialog
                    row={dialog.row}
                    kind={dialog.kind}
                    onClose={() => setDialog(null)}
                />
            )}
            {joinDialog && (
                <AcceptJoinDialog
                    row={joinDialog}
                    beltRanks={beltRanks}
                    onClose={() => setJoinDialog(null)}
                />
            )}
        </div>
    );
}
