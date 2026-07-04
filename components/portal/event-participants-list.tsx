import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, CheckCircle2, Circle, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Pager from "@/components/portal/pager";

const PAGE_SIZE = 25;

export type EventParticipantsListProps = {
    eventId: string;
    /** Where the page's `?page=` links should point. */
    basePath: string;
    /** Where the back link goes (e.g. /portal/admin/events). */
    backPath: string;
    page: number;
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

function formatCheckIn(d: Date): string {
    return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function EventParticipantsList({
    eventId,
    basePath,
    backPath,
    page,
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

    const [total, checkedInCount] = await Promise.all([
        prisma.eventRegistration.count({ where: { eventId } }),
        prisma.eventRegistration.count({
            where: { eventId, checkedInAt: { not: null } },
        }),
    ]);
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), pageCount);

    const participantsRaw = await prisma.eventRegistration.findMany({
        where: { eventId },
        orderBy: [{ checkedInAt: "asc" }, { createdAt: "asc" }],
        take: PAGE_SIZE,
        skip: (safePage - 1) * PAGE_SIZE,
        include: {
            user: {
                select: {
                    fullName: true,
                    email: true,
                    phone: true,
                    memberNumber: true,
                },
            },
            checkedInBy: { select: { fullName: true } },
        },
    });
    const participants = participantsRaw.map((p) => ({
        ...p,
        member: p.user
            ? {
                fullName: p.user.fullName,
                email: p.user.email,
                phone: p.user.phone,
                memberNumber: p.user.memberNumber ?? null,
            }
            : null,
    }));

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

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                    <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                        Participants ({total})
                    </h3>
                    <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 inline-flex items-center gap-1.5">
                        <QrCode size={12} />
                        Open a participant&apos;s QR to check them in
                    </span>
                </div>
                {total === 0 ? (
                    <p className="p-8 text-sm text-zinc-500 text-center">
                        No registrations yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                    <th className="px-5 py-3 w-8"></th>
                                    <th className="px-5 py-3">Participant</th>
                                    <th className="px-5 py-3">Contact</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-150">
                                {participants.map((p) => {
                                    const name =
                                        p.member?.fullName ??
                                        p.guestName ??
                                        "Guest";
                                    const email =
                                        p.member?.email ?? p.guestEmail ?? "—";
                                    const phone =
                                        p.member?.phone ?? p.guestPhone ?? "";
                                    return (
                                        <tr key={p.id} className="hover:bg-zinc-50/60">
                                            <td className="px-5 py-3 align-top">
                                                {p.checkedInAt ? (
                                                    <CheckCircle2
                                                        size={16}
                                                        className="text-emerald-600"
                                                    />
                                                ) : (
                                                    <Circle
                                                        size={16}
                                                        className="text-zinc-300"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-5 py-3 align-top">
                                                <div className="font-semibold text-zinc-900">
                                                    {name}
                                                </div>
                                                {p.member?.memberNumber ? (
                                                    <div className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-0.5">
                                                        Member #{p.member.memberNumber}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-0.5">
                                                        Guest
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 align-top">
                                                <div className="text-xs text-zinc-700">
                                                    {email}
                                                </div>
                                                {phone && (
                                                    <div className="text-xs text-zinc-500">
                                                        {phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 align-top">
                                                {p.checkedInAt ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 size={10} />
                                                            Present
                                                        </span>
                                                        <div className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1.5">
                                                            {formatCheckIn(p.checkedInAt)}
                                                            {p.checkedInBy?.fullName
                                                                ? ` · ${p.checkedInBy.fullName}`
                                                                : ""}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={`/participants/${p.qrToken}`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                                                    >
                                                        <QrCode size={10} />
                                                        Open card
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pager page={safePage} pageCount={pageCount} basePath={basePath} />
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
