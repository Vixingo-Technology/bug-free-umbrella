import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Ticket, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";
import {
    parseCustomDivisions,
    resolveDivision,
} from "@/lib/tournaments/divisions";

export const metadata: Metadata = {
    title: "Divisions added — JKA Bangladesh",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ regId?: string }>;

type SnapshotFee = { id: string; name: string; amountBdt: number };

function parseSnapshot(raw: unknown): SnapshotFee[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(
            (r): r is Record<string, unknown> => !!r && typeof r === "object",
        )
        .map((r) => ({
            id: typeof r.id === "string" ? r.id : "",
            name: typeof r.name === "string" ? r.name : "",
            amountBdt:
                typeof r.amountBdt === "number"
                    ? r.amountBdt
                    : Number(r.amountBdt ?? 0),
        }))
        .filter((f) => !!f.id);
}

export default async function AddDivisionsSuccessPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const { regId } = await searchParams;
    if (!regId) redirect("/portal/events");

    const primary = await prisma.eventRegistration.findUnique({
        where: { id: regId },
        select: {
            id: true,
            qrToken: true,
            paymentStatus: true,
            amountDue: true,
            paymentGroupId: true,
            parentRegistrationId: true,
            divisionCode: true,
            selectedOptionalFees: true,
            guestName: true,
            user: { select: { fullName: true } },
            event: {
                select: {
                    id: true,
                    title: true,
                    eventDate: true,
                    location: true,
                    tournamentDetail: {
                        select: { customDivisions: true },
                    },
                },
            },
        },
    });
    if (!primary) redirect("/portal/events");

    // If the primary row is a shadow (addon-only top-up), resolve the parent's
    // qrToken so the "card" link lands on a live participation card.
    let cardToken = primary.qrToken;
    if (primary.parentRegistrationId) {
        const parent = await prisma.eventRegistration.findUnique({
            where: { id: primary.parentRegistrationId },
            select: { qrToken: true },
        });
        if (parent?.qrToken) cardToken = parent.qrToken;
    }

    // Everything created in this one add-flow shares paymentGroupId; if only
    // one row was added there's no group id and the primary IS the row.
    const siblings = primary.paymentGroupId
        ? await prisma.eventRegistration.findMany({
              where: { paymentGroupId: primary.paymentGroupId },
              select: {
                  id: true,
                  divisionCode: true,
                  amountDue: true,
                  parentRegistrationId: true,
                  selectedOptionalFees: true,
              },
              orderBy: { createdAt: "asc" },
          })
        : [
              {
                  id: primary.id,
                  divisionCode: primary.divisionCode,
                  amountDue: primary.amountDue,
                  parentRegistrationId: primary.parentRegistrationId,
                  selectedOptionalFees: primary.selectedOptionalFees,
              },
          ];

    const customDivisions = primary.event.tournamentDetail
        ? parseCustomDivisions(primary.event.tournamentDetail.customDivisions)
        : [];

    // Split into "new division" rows vs "addon top-up" (shadow) rows.
    type AddedDivision = { label: string; amount: number };
    type AddedAddon = {
        divisionLabel: string;
        fees: { name: string; amount: number }[];
    };
    const newDivisions: AddedDivision[] = [];
    const newAddons: AddedAddon[] = [];
    for (const row of siblings) {
        const divCode = row.divisionCode;
        const div = divCode
            ? resolveDivision(divCode, customDivisions)
            : null;
        const label = div?.label ?? divCode ?? "Ticket";
        const amount = row.amountDue ? Number(row.amountDue) : 0;
        if (row.parentRegistrationId) {
            newAddons.push({
                divisionLabel: label,
                fees: parseSnapshot(row.selectedOptionalFees).map((f) => ({
                    name: f.name,
                    amount: f.amountBdt,
                })),
            });
        } else {
            newDivisions.push({ label, amount });
        }
    }

    const paidTotal = siblings.reduce(
        (sum, r) => sum + (r.amountDue ? Number(r.amountDue) : 0),
        0,
    );
    const wasFree = paidTotal === 0;

    const participantName =
        primary.user?.fullName ?? primary.guestName ?? "Participant";
    const eventDate = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(primary.event.eventDate);

    return (
        <main className="min-h-screen bg-bg-charcoal pb-24 pt-24">
            <div className="mx-auto max-w-xl px-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl md:p-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={36} />
                        </div>
                        <p className="mt-6 text-[11px] uppercase tracking-[0.4em] text-emerald-600">
                            {wasFree ? "Registration updated" : "Payment received"}
                        </p>
                        <h1 className="mt-3 font-serif text-3xl text-zinc-900 md:text-4xl">
                            Divisions added, {participantName}!
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-zinc-500">
                            {wasFree
                                ? "Your extra picks are now on your participation card."
                                : "We’ve added your new picks to your registration. Show your participation card at the venue for check-in."}
                        </p>
                    </div>

                    <div className="mt-8 border-t border-zinc-100 pt-6 text-sm">
                        <div className="flex justify-between mb-2">
                            <span className="text-zinc-500">Event</span>
                            <span className="font-semibold text-zinc-900 text-right">
                                {primary.event.title}
                            </span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-zinc-500">Date</span>
                            <span className="text-zinc-900 text-right">{eventDate}</span>
                        </div>
                        {primary.event.location && (
                            <div className="flex justify-between mb-2">
                                <span className="text-zinc-500">Location</span>
                                <span className="text-zinc-900 text-right">
                                    {primary.event.location}
                                </span>
                            </div>
                        )}
                    </div>

                    {(newDivisions.length > 0 || newAddons.length > 0) && (
                        <div className="mt-6 rounded-sm border border-zinc-100 bg-zinc-50/50 p-4">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">
                                What was added
                            </p>
                            <ul className="space-y-2 text-sm">
                                {newDivisions.map((d, i) => (
                                    <li
                                        key={`div-${i}`}
                                        className="flex items-start justify-between gap-3"
                                    >
                                        <span className="inline-flex items-center gap-2 text-zinc-800">
                                            <Plus
                                                size={12}
                                                className="text-emerald-600 shrink-0"
                                            />
                                            {d.label}
                                        </span>
                                        {d.amount > 0 && (
                                            <span className="text-zinc-700 whitespace-nowrap">
                                                ৳{d.amount.toLocaleString()}
                                            </span>
                                        )}
                                    </li>
                                ))}
                                {newAddons.map((a, i) => (
                                    <li key={`add-${i}`} className="text-zinc-800">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Plus
                                                size={12}
                                                className="text-emerald-600 shrink-0"
                                            />
                                            <span className="font-medium">
                                                Add-ons for {a.divisionLabel}
                                            </span>
                                        </div>
                                        <ul className="ml-6 space-y-1 text-xs text-zinc-600">
                                            {a.fees.map((f, j) => (
                                                <li
                                                    key={j}
                                                    className="flex items-start justify-between gap-3"
                                                >
                                                    <span>{f.name}</span>
                                                    {f.amount > 0 && (
                                                        <span className="whitespace-nowrap">
                                                            ৳{f.amount.toLocaleString()}
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!wasFree && (
                        <div className="mt-6 flex justify-between text-sm border-t border-zinc-100 pt-4">
                            <span className="text-zinc-500">Amount paid</span>
                            <span className="font-semibold text-zinc-900">
                                BDT {paidTotal.toLocaleString()}
                            </span>
                        </div>
                    )}

                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href={`/participants/${cardToken}?paid=1`}
                            className="inline-flex items-center justify-center gap-2 rounded-sm bg-accent-red px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-accent-red/90"
                        >
                            <Ticket size={14} />
                            View my participation card
                            <ArrowRight size={14} />
                        </Link>
                        <Link
                            href="/portal/events"
                            className="inline-flex items-center justify-center rounded-sm border border-zinc-200 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-accent-red hover:text-accent-red"
                        >
                            Back to my events
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
