import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, CheckCircle2, Circle, QrCode, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseCustomDivisions, resolveDivision } from "@/lib/tournaments/divisions";

export type EventParticipantsListProps = {
    eventId: string;
    /** Base path for participant detail links (e.g. /portal/admin/events/:id/participants). */
    basePath: string;
    /** Where the back link goes (e.g. /portal/admin/events). */
    backPath: string;
};

function formatDate(d: Date): string {
    return d.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function EventParticipantsList({
    eventId,
    basePath,
    backPath,
}: EventParticipantsListProps) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            eventDate: true,
            location: true,
            maxCapacity: true,
            category: true,
            dojo: { select: { name: true } },
            tournamentDetail: true,
        },
    });

    if (!event) {
        return (
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-8 text-sm text-zinc-500 text-center">
                Event not found.{" "}
                <Link href={backPath} className="text-accent-red font-semibold hover:underline">
                    Back to events
                </Link>
                .
            </div>
        );
    }

    // Count distinct people, not division-rows. Same dedup key as the rest of
    // the app (see lib/events/participant-count.ts) so this page's Registered
    // stat matches the "N RSVPs" badge everywhere else.
    const regs = await prisma.eventRegistration.findMany({
        where: { eventId },
        select: {
            id: true,
            userId: true,
            paymentGroupId: true,
            guestEmail: true,
            guestPhone: true,
            checkedInAt: true,
        },
    });
    const participantKey = (r: {
        id: string;
        userId: string | null;
        paymentGroupId: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
    }) => {
        if (r.userId) return `u:${r.userId}`;
        const email = r.guestEmail?.trim().toLowerCase();
        if (email) return `e:${email}`;
        const phone = r.guestPhone?.trim();
        if (phone) return `p:${phone}`;
        if (r.paymentGroupId) return `g:${r.paymentGroupId}`;
        return `r:${r.id}`;
    };
    const uniqueParticipants = new Set(regs.map(participantKey));
    const uniqueCheckedIn = new Set(
        regs.filter((r) => r.checkedInAt !== null).map(participantKey),
    );
    const total = uniqueParticipants.size;
    const checkedInCount = uniqueCheckedIn.size;

    const capacityLabel = event.maxCapacity
        ? `${total} / ${event.maxCapacity}`
        : `${total}`;

    return (
        <>
            <Link
                href={backPath}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-accent-red transition-colors mb-6"
            >
                <ArrowLeft size={14} />
                All events
            </Link>

            <div className="mb-8">
                <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                    Participants
                </p>
                <h1 className="font-karate text-2xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15]">
                    {event.title}
                </h1>
                <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-500 mt-4">
                    <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} className="text-accent-red" />
                        {formatDate(event.eventDate)}
                    </span>
                    {event.location && (
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin size={12} className="text-accent-red" />
                            {event.location}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
                <Stat label="Registered" value={capacityLabel} />
                <Stat label="Checked in" value={String(checkedInCount)} />
                <Stat
                    label="Awaiting"
                    value={String(total - checkedInCount)}
                />
            </div>

            {event.tournamentDetail && (
                <TournamentDivisionBreakdown
                    eventId={eventId}
                    enabledDivisions={event.tournamentDetail.enabledDivisions}
                    customDivisionsRaw={event.tournamentDetail.customDivisions}
                    detailBase={`${basePath.replace(/\/$/, "")}`}
                />
            )}
        </>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm px-4 py-3">
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                {label}
            </p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
        </div>
    );
}

