"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  X,
  XCircle,
} from "lucide-react";
import {
  createDojoRenewalOrderAction,
  saveDojoAnnualFeeAction,
} from "@/app/portal/dojo/settings/actions";

type Feedback =
  | { kind: "success"; expiry: string | null }
  | { kind: "failed"; reason: string }
  | null;

export type DojoMembershipCardProps = {
  annualFeeBDT: number;
  storedAnnualFee: string;
  expiryDate: string | null;
  canEdit: boolean;
  feedback?: Feedback;
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
  feedback,
}: DojoMembershipCardProps) {
  const [feeInput, setFeeInput] = useState(storedAnnualFee);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSaved, setFeeSaved] = useState(false);
  const [savingFee, startSavingFee] = useTransition();

  const [payError, setPayError] = useState<string | null>(null);
  const [payPending, startPay] = useTransition();

  const [popup, setPopup] = useState<Feedback>(feedback ?? null);
  useEffect(() => {
    setPopup(feedback ?? null);
  }, [feedback]);
  function closePopup() {
    setPopup(null);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    ["status", "reason", "orderId", "expiry", "dev"].forEach((k) =>
      url.searchParams.delete(k),
    );
    // Full navigation (not replaceState) so the layout re-renders WITH the
    // auth cookie — SSLCommerz's cross-site POST → GET chain can strip
    // SameSite=Lax cookies on the return hop, hiding the portal sidebar
    // until a real GET is issued.
    window.location.replace(url.pathname + (url.search ? url.search : ""));
  }

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

      <RenewalPopup popup={popup} onClose={closePopup} />
    </div>
  );
}

function RenewalPopup({
  popup,
  onClose,
}: {
  popup: Feedback;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>
            {popup.kind === "success" ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-600 mb-2">
                  Dojo renewed
                </p>
                <h2 className="text-2xl font-bold text-zinc-900">
                  Thank you!
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Your dojo membership has been renewed.
                </p>
                {popup.expiry && (
                  <div className="mt-6 rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                      Valid until
                    </p>
                    <p className="mt-1 text-lg font-bold text-zinc-900">
                      {fmtDate.format(new Date(popup.expiry))}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-sm transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                  <XCircle size={36} />
                </div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-2">
                  Renewal failed
                </p>
                <h2 className="text-2xl font-bold text-zinc-900">
                  Payment did not go through
                </h2>
                <p className="mt-2 text-sm text-zinc-500">{popup.reason}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-sm transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
