import type { Metadata } from "next";
import Link from "next/link";
import { Mail, RefreshCcw, ShieldAlert, XCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "Payment unsuccessful — JKA Bangladesh",
    robots: { index: false, follow: false },
};

type SearchParams = Promise<{
    applicationId?: string;
    reason?: string;
    cancelled?: string;
}>;

export default async function EnlistDojoFailedPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const params = await searchParams;
    const applicationId = params.applicationId?.trim() || null;
    const cancelled = params.cancelled === "1";
    const reason =
        params.reason?.trim() ||
        (cancelled
            ? "You cancelled the payment before it was completed."
            : "The payment gateway declined the transaction. No charge has been made.");

    const retryHref = applicationId
        ? `/enlist-dojo/payment?applicationId=${encodeURIComponent(
              applicationId,
          )}`
        : "/enlist-dojo/payment";

    return (
        <div className="min-h-screen bg-bg-charcoal relative overflow-hidden py-12 flex items-center justify-center">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-red/5 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-xl mx-auto px-6 relative z-10">
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden">
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="bg-accent-red/10 border-b border-accent-red/30 px-8 py-6 flex items-start gap-4"
                    >
                        <div className="w-12 h-12 rounded-full bg-accent-red text-white flex items-center justify-center shrink-0">
                            <XCircle size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent-red mb-1">
                                {cancelled
                                    ? "Payment cancelled"
                                    : "Payment unsuccessful"}
                            </p>
                            <h1 className="font-serif text-xl md:text-2xl font-bold text-zinc-900 leading-tight">
                                We couldn&apos;t complete your enlistment
                            </h1>
                            <p className="text-zinc-700 text-sm leading-relaxed mt-1">
                                Your enlistment is still saved as a pending
                                application. Retry the payment to activate your
                                dojo.
                            </p>
                        </div>
                    </div>

                    <div className="px-8 py-6 border-b border-zinc-200">
                        <div className="flex items-start gap-3 text-sm text-zinc-700">
                            <ShieldAlert
                                size={18}
                                className="text-accent-red shrink-0 mt-0.5"
                            />
                            <div>
                                <p className="font-semibold text-zinc-900 mb-1">
                                    What went wrong
                                </p>
                                <p className="leading-relaxed">{reason}</p>
                                {applicationId && (
                                    <p className="mt-3 text-xs text-zinc-500">
                                        Application reference:{" "}
                                        <span className="font-mono font-semibold text-zinc-700">
                                            DOJO-
                                            {applicationId
                                                .slice(0, 8)
                                                .toUpperCase()}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6">
                        <Link
                            href={retryHref}
                            className="w-full inline-flex items-center justify-center gap-3 bg-accent-red text-white px-6 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors group rounded-sm"
                        >
                            <RefreshCcw size={14} />
                            Try payment again
                        </Link>
                        <Link
                            href="/portal?enlistment=pay_later"
                            className="w-full inline-flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 px-4 py-3 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors rounded-sm mt-3"
                        >
                            Continue to dashboard
                        </Link>
                        <a
                            href="mailto:support@jkabangladesh.com?subject=Enlistment%20payment%20issue"
                            className="w-full inline-flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 px-4 py-3 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors rounded-sm mt-3"
                        >
                            <Mail size={14} />
                            Contact support
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
