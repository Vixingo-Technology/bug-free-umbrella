"use client";

import { useMemo, useState, useTransition } from "react";
import {
    ArrowRightLeft,
    Check,
    X,
    AlertTriangle,
    Loader2,
    Clock,
    ShieldAlert,
} from "lucide-react";
import {
    approveTransferAction,
    denyTransferAction,
} from "@/app/portal/admin/transfers/actions";

type Row = {
    id: string;
    status: "PENDING_PAYMENT" | "AWAITING_DOJO" | "AWAITING_ADMIN" | "AWAITING_NEW_DOJO" | "APPROVED" | "DENIED" | "CANCELLED";
    dojoDecision: "PENDING" | "APPROVED" | "REJECTED";
    reason: string | null;
    dojoNote: string | null;
    adminNote: string | null;
    createdAt: string;
    paidAt: string | null;
    dojoActedAt: string | null;
    adminActedAt: string | null;
    student: { user: { id: string; fullName: string; email: string; avatarUrl: string | null } };
    fromDojo: { id: string; name: string; city: string | null };
    toDojo:   { id: string; name: string; city: string | null };
    dojoActedBy:  { id: string; fullName: string } | null;
    adminActedBy: { id: string; fullName: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
    PENDING_PAYMENT: "Awaiting payment",
    AWAITING_DOJO: "Awaiting dojo clearance",
    AWAITING_ADMIN: "Awaiting your decision",
    AWAITING_NEW_DOJO: "Awaiting new dojo acceptance",
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
    kind: "approve" | "deny";
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
                    ? await approveTransferAction(row.id, note)
                    : await denyTransferAction(row.id, note);
            if (res && "error" in res && res.error) {
                setError(res.error);
                return;
            }
            onClose();
        });
    }

    const isDeny = kind === "deny";
    const dojoRejected = row.dojoDecision === "REJECTED";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-zinc-900">
                    {isDeny ? "Deny transfer" : "Approve transfer"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                    {row.student.user.fullName}: {row.fromDojo.name} → {row.toDojo.name}
                </p>

                {!isDeny && dojoRejected && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                        <ShieldAlert size={14} className="mt-0.5" />
                        <div>
                            The current dojo <strong>rejected</strong> this clearance. Approving now overrides their decision.
                            {row.dojoNote ? <div className="mt-1 italic">"{row.dojoNote}"</div> : null}
                        </div>
                    </div>
                )}

                <label className="block text-xs font-semibold text-zinc-700 mt-5 mb-2">
                    {isDeny ? "Reason (required)" : "Admin note (optional)"}
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-accent-red"
                    placeholder={
                        isDeny
                            ? "Why are you denying this transfer?"
                            : "Any internal note"
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
                        disabled={isPending || (isDeny && !note.trim())}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${
                            isDeny ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                    >
                        {isPending ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Working…
                            </span>
                        ) : isDeny ? (
                            "Deny transfer"
                        ) : (
                            "Approve transfer"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RequestCard({
    row,
    onAct,
}: {
    row: Row;
    onAct: (row: Row, kind: "approve" | "deny") => void;
}) {
    const canAct = row.status === "AWAITING_ADMIN";
    return (
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">
                        {row.student.user.fullName}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{row.student.user.email}</div>

                    <div className="text-sm text-zinc-700 mt-3 flex items-center gap-1.5">
                        <span>{row.fromDojo.name}</span>
                        <ArrowRightLeft size={12} className="text-zinc-400" />
                        <span className="font-semibold">{row.toDojo.name}</span>
                    </div>

                    {row.reason && (
                        <div className="text-xs text-zinc-600 mt-2 italic">"{row.reason}"</div>
                    )}
                    {row.dojoNote && (
                        <div className={`text-xs mt-2 ${row.dojoDecision === "REJECTED" ? "text-red-700" : "text-emerald-700"}`}>
                            <span className="font-semibold">
                                Dojo{" "}
                                {row.dojoDecision === "REJECTED"
                                    ? "rejected"
                                    : "cleared"}
                                {row.dojoActedBy ? ` (${row.dojoActedBy.fullName})` : ""}:
                            </span>{" "}
                            {row.dojoNote}
                        </div>
                    )}
                    {row.adminNote && (
                        <div className="text-xs text-zinc-600 mt-2">
                            <span className="font-semibold text-zinc-700">Admin note:</span>{" "}
                            {row.adminNote}
                        </div>
                    )}
                    <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
                        <Clock size={11} /> {new Date(row.createdAt).toLocaleString("en-GB")}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusPill status={row.status} />
                    {canAct && (
                        <div className="flex items-center gap-2 mt-1">
                            <button
                                onClick={() => onAct(row, "approve")}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold"
                            >
                                <Check size={12} /> Approve
                            </button>
                            <button
                                onClick={() => onAct(row, "deny")}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 px-3 py-1.5 text-xs font-semibold"
                            >
                                <X size={12} /> Deny
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminTransfersClient({ requests }: { requests: Row[] }) {
    const [tab, setTab] = useState<"pending" | "all">("pending");
    const [dialog, setDialog] = useState<{ row: Row; kind: "approve" | "deny" } | null>(null);

    const pending = useMemo(
        () => requests.filter((r) => r.status === "AWAITING_ADMIN"),
        [requests],
    );

    const shown = tab === "pending" ? pending : requests;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100">
                <button
                    onClick={() => setTab("pending")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 ${
                        tab === "pending"
                            ? "border-accent-red text-zinc-900"
                            : "border-transparent text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                    Awaiting admin ({pending.length})
                </button>
                <button
                    onClick={() => setTab("all")}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 ${
                        tab === "all"
                            ? "border-accent-red text-zinc-900"
                            : "border-transparent text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                    All ({requests.length})
                </button>
            </div>

            {shown.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
                    No transfer requests {tab === "pending" ? "awaiting your decision" : "yet"}.
                </div>
            ) : (
                <div className="space-y-3">
                    {shown.map((r) => (
                        <RequestCard
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
        </div>
    );
}
