import type { Metadata } from "next";
import { Send } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";

export const metadata: Metadata = {
    title: "Renewals — Dojo Dashboard",
};

type Row = {
    id: string;
    name: string;
    expiresLabel: string;
    status: "ON_TRACK" | "DUE_SOON" | "EXPIRED";
};

const bdt = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
});

const fmtDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

function classify(expiry: Date | null): Row["status"] | null {
    if (!expiry) return null;
    const days = Math.ceil(
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return "EXPIRED";
    if (days <= 30) return "DUE_SOON";
    return null; // only surface members needing action
}

function expiresLabel(expiry: Date): string {
    const days = Math.ceil(
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) {
        const ago = Math.abs(days);
        return `Expired ${ago} day${ago === 1 ? "" : "s"} ago`;
    }
    return `${days} day${days === 1 ? "" : "s"} (${fmtDate.format(expiry)})`;
}

export default async function RenewalsPage() {
    const session = await requireDojoRole("DOJO_MANAGER");
    const dojoId = session.dojo?.id ?? null;

    const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const members = dojoId
        ? await prisma.member.findMany({
              where: {
                  dojoId,
                  expiryDate: { not: null, lte: horizon },
                  role: "STUDENT",
              },
              select: {
                  id: true,
                  fullName: true,
                  expiryDate: true,
              },
              orderBy: { expiryDate: "asc" },
          })
        : [];

    const rows: Row[] = members
        .map((m) => {
            const status = classify(m.expiryDate);
            if (!status || !m.expiryDate) return null;
            return {
                id: m.id,
                name: m.fullName,
                expiresLabel: expiresLabel(m.expiryDate),
                status,
            };
        })
        .filter((r): r is Row => r !== null);

    const feeLabel = bdt.format(MEMBERSHIP_FEE_BDT);

    return (
        <>
            <DojoPageHeader
                eyebrow="Manager"
                title="Renewals"
                description="Memberships expiring within 30 days. Chase up before they lapse."
            />

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                            <th className="px-5 py-3">Member</th>
                            <th className="px-5 py-3">Expires</th>
                            <th className="px-5 py-3">Annual fee</th>
                            <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-5 py-10 text-center text-sm text-zinc-500"
                                >
                                    No memberships expiring in the next 30
                                    days. 🎉
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-b border-zinc-100 hover:bg-zinc-50"
                                >
                                    <td className="px-5 py-3 font-semibold text-zinc-900">
                                        {r.name}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-xs font-bold ${
                                                r.status === "EXPIRED"
                                                    ? "text-red-600"
                                                    : r.status === "DUE_SOON"
                                                      ? "text-amber-600"
                                                      : "text-zinc-600"
                                            }`}
                                        >
                                            {r.expiresLabel}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 font-mono text-zinc-700">
                                        {feeLabel}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 border border-zinc-300 text-zinc-700 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors rounded-sm"
                                        >
                                            <Send size={12} />
                                            Send reminder
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
