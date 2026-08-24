import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import PrintButton from "@/components/print-button";
import { prisma } from "@/lib/prisma";
import {
    parseCustomDivisions,
    resolveDivision,
    feeAmountAfterMemberDiscount,
} from "@/lib/tournaments/divisions";
import {
    applyTypedDiscount,
    coerceDiscountType,
} from "@/lib/pricing/discount";
import { isJkaMember } from "@/lib/auth/is-jka-member";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";
import { displayEmail } from "@/lib/format/email";

type Props = {
    params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
    title: "Invoice — JKA Bangladesh",
};

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(d);
}

function formatDateShort(d: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(d);
}

function invoiceNumberFor(id: string, createdAt: Date): string {
    const y = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(createdAt);
    return `JKA-${y}-${id.slice(0, 8).toUpperCase()}`;
}

type PickedFee = { id: string; name: string; amountBdt: number };

function parsePickedFees(raw: unknown): PickedFee[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r) => ({
            id: typeof r.id === "string" ? r.id : "",
            name: typeof r.name === "string" ? r.name : "",
            amountBdt:
                typeof r.amountBdt === "number"
                    ? r.amountBdt
                    : Number(r.amountBdt ?? 0),
        }))
        .filter((f) => f.name);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default async function InvoicePage({ params }: Props) {
    const { token } = await params;

    const registration = await prisma.eventRegistration.findUnique({
        where: { qrToken: token },
        include: {
            event: {
                include: {
                    dojo: { select: { name: true } },
                    tournamentDetail: {
                        select: { customDivisions: true },
                    },
                },
            },
            user: {
                select: {
                    fullName: true,
                    email: true,
                    contactEmail: true,
                    phone: true,
                    memberNumber: true,
                },
            },
        },
    });

    if (!registration) notFound();

    // Only paid registrations have invoices.
    if (
        registration.paymentStatus !== "PAID" &&
        registration.paymentStatus !== "REFUNDED"
    ) {
        return (
            <main className="min-h-screen bg-bg-deep w-full flex items-center justify-center px-6 py-12">
                <div className="max-w-md w-full bg-white border-2 border-zinc-900 shadow-xl rounded-sm p-8 text-center">
                    <AlertCircle
                        size={32}
                        className="text-amber-600 mx-auto mb-4"
                    />
                    <h1 className="font-karate text-xl uppercase tracking-wider font-bold text-zinc-900 mb-2">
                        Invoice unavailable
                    </h1>
                    <p className="text-sm text-zinc-600 mb-6">
                        An invoice is generated once your ticket payment is
                        confirmed. Complete the payment from your participation
                        card and come back here.
                    </p>
                    <Link
                        href={`/participants/${token}`}
                        className="inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm w-full"
                    >
                        Go to participation card
                    </Link>
                </div>
            </main>
        );
    }

    // Aggregate every PAID / REFUNDED row this member has for the event, not
    // just the current payment group. The invoice now covers the buyer's full
    // ledger for this event — original registration + every "Add divisions"
    // top-up they've paid for since — so nothing they've been charged is
    // hidden from proof-of-payment.
    const historyRows = registration.userId
        ? await prisma.eventRegistration.findMany({
              where: {
                  userId: registration.userId,
                  eventId: registration.eventId,
                  paymentStatus: { in: ["PAID", "REFUNDED"] },
              },
              orderBy: { createdAt: "asc" },
              select: {
                  id: true,
                  qrToken: true,
                  divisionCode: true,
                  selectedOptionalFees: true,
                  amountDue: true,
                  paymentStatus: true,
                  paymentGroupId: true,
                  paidAt: true,
                  createdAt: true,
                  transactionId: true,
                  parentRegistrationId: true,
              },
          })
        : [
              {
                  id: registration.id,
                  qrToken: registration.qrToken,
                  divisionCode: registration.divisionCode,
                  selectedOptionalFees: registration.selectedOptionalFees,
                  amountDue: registration.amountDue,
                  paymentStatus: registration.paymentStatus,
                  paymentGroupId: registration.paymentGroupId,
                  paidAt: registration.paidAt,
                  createdAt: registration.createdAt,
                  transactionId: registration.transactionId,
                  parentRegistrationId: registration.parentRegistrationId,
              },
          ];

    const customDivisions = parseCustomDivisions(
        registration.event.tournamentDetail?.customDivisions,
    );

    const registrantIsMember = registration.userId
        ? await isJkaMember(registration.userId)
        : false;

    // Group rows by their paymentGroupId — each group is one gateway session.
    // Rows without a paymentGroupId (rare: single-item registrations from
    // older code paths) are keyed by their own id so each one becomes its own
    // "payment" in the history.
    type SessionKey = string;
    type SessionRow = (typeof historyRows)[number];
    const sessionsByKey = new Map<SessionKey, SessionRow[]>();
    for (const row of historyRows) {
        const key = row.paymentGroupId ?? `row:${row.id}`;
        const bucket = sessionsByKey.get(key) ?? [];
        bucket.push(row);
        sessionsByKey.set(key, bucket);
    }

    type SubLine = { label: string; amount: number };
    type LineItem = {
        key: string;
        divisionLabel: string;
        rows: SubLine[];
        subtotal: number;
        isShadow: boolean;
    };
    type PaymentSession = {
        key: string;
        sessionNo: number;
        paidAt: Date;
        transactionId: string | null;
        ticketAmount: number;
        lineItems: LineItem[];
        divisionsPreDiscount: number;
        discountAmount: number;
        discountLabel: string | null;
        subtotal: number;
        isRefunded: boolean;
        isTopUp: boolean;
    };

    const discountType = coerceDiscountType(
        registration.event.multiDivisionDiscountType,
    );
    const discountValue = Number(registration.event.multiDivisionDiscountPercent);

    const eventTicketPrice =
        registration.event.ticketPrice !== null &&
        Number(registration.event.ticketPrice) > 0
            ? round2(Number(registration.event.ticketPrice))
            : 0;

    // Build one PaymentSession per gateway session, in chronological order.
    const orderedSessions = Array.from(sessionsByKey.entries()).sort(
        ([, a], [, b]) => {
            const at = (a[0].paidAt ?? a[0].createdAt).getTime();
            const bt = (b[0].paidAt ?? b[0].createdAt).getTime();
            return at - bt;
        },
    );

    const sessions: PaymentSession[] = [];
    let firstRegistrationTicketCharged = false;
    orderedSessions.forEach(([key, rows], idx) => {
        const paidAt = rows[0].paidAt ?? rows[0].createdAt;
        const transactionId = rows.find((r) => r.transactionId)?.transactionId ?? null;
        const isRefunded = rows.some((r) => r.paymentStatus === "REFUNDED");
        const hasNonShadow = rows.some((r) => !r.parentRegistrationId);
        const isTopUp = !hasNonShadow;

        let divisionsPreDiscount = 0;
        const lineItems: LineItem[] = [];

        for (const row of rows) {
            const division = row.divisionCode
                ? resolveDivision(row.divisionCode, customDivisions)
                : null;
            const pickedSnapshot = parsePickedFees(row.selectedOptionalFees);
            const pickedIds = new Set(pickedSnapshot.map((f) => f.id));
            const isShadow = !!row.parentRegistrationId;
            const subRows: SubLine[] = [];
            let subtotal = 0;

            if (division) {
                if (division.fees && division.fees.length > 0) {
                    for (const f of division.fees) {
                        if (isShadow) {
                            if (f.required || !pickedIds.has(f.id)) continue;
                        } else {
                            const isActive = f.required || pickedIds.has(f.id);
                            if (!isActive) continue;
                        }
                        const amt = feeAmountAfterMemberDiscount(
                            f,
                            registrantIsMember,
                        );
                        subRows.push({
                            label: f.required ? f.name : `${f.name} (add-on)`,
                            amount: amt,
                        });
                        subtotal += amt;
                    }
                } else if (
                    !isShadow &&
                    division.priceBdt !== null &&
                    division.priceBdt !== undefined
                ) {
                    subRows.push({
                        label: "Entry fee",
                        amount: division.priceBdt,
                    });
                    subtotal += division.priceBdt;
                }
                if (!isShadow) divisionsPreDiscount += subtotal;
                lineItems.push({
                    key: row.id,
                    divisionLabel: isShadow
                        ? `${division.label} — add-ons`
                        : division.label,
                    rows: subRows,
                    subtotal: round2(subtotal),
                    isShadow,
                });
            }
        }

        divisionsPreDiscount = round2(divisionsPreDiscount);

        // Multi-division discount applies once per session, when 2+ divisions
        // (non-shadow) were purchased together.
        const nonShadowCount = lineItems.filter((l) => !l.isShadow).length;
        let divisionsAfterDiscount = divisionsPreDiscount;
        let discountAmount = 0;
        let discountLabel: string | null = null;
        if (
            nonShadowCount >= 2 &&
            divisionsPreDiscount > 0 &&
            discountValue > 0
        ) {
            divisionsAfterDiscount = applyTypedDiscount(
                divisionsPreDiscount,
                discountType,
                discountValue,
            );
            discountAmount = round2(
                divisionsPreDiscount - divisionsAfterDiscount,
            );
            discountLabel =
                discountType === "FIXED"
                    ? `Multi-division discount (৳${discountValue.toLocaleString()})`
                    : `Multi-division discount (${discountValue}%)`;
        }

        // Ticket price is charged only on the FIRST session that includes a
        // fresh (non-shadow) registration. Later top-ups do not re-pay the
        // event ticket.
        let ticketAmount = 0;
        if (hasNonShadow && !firstRegistrationTicketCharged && eventTicketPrice > 0) {
            ticketAmount = eventTicketPrice;
            firstRegistrationTicketCharged = true;
        }

        const shadowSubtotal = lineItems
            .filter((l) => l.isShadow)
            .reduce((sum, l) => sum + l.subtotal, 0);

        const subtotal = round2(
            divisionsAfterDiscount + ticketAmount + shadowSubtotal,
        );

        sessions.push({
            key,
            sessionNo: idx + 1,
            paidAt,
            transactionId,
            ticketAmount,
            lineItems,
            divisionsPreDiscount,
            discountAmount,
            discountLabel,
            subtotal,
            isRefunded,
            isTopUp,
        });
    });

    const grandTotal = round2(
        sessions.reduce(
            (sum, s) => sum + (s.isRefunded ? 0 : s.subtotal),
            0,
        ),
    );
    const totalRefunded = round2(
        sessions.reduce(
            (sum, s) => sum + (s.isRefunded ? s.subtotal : 0),
            0,
        ),
    );

    const participantName =
        registration.user?.fullName ?? registration.guestName ?? "Participant";
    const participantEmail =
        (registration.user ? displayEmail(registration.user) : "") ||
        registration.guestEmail ||
        registration.user?.email ||
        "";
    const participantPhone =
        registration.user?.phone ?? registration.guestPhone ?? "";
    const memberNumber = registration.user?.memberNumber ?? null;

    // Invoice number is anchored to the earliest registration so it stays
    // stable as top-ups get added over time.
    const firstRow = historyRows[0];
    const anchorId = firstRow.paymentGroupId ?? firstRow.id;
    const invoiceNo = invoiceNumberFor(
        anchorId,
        firstRow.paidAt ?? firstRow.createdAt,
    );
    const latestPaidAt =
        sessions[sessions.length - 1]?.paidAt ?? registration.paidAt ?? registration.createdAt;
    const isEntirelyRefunded =
        sessions.length > 0 && sessions.every((s) => s.isRefunded);

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden print:bg-white print:min-h-0">
            <style>{`
                @media print {
                    @page { size: A4; margin: 12mm; }
                    html, body { background: white !important; }
                }
            `}</style>
            <section className="py-12 md:py-20 print:py-0">
                <div className="max-w-3xl mx-auto px-6 lg:px-12 print:px-0 print:max-w-full">
                    <Link
                        href={`/participants/${token}`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-accent-red transition-colors mb-8 print:hidden"
                    >
                        <ArrowLeft size={14} />
                        Back to participation card
                    </Link>

                    <div className="bg-white border-2 border-zinc-900 shadow-xl rounded-sm overflow-hidden print:shadow-none print:border">
                        <div className="px-8 py-6 border-b border-zinc-200 flex items-start justify-between gap-6 print:px-6 print:py-4">
                            <div className="flex items-center gap-3">
                                <Image
                                    src={Logo}
                                    alt="JKA Bangladesh logo"
                                    width={48}
                                    height={48}
                                />
                                <div>
                                    <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-500">
                                        JKA Bangladesh
                                    </p>
                                    <p className="text-sm font-bold text-zinc-900">
                                        Japan Karate Association
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                        jkabangladesh.com
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                    Invoice
                                </p>
                                <p className="font-mono text-sm font-bold text-zinc-900 mt-0.5">
                                    {invoiceNo}
                                </p>
                                {isEntirelyRefunded ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 mt-2">
                                        Refunded
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mt-2">
                                        <CheckCircle2 size={11} />
                                        Paid
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="px-8 py-6 grid sm:grid-cols-2 gap-6 border-b border-zinc-200 print:px-6 print:py-4">
                            <div>
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-2">
                                    Billed to
                                </p>
                                <p className="text-sm font-bold text-zinc-900">
                                    {participantName}
                                </p>
                                {participantEmail && (
                                    <p className="text-xs text-zinc-600">
                                        {participantEmail}
                                    </p>
                                )}
                                {participantPhone && (
                                    <p className="text-xs text-zinc-600">
                                        {participantPhone}
                                    </p>
                                )}
                                {memberNumber && (
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">
                                        Member #{memberNumber}
                                    </p>
                                )}
                            </div>
                            <div className="sm:text-right space-y-2">
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                        Latest payment
                                    </p>
                                    <p className="text-sm text-zinc-900">
                                        {formatDateShort(latestPaidAt)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                        Payments on record
                                    </p>
                                    <p className="text-sm text-zinc-900">
                                        {sessions.length}{" "}
                                        {sessions.length === 1
                                            ? "session"
                                            : "sessions"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-b border-zinc-200 print:px-6 print:py-4">
                            <p className="text-[10px] tracking-widest uppercase font-bold text-accent-red mb-2">
                                Event
                            </p>
                            <h2 className="font-karate text-xl md:text-2xl text-zinc-900 uppercase tracking-wider font-bold leading-tight">
                                {registration.event.title}
                            </h2>
                            <p className="text-xs text-zinc-600 mt-1">
                                {formatDate(registration.event.eventDate)}
                                {registration.event.location
                                    ? ` · ${registration.event.location}`
                                    : ""}
                            </p>
                            {registration.event.dojo?.name && (
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">
                                    Hosted by {registration.event.dojo.name}
                                </p>
                            )}
                        </div>

                        <div className="px-8 py-6 space-y-8 print:px-6 print:py-4">
                            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                Payment history
                            </p>

                            {sessions.map((s) => (
                                <div
                                    key={s.key}
                                    className="border border-zinc-200 rounded-sm"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                                        <div>
                                            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                                {s.isTopUp
                                                    ? `Top-up · Payment ${s.sessionNo}`
                                                    : s.sessionNo === 1
                                                      ? "Initial registration"
                                                      : `Additional payment ${s.sessionNo}`}
                                            </p>
                                            <p className="text-sm text-zinc-900 font-semibold mt-0.5">
                                                {formatDateShort(s.paidAt)}
                                            </p>
                                            {s.transactionId && (
                                                <p className="font-mono text-[11px] text-zinc-500 mt-0.5 break-all">
                                                    Txn: {s.transactionId}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            {s.isRefunded ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                                                    Refunded
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 size={11} />
                                                    Paid
                                                </span>
                                            )}
                                            <p className="font-mono text-sm font-bold text-zinc-900 mt-1">
                                                ৳{s.subtotal.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-100 text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                                <th className="text-left px-4 py-2 font-bold">
                                                    Description
                                                </th>
                                                <th className="text-right px-4 py-2 font-bold">
                                                    Amount (BDT)
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {s.ticketAmount > 0 && (
                                                <tr className="border-b border-zinc-100">
                                                    <td className="px-4 py-3 align-top">
                                                        <p className="font-semibold text-zinc-900">
                                                            Event ticket
                                                        </p>
                                                        <p className="text-xs text-zinc-500 mt-0.5">
                                                            Base admission
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-zinc-900">
                                                        ৳
                                                        {s.ticketAmount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            )}
                                            {s.lineItems.map((li) => (
                                                <tr
                                                    key={li.key}
                                                    className="border-b border-zinc-100"
                                                >
                                                    <td className="px-4 py-3 align-top">
                                                        <p className="font-semibold text-zinc-900">
                                                            {li.divisionLabel}
                                                        </p>
                                                        {li.rows.length > 0 && (
                                                            <ul className="text-xs text-zinc-500 mt-1 space-y-0.5">
                                                                {li.rows.map(
                                                                    (r, i) => (
                                                                        <li
                                                                            key={i}
                                                                            className="flex justify-between gap-4"
                                                                        >
                                                                            <span>
                                                                                {r.label}
                                                                            </span>
                                                                            <span className="font-mono">
                                                                                ৳
                                                                                {r.amount.toLocaleString()}
                                                                            </span>
                                                                        </li>
                                                                    ),
                                                                )}
                                                            </ul>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-zinc-900 align-top">
                                                        ৳
                                                        {li.subtotal.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {s.lineItems.length === 0 &&
                                                s.ticketAmount === 0 && (
                                                    <tr className="border-b border-zinc-100">
                                                        <td className="px-4 py-3">
                                                            <p className="font-semibold text-zinc-900">
                                                                Registration
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-zinc-900">
                                                            ৳
                                                            {s.subtotal.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                )}
                                        </tbody>
                                        <tfoot>
                                            {s.lineItems.some(
                                                (l) => !l.isShadow,
                                            ) && (
                                                <tr>
                                                    <td className="px-4 pt-3 text-right text-xs text-zinc-500">
                                                        Divisions subtotal
                                                    </td>
                                                    <td className="px-4 pt-3 text-right font-mono text-xs text-zinc-500">
                                                        ৳
                                                        {s.divisionsPreDiscount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            )}
                                            {s.discountAmount > 0 && s.discountLabel && (
                                                <tr>
                                                    <td className="px-4 pt-1 text-right text-xs text-emerald-700">
                                                        {s.discountLabel}
                                                    </td>
                                                    <td className="px-4 pt-1 text-right font-mono text-xs text-emerald-700">
                                                        −৳
                                                        {s.discountAmount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td className="px-4 pt-3 pb-3 text-right text-xs font-bold uppercase tracking-widest text-zinc-700">
                                                    Session total
                                                </td>
                                                <td className="px-4 pt-3 pb-3 text-right font-mono text-sm font-bold text-zinc-900">
                                                    ৳{s.subtotal.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ))}

                            {sessions.length === 0 && (
                                <p className="text-sm text-zinc-500 italic">
                                    No payment history yet.
                                </p>
                            )}

                            <div className="border-t-2 border-zinc-900 pt-4 flex flex-col gap-1 items-end">
                                {totalRefunded > 0 && (
                                    <div className="flex items-baseline gap-6 text-xs text-zinc-500">
                                        <span>Refunded</span>
                                        <span className="font-mono">
                                            −৳{totalRefunded.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-baseline gap-6">
                                    <span className="text-sm font-bold uppercase tracking-widest text-zinc-900">
                                        Grand total paid
                                    </span>
                                    <span className="font-mono text-lg font-bold text-zinc-900">
                                        ৳{grandTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-4 bg-zinc-50 border-t border-zinc-200 text-[11px] text-zinc-500 print:px-6">
                            Thank you for registering with JKA Bangladesh. This
                            invoice serves as proof of payment for your event
                            registration. For any questions, contact{" "}
                            <span className="font-semibold text-zinc-700">
                                support@jkabangladesh.com
                            </span>
                            .
                        </div>
                    </div>

                    <div className="mt-8 grid sm:grid-cols-2 gap-3 print:hidden">
                        <PrintButton label="Download / Print invoice" />
                        <Link
                            href={`/participants/${token}`}
                            className="inline-flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors"
                        >
                            View participation card
                        </Link>
                    </div>

                    <p className="text-xs text-zinc-500 mt-6 text-center print:hidden">
                        Save this page — the URL is your private link to this
                        invoice.
                    </p>
                </div>
            </section>
        </main>
    );
}
