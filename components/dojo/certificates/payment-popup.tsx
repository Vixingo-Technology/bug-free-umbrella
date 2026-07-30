"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export type CertificatePaymentFeedback =
    | { kind: "success"; submittedCount: number }
    | { kind: "failed"; reason: string; orderId: string | null }
    | null;

export default function CertificatePaymentPopup({
    feedback,
}: {
    feedback: CertificatePaymentFeedback;
}) {
    const [popup, setPopup] = useState<CertificatePaymentFeedback>(feedback);

    function closePopup() {
        setPopup(null);
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        ["status", "reason", "orderId", "dev", "issued"].forEach((k) =>
            url.searchParams.delete(k),
        );
        // Full navigation (not replaceState) so any downstream server data
        // — e.g. the newly-submitted rows in the history list — refetches.
        window.location.replace(url.pathname + (url.search ? url.search : ""));
    }

    return (
        <AnimatePresence>
            {popup && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm px-4"
                    onClick={closePopup}
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
                            onClick={closePopup}
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
                                    Payment successful
                                </p>
                                <h2 className="text-2xl font-bold text-zinc-900">
                                    Certificates submitted
                                </h2>
                                <p className="mt-2 text-sm text-zinc-500">
                                    {popup.submittedCount > 0
                                        ? `${popup.submittedCount} certificate request${popup.submittedCount === 1 ? "" : "s"} sent to JKA HQ for approval.`
                                        : "Your certificate request has been sent to JKA HQ for approval."}
                                </p>
                                <p className="mt-2 text-xs text-zinc-400">
                                    Certificates become available for download once an admin approves them.
                                </p>
                                <button
                                    type="button"
                                    onClick={closePopup}
                                    className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
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
                                    Payment failed
                                </p>
                                <h2 className="text-2xl font-bold text-zinc-900">
                                    Payment did not go through
                                </h2>
                                <p className="mt-2 text-sm text-zinc-500">
                                    {popup.reason}
                                </p>
                                <div className="mt-6 flex flex-col gap-2">
                                    {popup.orderId && (
                                        <Link
                                            href={`/portal/checkout?orderId=${popup.orderId}`}
                                            className="w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                        >
                                            Try payment again
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        onClick={closePopup}
                                        className="w-full inline-flex items-center justify-center border border-zinc-200 hover:border-accent-red hover:text-accent-red text-zinc-700 font-bold text-sm py-3 rounded-xl transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