// Grouped breakdown for tournament events: one panel per enabled division,
// sorted by entry count desc, so admins can see at a glance where the field
// is thin and where match-fixing has real numbers.
async function TournamentDivisionBreakdown({
    eventId,
    enabledDivisions,
    customDivisionsRaw,
    detailBase,
}: {
    eventId: string;
    enabledDivisions: string[];
    customDivisionsRaw: unknown;
    detailBase: string;
}) {
    const customDivisions = parseCustomDivisions(customDivisionsRaw);
    const entries = await prisma.eventRegistration.findMany({
        where: { eventId, divisionCode: { not: null } },
        orderBy: [{ divisionCode: "asc" }, { createdAt: "asc" }],
        select: {
            id: true,
            divisionCode: true,
            entrantGender: true,
            entrantWeightKg: true,
            entrantBeltRank: true,
            entrantDojoName: true,
            teamName: true,
            checkedInAt: true,
            paymentStatus: true,
            guestName: true,
            guestDateOfBirth: true,
            qrToken: true,
            user: { select: { fullName: true, memberNumber: true } },
        },
    });

    // Group entries by division code. Include enabled divisions with zero
    // entries so admins see the empty divisions too (planning: cancel a bracket
    // if it has no takers).
    const grouped = new Map<string, typeof entries>();
    for (const code of enabledDivisions) grouped.set(code, []);
    for (const e of entries) {
        if (!e.divisionCode) continue;
        const arr = grouped.get(e.divisionCode) ?? [];
        arr.push(e);
        grouped.set(e.divisionCode, arr);
    }

    const rows = Array.from(grouped.entries())
        .map(([code, list]) => ({
            code,
            division: resolveDivision(code, customDivisions),
            list,
        }))
        .sort((a, b) => b.list.length - a.list.length);

    const nonEmpty = rows.filter((r) => r.list.length > 0);
    const empty = rows.filter((r) => r.list.length === 0);

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs tracking-widest uppercase font-bold text-zinc-500 inline-flex items-center gap-1.5">
                    <Trophy size={12} className="text-accent-red" />
                    Divisions
                </p>
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                    {nonEmpty.length} / {rows.length} with entries
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {nonEmpty.map(({ code, division, list }) => (
                    <DivisionPanel
                        key={code}
                        code={code}
                        label={division?.label ?? code}
                        entries={list}
                        detailBase={detailBase}
                    />
                ))}
            </div>
            {empty.length > 0 && (
                <details className="mt-3 border border-dashed border-zinc-300 rounded-sm bg-zinc-50/60 p-3">
                    <summary className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 cursor-pointer">
                        {empty.length} division{empty.length === 1 ? "" : "s"} with no entries
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                        {empty.map(({ code, division }) => (
                            <li key={code}>{division?.label ?? code}</li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}

type DivisionEntry = {
    id: string;
    entrantWeightKg: { toString(): string } | null;
    entrantBeltRank: string | null;
    entrantDojoName: string | null;
    teamName: string | null;
    checkedInAt: Date | null;
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | null;
    guestName: string | null;
    guestDateOfBirth: Date | null;
    qrToken: string;
    user: { fullName: string | null; memberNumber: string | null } | null;
};

function DivisionPanel({
    label,
    entries,
    detailBase,
}: {
    code: string;
    label: string;
    entries: DivisionEntry[];
    detailBase: string;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                <p className="text-xs font-bold text-zinc-800">{label}</p>
                <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full border bg-accent-red/5 border-accent-red/20 text-accent-red">
                    {entries.length}
                </span>
            </div>
            <ul className="divide-y divide-zinc-100 text-xs">
                {entries.map((e) => {
                    const name = e.user?.fullName ?? e.guestName ?? "Guest";
                    return (
                        <li
                            key={e.id}
                            className="px-4 py-2 flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-zinc-900 truncate">
                                    <Link
                                        href={`${detailBase}/${e.id}`}
                                        className="hover:text-accent-red hover:underline"
                                    >
                                        {name}
                                    </Link>
                                    {e.teamName && (
                                        <span className="text-zinc-400 font-normal">
                                            {" "}
                                            · Team {e.teamName}
                                        </span>
                                    )}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mt-0.5">
                                    {[
                                        e.entrantBeltRank,
                                        e.entrantWeightKg
                                            ? `${e.entrantWeightKg.toString()} kg`
                                            : null,
                                        e.entrantDojoName,
                                        e.user?.memberNumber
                                            ? `#${e.user.memberNumber}`
                                            : "Guest",
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                                {e.paymentStatus === "PENDING" && (
                                    <span className="text-[9px] tracking-widest uppercase font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        Unpaid
                                    </span>
                                )}
                                {e.checkedInAt ? (
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                ) : (
                                    <Circle size={14} className="text-zinc-300" />
                                )}
                                <Link
                                    href={`/participants/${e.qrToken}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-[9px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                                >
                                    <QrCode size={10} />
                                    Open card
                                </Link>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
