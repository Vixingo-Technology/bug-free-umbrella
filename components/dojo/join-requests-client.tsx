"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
    Check,
    Clock,
    Mail,
    Phone,
    Shield,
    Loader2,
    AlertCircle,
    UserRound,
} from "lucide-react";
import { acceptJoinRequestAction } from "@/app/portal/dojo/join-requests/actions";
import { beltStepsFromWhite } from "@/lib/joining";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";

type Request = {
    id: string;
    requestedRank: string | null;
    createdAt: string;
    user: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
        avatarUrl: string | null;
        memberNumber: string | null;
        createdAt: string;
    };
};

type Recent = {
    id: string;
    assignedRank: string | null;
    joinedAt: string | null;
    user: { id: string; fullName: string; avatarUrl: string | null };
};

export default function DojoJoinRequestsClient({
    requests,
    recentlyJoined,
    ranks,
    pastBeltFeePerRankBDT,
}: {
    requests: Request[];
    recentlyJoined: Recent[];
    ranks: string[];
    pastBeltFeePerRankBDT: number;
}) {
    if (requests.length === 0 && recentlyJoined.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-zinc-100 bg-white">
                <Clock size={40} className="text-zinc-200 mb-3" />
                <p className="text-sm font-semibold text-zinc-900">No pending join requests</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    When a new student pays the JKA fee and picks your dojo, they&apos;ll show up here for you to confirm.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-500">
                        Pending — {requests.length}
                    </h2>
                </div>
                {requests.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nothing to review right now.</p>
                ) : (
                    <div className="space-y-4">
                        {requests.map((r) => (
                            <RequestCard
                                key={r.id}
                                request={r}
                                ranks={ranks}
                                pastBeltFeePerRankBDT={pastBeltFeePerRankBDT}
                            />
                        ))}
                    </div>
                )}
            </section>

            {recentlyJoined.length > 0 && (
                <section>
                    <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-500 mb-4">
                        Recently joined
                    </h2>
                    <div className="rounded-2xl border border-zinc-100 bg-white divide-y divide-zinc-100">
                        {recentlyJoined.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 rounded-full bg-zinc-100 overflow-hidden flex items-center justify-center">
                                    {r.user.avatarUrl ? (
                                        <Image src={r.user.avatarUrl} alt="" width={36} height={36} />
                                    ) : (
                                        <UserRound size={16} className="text-zinc-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-zinc-900 truncate">{r.user.fullName}</p>
                                    <p className="text-xs text-zinc-500">
                                        {r.assignedRank ?? "White Belt"}
                                        {r.joinedAt ? ` · joined ${new Date(r.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" ,
 timeZone: DEFAULT_TIME_ZONE,
})}` : ""}
                                    </p>
                                </div>
                                <Check size={16} className="text-emerald-500" />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function RequestCard({
    request,
    ranks,
    pastBeltFeePerRankBDT,
}: {
    request: Request;
    ranks: string[];
    pastBeltFeePerRankBDT: number;
}) {
    const [rank, setRank] = useState<string>(request.requestedRank ?? "White Belt");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const steps = beltStepsFromWhite(rank);
    const fee = steps * pastBeltFeePerRankBDT;

    function handleAccept() {
        setError(null);
        startTransition(async () => {
            const res = await acceptJoinRequestAction(request.id, rank);
            if (res?.error) setError(res.error);
        });
    }

    return (
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
            <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-zinc-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {request.user.avatarUrl ? (
                        <Image src={request.user.avatarUrl} alt="" width={44} height={44} />
                    ) : (
                        <UserRound size={18} className="text-zinc-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                        <p className="text-base font-bold text-zinc-900">{request.user.fullName}</p>
                        {request.user.memberNumber && (
                            <span className="text-[11px] font-mono text-zinc-400">
                                {request.user.memberNumber}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                        {request.user.email && (
                            <span className="inline-flex items-center gap-1">
                                <Mail size={11} />
                                {request.user.email}
                            </span>
                        )}
                        {request.user.phone && (
                            <span className="inline-flex items-center gap-1">
                                <Phone size={11} />
                                {request.user.phone}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            Requested {new Date(request.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" ,
 timeZone: DEFAULT_TIME_ZONE,
})}
                        </span>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-zinc-500">
                            <Shield size={12} />
                            Student requested: {request.requestedRank ?? "White Belt"}
                        </div>

                        <label className="mt-3 block">
                            <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 block mb-1">
                                Confirm rank
                            </span>
                            <select
                                value={rank}
                                onChange={(e) => setRank(e.target.value)}
                                disabled={pending}
                                className="w-full sm:w-auto bg-white border border-zinc-200 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-accent-red"
                            >
                                {ranks.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </label>

                        {rank !== "White Belt" && (
                            <p className="mt-2 text-xs text-zinc-600">
                                Past-belt fee: ৳{fee.toLocaleString()}{" "}
                                <span className="text-zinc-400">
                                    ({steps} × ৳{pastBeltFeePerRankBDT.toLocaleString()})
                                </span>
                                — student will be prompted to pay after acceptance.
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
                            <AlertCircle size={12} />
                            {error}
                        </div>
                    )}

                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={pending}
                            className="inline-flex items-center gap-2 bg-accent-red hover:bg-zinc-900 text-white font-bold tracking-widest uppercase text-xs px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                            {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Accept & confirm rank
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
