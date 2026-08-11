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

    // Load sibling rows in the same payment group so the invoice covers the
    // entire submit (matching what the participant actually paid).
    const groupRows = registration.paymentGroupId
        ? await prisma.eventRegistration.findMany({
              where: { paymentGroupId: registration.paymentGroupId },
              orderBy: { createdAt: "asc" },
              select: {
                  id: true,
                  qrToken: true,
                  divisionCode: true,
                  selectedOptionalFees: true,
                  amountDue: true,
                  paymentStatus: true,
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
              },
          ];

    const customDivisions = parseCustomDivisions(
        registration.event.tournamentDetail?.customDivisions,
    );

    const registrantIsMember = registration.userId
        ? await isJkaMember(registration.userId)
        : false;

    // Build line items. For each row, pull the division label + required and
    // opt-in fees (from the picked snapshot) so the invoice matches what the
    // participant selected. If a row has no divisions (ticket-only event) we
    // fall back to the event's ticket price.
    type LineItem = {
        key: string;
        divisionLabel: string;
        rows: { label: string; amount: number }[];
        subtotal: number;
    };

    const lineItems: LineItem[] = [];
    let divisionsPreDiscount = 0;

    for (const row of groupRows) {
        const division = row.divisionCode
            ? resolveDivision(row.divisionCode, customDivisions)
            : null;

        const pickedSnapshot = parsePickedFees(row.selectedOptionalFees);
        const pickedIds = new Set(pickedSnapshot.map((f) => f.id));

        const subRows: { label: string; amount: number }[] = [];
        let subtotal = 0;

        if (division) {
            if (division.fees && division.fees.length > 0) {
                for (const f of division.fees) {
                    const isActive = f.required || pickedIds.has(f.id);
                    if (!isActive) continue;
                    const amt = feeAmountAfterMemberDiscount(
                        f,
                        registrantIsMember,
                    );
                    subRows.push({
                        label: f.required
                            ? f.name
                            : `${f.name} (add-on)`,
                        amount: amt,
                    });
                    subtotal += amt;
                }
            } else if (division.priceBdt !== null && division.priceBdt !== undefined) {
                subRows.push({
                    label: "Entry fee",
                    amount: division.priceBdt,
                });
                subtotal += division.priceBdt;
            }
            divisionsPreDiscount += subtotal;
            lineItems.push({
                key: row.id,
                divisionLabel: division.label,
                rows: subRows,
                subtotal: round2(subtotal),
            });
        }
    }

    divisionsPreDiscount = round2(divisionsPreDiscount);

    // Multi-division discount (event-wide, applied once to the divisions
    // subtotal when 2+ divisions were entered).
    const discountType = coerceDiscountType(
        registration.event.multiDivisionDiscountType,
    );
    const discountValue = Number(registration.event.multiDivisionDiscountPercent);
    let divisionsAfterDiscount = divisionsPreDiscount;
    let discountAmount = 0;
    let discountLabel: string | null = null;
    if (
        lineItems.length >= 2 &&
        divisionsPreDiscount > 0 &&
        discountValue > 0
    ) {
        divisionsAfterDiscount = applyTypedDiscount(
            divisionsPreDiscount,
            discountType,
            discountValue,
        );
        discountAmount = round2(divisionsPreDiscount - divisionsAfterDiscount);
        discountLabel =
            discountType === "FIXED"
                ? `Multi-division discount (৳${discountValue.toLocaleString()})`
                : `Multi-division discount (${discountValue}%)`;
    }

    const ticketAmount =
        registration.event.ticketPrice !== null &&
        Number(registration.event.ticketPrice) > 0
            ? round2(Number(registration.event.ticketPrice))
            : 0;

    const total = round2(divisionsAfterDiscount + ticketAmount);

    const participantName =
        registration.user?.fullName ?? registration.guestName ?? "Participant";
    const participantEmail =
        registration.user?.email ?? registration.guestEmail ?? "";
    const participantPhone =
        registration.user?.phone ?? registration.guestPhone ?? "";
    const memberNumber = registration.user?.memberNumber ?? null;

    const invoiceNo = registration.paymentGroupId
        ? invoiceNumberFor(
              registration.paymentGroupId,
              registration.paidAt ?? registration.createdAt,
          )
        : invoiceNumberFor(
              registration.id,
              registration.paidAt ?? registration.createdAt,
          );

    const paidAt = registration.paidAt ?? registration.createdAt;
    const isRefunded = registration.paymentStatus === "REFUNDED";

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
                                {isRefunded ? (
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
                                        Payment date
                                    </p>
                                    <p className="text-sm text-zinc-900">
                                        {formatDateShort(paidAt)}
                                    </p>
                                </div>
                                {registration.transactionId && (
                                    <div>
                                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                            Transaction ID
                                        </p>
                                        <p className="font-mono text-xs text-zinc-700 break-all">
                                            {registration.transactionId}
                                        </p>
                                    </div>
                                )}
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

                        <div className="px-8 py-6 print:px-6 print:py-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                        <th className="text-left py-2 font-bold">
                                            Description
                                        </th>
                                        <th className="text-right py-2 font-bold">
                                            Amount (BDT)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ticketAmount > 0 && (
                                        <tr className="border-b border-zinc-100">
                                            <td className="py-3 align-top">
                                                <p className="font-semibold text-zinc-900">
                                                    Event ticket
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-0.5">
                                                    Base admission
                                                </p>
                                            </td>
                                            <td className="py-3 text-right font-mono text-zinc-900">
                                                ৳{ticketAmount.toLocaleString()}
                                            </td>
                                        </tr>
                                    )}
                                    {lineItems.map((li) => (
                                        <tr
                                            key={li.key}
                                            className="border-b border-zinc-100"
                                        >
                                            <td className="py-3 align-top">
                                                <p className="font-semibold text-zinc-900">
                                                    {li.divisionLabel}
                                                </p>
                                                {li.rows.length > 0 && (
                                                    <ul className="text-xs text-zinc-500 mt-1 space-y-0.5">
                                                        {li.rows.map((r, i) => (
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
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="py-3 text-right font-mono text-zinc-900 align-top">
                                                ৳{li.subtotal.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {lineItems.length === 0 &&
                                        ticketAmount === 0 && (
                                            <tr className="border-b border-zinc-100">
                                                <td className="py-3">
                                                    <p className="font-semibold text-zinc-900">
                                                        Registration
                                                    </p>
                                                </td>
                                                <td className="py-3 text-right font-mono text-zinc-900">
                                                    ৳
                                                    {Number(
                                                        registration.amountDue ??
                                                            0,
                                                    ).toLocaleString()}
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                                <tfoot>
                                    {lineItems.length > 0 && (
                                        <tr>
                                            <td className="pt-4 text-right text-xs text-zinc-500">
                                                Divisions subtotal
                                            </td>
                                            <td className="pt-4 text-right font-mono text-xs text-zinc-500">
                                                ৳
                                                {divisionsPreDiscount.toLocaleString()}
                                            </td>
                                        </tr>
                                    )}
                                    {discountAmount > 0 && discountLabel && (
                                        <tr>
                                            <td className="pt-1 text-right text-xs text-emerald-700">
                                                {discountLabel}
                                            </td>
                                            <td className="pt-1 text-right font-mono text-xs text-emerald-700">
                                                −৳
                                                {discountAmount.toLocaleString()}
                                            </td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td className="pt-4 text-right text-sm font-bold uppercase tracking-widest text-zinc-900">
                                            Total paid
                                        </td>
                                        <td className="pt-4 text-right font-mono text-lg font-bold text-zinc-900">
                                            ৳{total.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
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
