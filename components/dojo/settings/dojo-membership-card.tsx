"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  XCircle,
} from "lucide-react";
import {
  createDojoRenewalOrderAction,
  saveDojoAnnualFeeAction,
} from "@/app/portal/dojo/settings/actions";

export type DojoMembershipCardProps = {
  annualFeeBDT: number;
  storedAnnualFee: string;
  expiryDate: string | null;
  canEdit: boolean;
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function DojoMembershipCard({
  annualFeeBDT,
  storedAnnualFee,
  expiryDate,
  canEdit,
}: DojoMembershipCardProps) {
  const [feeInput, setFeeInput] = useState(storedAnnualFee);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSaved, setFeeSaved] = useState(false);
  const [savingFee, startSavingFee] = useTransition();

  const [payError, setPayError] = useState<string | null>(null);
  const [payPending, startPay] = useTransition();

  const expiry = expiryDate ? new Date(expiryDate) : null;
  const today = new Date();
  const daysLeft = expiry
    ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const renewedUntil = new Date(
    Math.max(expiry?.getTime() ?? Date.now(), Date.now()),
  );
  renewedUntil.setFullYear(renewedUntil.getFullYear() + 1);

  function saveFee() {
    setFeeError(null);
    setFeeSaved(false);
    const trimmed = feeInput.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && !Number.isFinite(value)) {
      setFeeError("Annual fee must be a number.");
      return;
    }
    startSavingFee(async () => {
      const res = await saveDojoAnnualFeeAction({ annualFee: value });
      if ("error" in res) setFeeError(res.error);
      else setFeeSaved(true);
    });
  }

  function pay() {
    setPayError(null);
    startPay(async () => {
      const res = await createDojoRenewalOrderAction();
      if (res && "error" in res) setPayError(res.error);
      // success path redirects to /portal/checkout — no further state change.
    });
  }

  return (
    <div className="space-y-5">
      <ExpiryBanner expiry={expiry} daysLeft={daysLeft} />

      {canEdit && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-sm p-4 space-y-3">
          <div>
            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
              Annual federation fee (BDT)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={feeInput}
                onChange={(e) => {
                  setFeeInput(e.target.value);
                  setFeeSaved(false);
                }}
                disabled={savingFee}
                placeholder={String(annualFeeBDT)}
                className="flex-1 bg-white border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm rounded-sm disabled:opacity-60"
              />
              <button
                type="button"
                onClick={saveFee}
                disabled={savingFee}
                className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-accent-red disabled:opacity-40 rounded-sm"
              >
                {savingFee ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Save size={12} />
                )}
                Save
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Leave blank to fall back to the federation default of ৳
              {annualFeeBDT.toLocaleString()}.
            </p>
            {feeError && <p className="text-xs text-red-600 mt-1.5">{feeError}</p>}
            {feeSaved && (
              <p className="text-xs text-emerald-600 mt-1.5 inline-flex items-center gap-1">
                <Check size={12} /> Saved
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center gap-2">
          <RefreshCw size={14} className="text-accent-red" />
          <h4 className="text-xs font-bold text-zinc-900 tracking-wide">
            Renewal summary
          </h4>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          <Row label="Annual federation fee">
            ৳{getEffectiveFee(storedAnnualFee, annualFeeBDT).toLocaleString()}
          </Row>
          <Row
            label={
              <span className="inline-flex items-center gap-1.5 text-zinc-500">
                <Calendar size={13} /> Valid until
              </span>
            }
          >
            {fmtDate.format(renewedUntil)}
          </Row>
          <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-900">Total</span>
            <span className="text-lg font-bold text-accent-red">
              ৳
              {getEffectiveFee(
                storedAnnualFee,
                annualFeeBDT,
              ).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={pay}
            disabled={payPending}
            className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 transition-colors rounded-sm disabled:opacity-60"
          >
            {payPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Preparing checkout…
              </>
            ) : (
              <>
                <CreditCard size={16} />
                Proceed to payment
              </>
            )}
          </button>
          {payError && (
            <p className="text-xs text-red-600 mt-2 text-center">{payError}</p>
          )}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
            <Shield size={11} />
            SSLCommerz · bKash · Nagad · Cards
          </p>
        </div>
      </div>
    </div>
  );
}

function getEffectiveFee(stored: string, fallback: number): number {
  const trimmed = stored.trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

function Row({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold text-zinc-900">{children}</span>
    </div>
  );
}

function ExpiryBanner({
  expiry,
  daysLeft,
}: {
  expiry: Date | null;
  daysLeft: number | null;
}) {
  if (!expiry) {
    return (
      <Banner
        tone="muted"
        icon={<Clock size={18} className="text-zinc-400" />}
        title="No active dojo membership yet."
        body="Pay the federation fee below to activate this dojo's listing."
      />
    );
  }

  const expiryLabel = fmtDate.format(expiry);

  if (daysLeft !== null && daysLeft < 0) {
    return (
      <Banner
        tone="danger"
        icon={<XCircle size={18} className="text-red-500" />}
        title="Dojo membership has expired."
        body={`Expired on ${expiryLabel}. Renew to restore the public listing.`}
      />
    );
  }
  if (daysLeft !== null && daysLeft <= 30) {
    return (
      <Banner
        tone="warn"
        icon={<AlertTriangle size={18} className="text-amber-500" />}
        title="Dojo membership expiring soon."
        body={`Expires ${expiryLabel} — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`}
      />
    );
  }
  return (
    <Banner
      tone="ok"
      icon={<CheckCircle2 size={18} className="text-emerald-500" />}
      title="Dojo membership is active."
      body={`Expires ${expiryLabel}${daysLeft !== null ? ` (${daysLeft} days remaining)` : ""}. You can renew early to extend.`}
    />
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: "ok" | "warn" | "danger" | "muted";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 border-amber-200 text-amber-800"
        : tone === "danger"
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-zinc-50 border-zinc-200 text-zinc-700";
  const subCls =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-zinc-500";
  return (
    <div className={`flex items-start gap-3 p-4 rounded-sm border ${cls}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className={`text-xs mt-0.5 ${subCls}`}>{body}</p>
      </div>
    </div>
  );
}
