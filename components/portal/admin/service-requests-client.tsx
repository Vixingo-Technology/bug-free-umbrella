"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, Loader2, ShieldX, XCircle } from "lucide-react";
import {
    approveServiceByAdminAction,
    denyServiceByAdminAction,
} from "@/app/portal/admin/service-requests/actions";
import { formatDate } from "@/lib/format/datetime";

type Status = "PENDING_PAYMENT" | "AWAITING_DOJO" | "AWAITING_ADMIN" | "APPROVED" | "DENIED" | "CANCELLED";

type Request = {
    id: string;
    status: Status;
    dojoDecision: "PENDING" | "APPROVED" | "REJECTED";
    reason: string | null;
    dojoNote: string | null;
    adminNote: string | null;
    fee: string;
    finalAmount: string;
    couponCode: string | null;
    createdAt: string;
    payload: Record<string, unknown> | null;
    service: { name: string; slug: string; handler: string };
    student: { user: { fullName: string; avatarUrl: string | null } };
    dojo: { id: string; name: string; city: string | null };
    dojoActedBy: { fullName: string } | null;
};

const STATUS_TONE: Record<Status, string> = {
    PENDING_PAYMENT: "bg-zinc-100 text-zinc-700",
    AWAITING_DOJO: "bg-amber-100 text-amber-800",
    AWAITING_ADMIN: "bg-blue-100 text-blue-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    DENIED: "bg-red-100 text-red-800",
    CANCELLED: "bg-zinc-100 text-zinc-500",
};

const STATUS_LABEL: Record<Status, string> = {
    PENDING_PAYMENT: "Awaiting payment",
    AWAITING_DOJO: "With dojo",
    AWAITING_ADMIN: "Needs your action",
    APPROVED: "Approved",
    DENIED: "Denied",
    CANCELLED: "Cancelled",
};

export default function AdminServiceRequestsClient({ requests }: { requests: Request[] }) {
    const [openId, setOpenId] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function approve(id: string) {
        setError(null);
        startTransition(async () => {
            const res = await approveServiceByAdminAction(id, note);
            if (res && "error" in res && res.error) setError(res.error);
            else { setOpenId(null); setNote(""); }
        });
    }

    function deny(id: string) {
        setError(null);
        if (!note.trim()) {
            setError("A denial note is required.");
            return;
        }
        startTransition(async () => {
            const res = await denyServiceByAdminAction(id, note);
            if (res && "error" in res && res.error) setError(res.error);
            else { setOpenId(null); setNote(""); }
        });
    }

    if (requests.length === 0) {
        return (
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
                <ShieldX className="mx-auto mb-3 text-zinc-300" size={32} />
                No service requests yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {requests.map((r) => {
                const isOpen = openId === r.id;
                const canAct = r.status === "AWAITING_ADMIN";
                const payload = (r.payload as { requestedRank?: string; currentRank?: string } | null) ?? {};
                return (
                    <div key={r.id} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                        <button
                            onClick={() => {
                                setOpenId(isOpen ? null : r.id);
                                setNote("");
                                setError(null);
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {r.student.user.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={r.student.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-zinc-500">
                                        {r.student.user.fullName.slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                    {r.student.user.fullName}
                                    <span className="text-zinc-400 font-normal"> · {r.service.name}</span>
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                    {r.dojo.name}{r.dojo.city ? `, ${r.dojo.city}` : ""}
                                    {payload.requestedRank ? ` — requests ${payload.requestedRank}` : ""}
                                    {" · "}
                                    {formatDate(r.createdAt)}
                                </p>
                            </div>
                            {r.dojoDecision === "REJECTED" && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                                    Dojo rejected
                                </span>
                            )}
                            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${STATUS_TONE[r.status]}`}>
                                {STATUS_LABEL[r.status]}
                            </span>
                            <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isOpen && (
                            <div className="border-t border-zinc-100 p-4 bg-zinc-50/50 space-y-3">
                                <div className="grid gap-2 text-xs text-zinc-700 sm:grid-cols-2">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Fee</span>
                                        <span>৳{Number(r.fee).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                        <span>Total paid</span>
                                        <span>
                                            {Number(r.finalAmount) === 0 ? "Free" : `৳${Number(r.finalAmount).toLocaleString()}`}
                                            {r.couponCode ? ` (${r.couponCode})` : ""}
                                        </span>
                                    </div>
                                    {payload.currentRank && (
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Current rank</span>
                                            <span>{payload.currentRank}</span>
                                        </div>
                                    )}
                                    {payload.requestedRank && (
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">Requesting</span>
                                            <span className="font-semibold">{payload.requestedRank}</span>
                                        </div>
                                    )}
                                </div>

                                {r.reason && (
                                    <div className="p-3 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-700">
                                        <span className="font-semibold text-zinc-900">Student reason:</span> {r.reason}
                                    </div>
                                )}
                                {r.dojoNote && (
                                    <div className={`p-3 rounded-lg text-xs ${r.dojoDecision === "REJECTED" ? "bg-red-50 border border-red-200 text-red-900" : "bg-amber-50 border border-amber-200 text-amber-900"}`}>
                                        <span className="font-semibold">
                                            {r.dojoDecision === "REJECTED" ? "Dojo rejected:" : "Dojo note:"}
                                        </span>{" "}
                                        {r.dojoNote}
                                        {r.dojoActedBy ? <span className="opacity-70"> — {r.dojoActedBy.fullName}</span> : null}
                                    </div>
                                )}
                                {r.adminNote && (
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                                        <span className="font-semibold">Your note:</span> {r.adminNote}
                                    </div>
                                )}

                                {canAct && (
                                    <>
                                        <textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            rows={3}
                                            placeholder="Note (required to deny; optional to approve)…"
                                            className="w-full rounded-xl border border-zinc-200 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30 text-sm px-3 py-2"
                                        />
                                        {error && (
                                            <div className="flex items-center gap-2 p-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
                                                <XCircle size={12} />
                                                {error}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => approve(r.id)}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl disabled:opacity-50"
                                            >
                                                {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => deny(r.id)}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl disabled:opacity-50"
                                            >
                                                <XCircle size={12} />
                                                Deny
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
