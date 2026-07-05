"use client";

import { useState, useTransition } from "react";
import {
    Check,
    ChevronDown,
    ChevronUp,
    Mail,
    MapPin,
    Phone,
    User,
    X,
} from "lucide-react";
import {
    approveDojoApplicationAction,
    rejectDojoApplicationAction,
} from "@/app/actions/admin-dojo-applications";

type Trainer = {
    name?: string;
    rank?: string;
    email?: string;
    /** Legacy field from earlier form iteration — kept so old rows still render. */
    contact?: string;
};

type Application = {
    id: string;
    userId: string | null;
    dojoName: string;
    logoUrl: string | null;
    email: string;
    phone: string;
    contactName: string;
    contactRole: string;
    contactRank: string | null;
    address: string;
    latitude: number | null;
    longitude: number | null;
    interiorUrls: string[];
    trainers: Trainer[];
    status:
        | "PENDING_PAYMENT"
        | "PAID"
        | "APPROVED"
        | "REJECTED";
    paymentId: string | null;
    createdAt: string;
    updatedAt: string;
};

type Filter = Application["status"] | "ALL";

export default function DojoApplicationsClient({
    applications,
}: {
    applications: Application[];
}) {
    const [filter, setFilter] = useState<Filter>("PAID");
    const [flash, setFlash] = useState<{
        tone: "ok" | "err";
        msg: string;
    } | null>(null);

    const counts = {
        PAID: applications.filter((a) => a.status === "PAID").length,
        PENDING_PAYMENT: applications.filter(
            (a) => a.status === "PENDING_PAYMENT"
        ).length,
        APPROVED: applications.filter((a) => a.status === "APPROVED").length,
        REJECTED: applications.filter((a) => a.status === "REJECTED").length,
    };

    const visible =
        filter === "ALL"
            ? applications
            : applications.filter((a) => a.status === filter);

    return (
        <div>
            <header className="mb-8">
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                    Federation review
                </p>
                <h1 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15]">
                    Dojo applications
                </h1>
                <p className="text-zinc-600 mt-3 max-w-2xl">
                    Verify enlistment paperwork and approve new dojos. Approved
                    applications create a Dojo record and a head-instructor
                    Member automatically.
                </p>
            </header>

            <div className="flex flex-wrap items-center gap-2 mb-6">
                <FilterPill
                    active={filter === "PAID"}
                    onClick={() => setFilter("PAID")}
                    label={`Awaiting review (${counts.PAID})`}
                />
                <FilterPill
                    active={filter === "APPROVED"}
                    onClick={() => setFilter("APPROVED")}
                    label={`Approved (${counts.APPROVED})`}
                />
                <FilterPill
                    active={filter === "REJECTED"}
                    onClick={() => setFilter("REJECTED")}
                    label={`Rejected (${counts.REJECTED})`}
                />
                <FilterPill
                    active={filter === "PENDING_PAYMENT"}
                    onClick={() => setFilter("PENDING_PAYMENT")}
                    label={`Awaiting payment (${counts.PENDING_PAYMENT})`}
                />
                <FilterPill
                    active={filter === "ALL"}
                    onClick={() => setFilter("ALL")}
                    label={`All (${applications.length})`}
                />
            </div>

            {flash && (
                <div
                    className={`mb-6 rounded-md border p-3 text-sm ${
                        flash.tone === "ok"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-red-50 border-red-200 text-red-700"
                    }`}
                >
                    {flash.msg}
                </div>
            )}

            {visible.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-sm p-10 text-center text-zinc-500">
                    No applications in this view.
                </div>
            ) : (
                <ul className="space-y-4">
                    {visible.map((a) => (
                        <ApplicationRow
                            key={a.id}
                            application={a}
                            onFlash={setFlash}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function FilterPill({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-full border transition-colors ${
                active
                    ? "bg-accent-red text-white border-accent-red"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
            }`}
        >
            {label}
        </button>
    );
}

function ApplicationRow({
    application,
    onFlash,
}: {
    application: Application;
    onFlash: (f: { tone: "ok" | "err"; msg: string }) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [isPending, startTransition] = useTransition();
    const a = application;

    function approve() {
        const fd = new FormData();
        fd.append("applicationId", a.id);
        startTransition(async () => {
            const res = await approveDojoApplicationAction(fd);
            if (res.ok) {
                onFlash({
                    tone: "ok",
                    msg: `${a.dojoName} approved and added to the Dojo registry.`,
                });
            } else {
                onFlash({ tone: "err", msg: res.error });
            }
        });
    }

    function reject() {
        const fd = new FormData();
        fd.append("applicationId", a.id);
        startTransition(async () => {
            const res = await rejectDojoApplicationAction(fd);
            if (res.ok) {
                onFlash({
                    tone: "ok",
                    msg: `${a.dojoName} application rejected.`,
                });
            } else {
                onFlash({ tone: "err", msg: res.error });
            }
        });
    }

    const canActOn = a.status === "PAID" || a.status === "PENDING_PAYMENT";

    return (
        <li className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    {a.logoUrl && (
                        <button
                            type="button"
                            onClick={() => setExpanded((e) => !e)}
                            className="shrink-0 w-12 h-12 rounded-sm border border-zinc-200 overflow-hidden bg-white"
                            aria-label="View dojo photos"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={a.logoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <button
                                type="button"
                                onClick={() => setExpanded((e) => !e)}
                                className="font-serif font-bold text-lg text-zinc-900 truncate hover:text-accent-red transition-colors text-left"
                                aria-expanded={expanded}
                            >
                                {a.dojoName}
                            </button>
                            <StatusBadge status={a.status} />
                        </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                            <User size={12} />
                            {a.contactName}
                            {a.contactRank ? ` · ${a.contactRank}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Mail size={12} />
                            {a.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Phone size={12} />
                            {a.phone}
                        </span>
                        <span className="text-zinc-400">
                            Filed{" "}
                            {new Date(a.createdAt).toLocaleDateString(
                                undefined,
                                {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                }
                            )}
                        </span>
                    </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {canActOn && (
                        <>
                            <button
                                type="button"
                                onClick={approve}
                                disabled={isPending}
                                className="inline-flex items-center gap-1.5 bg-accent-red text-white px-3 py-2 text-[10px] tracking-widest uppercase font-bold hover:bg-accent-red/90 disabled:opacity-60 rounded-sm"
                            >
                                <Check size={12} />
                                Approve
                            </button>
                            <button
                                type="button"
                                onClick={reject}
                                disabled={isPending}
                                className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-600 px-3 py-2 text-[10px] tracking-widest uppercase font-bold hover:border-red-400 hover:text-red-600 disabled:opacity-60 rounded-sm"
                            >
                                <X size={12} />
                                Reject
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setExpanded((e) => !e)}
                        className="p-2 text-zinc-500 hover:text-accent-red transition-colors"
                        aria-label="Toggle details"
                    >
                        {expanded ? (
                            <ChevronUp size={16} />
                        ) : (
                            <ChevronDown size={16} />
                        )}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-zinc-200 p-5 space-y-6 text-sm">
                    {(a.logoUrl || a.interiorUrls.length > 0) && (
                        <div>
                            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3">
                                Uploaded photos
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {a.logoUrl && (
                                    <a
                                        href={a.logoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative block w-28 h-28 rounded-sm border border-zinc-200 overflow-hidden bg-white group"
                                        title="Dojo logo"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={a.logoUrl}
                                            alt={`${a.dojoName} logo`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] tracking-widest uppercase font-bold text-center py-1">
                                            Logo
                                        </span>
                                    </a>
                                )}
                                {a.interiorUrls.map((url, i) => (
                                    <a
                                        key={`${url}-${i}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative block w-28 h-28 rounded-sm border border-zinc-200 overflow-hidden bg-white group"
                                        title={`Interior ${i + 1}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={url}
                                            alt={`${a.dojoName} interior ${i + 1}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <Kv label="Address">
                            <span className="inline-flex items-start gap-1.5">
                                <MapPin
                                    size={12}
                                    className="text-zinc-400 mt-1 shrink-0"
                                />
                                <span className="text-zinc-700">
                                    {a.address}
                                </span>
                            </span>
                        </Kv>
                        <Kv label="Coordinates">
                            <span className="text-zinc-700 font-mono text-xs">
                                {a.latitude != null && a.longitude != null
                                    ? `${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)}`
                                    : "—"}
                            </span>
                        </Kv>
                        <Kv label="Payment reference">
                            <span className="text-zinc-700 font-mono text-xs">
                                {a.paymentId ?? "—"}
                            </span>
                        </Kv>
                        <Kv label="Application id">
                            <span className="text-zinc-500 font-mono text-xs">
                                {a.id}
                            </span>
                        </Kv>
                        <Kv label="Supabase user id">
                            <span className="text-zinc-500 font-mono text-xs">
                                {a.userId ?? "—"}
                            </span>
                        </Kv>
                    </div>
                </div>
            )}
        </li>
    );
}

function StatusBadge({ status }: { status: Application["status"] }) {
    const palette: Record<Application["status"], string> = {
        PENDING_PAYMENT:
            "bg-amber-50 text-amber-700 border-amber-200",
        PAID: "bg-blue-50 text-blue-700 border-blue-200",
        APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
        REJECTED: "bg-red-50 text-red-700 border-red-200",
    };
    const label: Record<Application["status"], string> = {
        PENDING_PAYMENT: "Awaiting payment",
        PAID: "Awaiting review",
        APPROVED: "Approved",
        REJECTED: "Rejected",
    };
    return (
        <span
            className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${palette[status]}`}
        >
            {label[status]}
        </span>
    );
}

function Kv({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                {label}
            </p>
            <div>{children}</div>
        </div>
    );
}
