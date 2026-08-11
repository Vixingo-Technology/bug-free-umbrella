import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    ArrowRight,
    CheckCircle2,
    Circle,
    Clock,
    Mail,
    RefreshCcw,
    ShieldAlert,
    XCircle,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFees } from "@/lib/settings/fees";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";
import PrintReceiptButton from "./print-button";

export const metadata: Metadata = {
    title: "Enlistment Confirmation — JKA Bangladesh",
    robots: { index: false, follow: false },
};

type SearchParams = Promise<{
    applicationId?: string;
    status?: string;
    reason?: string;
}>;

export default async function EnlistDojoSuccessPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const params = await searchParams;

    if (params.status === "failed") {
        return <FailureScreen reason={params.reason ?? null} />;
    }

    const applicationId = params.applicationId?.trim() || null;
    if (!applicationId) {
        redirect("/enlist-dojo");
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const application = await prisma.dojoApplication.findUnique({
        where: { id: applicationId },
        select: {
            id: true,
            dojoName: true,
            contactName: true,
            contactRole: true,
            contactRank: true,
            email: true,
            phone: true,
            status: true,
            updatedAt: true,
            userId: true,
        },
    });

    if (
        !application ||
        (user && application.userId && application.userId !== user.id)
    ) {
        redirect("/enlist-dojo");
    }

    const { dojoEnlistmentFeeBDT } = await getFees();

    return (
        <SuccessScreen
            application={application}
            email={user?.email ?? application.email}
            enlistmentFeeBDT={dojoEnlistmentFeeBDT}
        />
    );
}

type Application = {
    id: string;
    dojoName: string;
    contactName: string;
    contactRole: string;
    contactRank: string | null;
    email: string;
    phone: string;
    status: string;
    updatedAt: Date;
};

function SuccessScreen({
    application,
    email,
    enlistmentFeeBDT,
}: {
    application: Application;
    email: string;
    enlistmentFeeBDT: number;
}) {
    const reference = `DOJO-${application.id.slice(0, 8).toUpperCase()}`;
    const submittedAt = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: DEFAULT_TIME_ZONE,
    }).format(application.updatedAt);

    const checklist = [
        {
            state: "done" as const,
            title: "Email verified",
            body: `${email} confirmed via one-time code.`,
        },
        {
            state: "done" as const,
            title: "Payment received",
            body: `Enlistment fee of ৳ ${enlistmentFeeBDT.toLocaleString(
                "en-IN"
            )} settled successfully.`,
        },
        {
            state: "in_progress" as const,
            title: "Federation review in progress",
            body: "JKA staff will verify your application within 1–2 working days.",
        },
        {
            state: "pending" as const,
            title: "Complete your dojo profile",
            body: "Add interior photos, trainer bios, and schedule to go live in the public locator.",
        },
    ];

    return (
        <div className="min-h-screen bg-bg-charcoal relative overflow-hidden py-12 flex items-center justify-center print:bg-white print:py-0">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-emerald-400/5 blur-[120px] pointer-events-none print:hidden" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-gold/5 blur-[100px] pointer-events-none print:hidden" />

            <div className="w-full max-w-2xl mx-auto px-6 relative z-10">
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:border-0">
                    <div
                        role="status"
                        aria-live="polite"
                        className="bg-emerald-50 border-b border-emerald-200 px-8 py-6 flex items-start gap-4 print:bg-white print:border-zinc-200"
                    >
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-700 mb-1">
                                Payment successful
                            </p>
                            <h1 className="font-serif text-xl md:text-2xl font-bold text-zinc-900 leading-tight">
                                Enlistment submitted
                            </h1>
                            <p className="text-zinc-700 text-sm leading-relaxed mt-1">
                                Your dojo is now in the federation queue. We've
                                emailed a receipt to{" "}
                                <span className="font-semibold">{email}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="hidden print:flex items-center gap-3 px-8 py-6 border-b border-zinc-200">
                        <Image
                            src={Logo}
                            alt="JKA Bangladesh"
                            width={40}
                            height={40}
                        />
                        <div>
                            <p className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                                JKA Bangladesh
                            </p>
                            <p className="text-sm font-semibold text-zinc-900">
                                Dojo Enlistment Receipt
                            </p>
                        </div>
                    </div>

                    <div className="px-8 py-6 border-b border-zinc-200">
                        <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-400 mb-4">
                            Reference details
                        </p>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                            <KV label="Application ID" value={reference} mono />
                            <KV label="Submitted" value={submittedAt} />
                            <KV label="Dojo" value={application.dojoName} />
                            <KV
                                label="Dojo Head"
                                value={`${application.contactName}${
                                    application.contactRank
                                        ? ` · ${application.contactRank}`
                                        : ""
                                }`}
                            />
                            <KV label="Email" value={application.email} />
                            <KV label="Phone" value={application.phone} />
                        </div>
                    </div>

                    <div className="px-8 py-6 border-b border-zinc-200 print:hidden">
                        <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-400 mb-4">
                            What happens next
                        </p>
                        <ol className="space-y-3">
                            {checklist.map((item, idx) => (
                                <ChecklistRow
                                    key={item.title}
                                    index={idx + 1}
                                    state={item.state}
                                    title={item.title}
                                    body={item.body}
                                />
                            ))}
                        </ol>
                    </div>

                    <div className="px-8 py-6 print:hidden">
                        <Link
                            href="/portal?enlistment=success"
                            className="w-full inline-flex items-center justify-center gap-3 bg-accent-red text-white px-6 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors group rounded-sm"
                        >
                            Continue to Dojo Portal
                            <ArrowRight
                                size={14}
                                className="group-hover:translate-x-1 transition-transform"
                            />
                        </Link>

                        <div className="grid sm:grid-cols-2 gap-3 mt-3">
                            <PrintReceiptButton />
                            <a
                                href="mailto:support@jkabangladesh.com?subject=Enlistment%20support"
                                className="inline-flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 px-4 py-3 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors rounded-sm"
                            >
                                <Mail size={14} />
                                Contact support
                            </a>
                        </div>

                        <p className="text-[11px] text-zinc-500 text-center mt-6 leading-relaxed">
                            Keep your application ID{" "}
                            <span className="font-mono font-semibold text-zinc-700">
                                {reference}
                            </span>{" "}
                            for reference in any correspondence.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FailureScreen({ reason }: { reason: string | null }) {
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
                                Payment unsuccessful
                            </p>
                            <h1 className="font-serif text-xl md:text-2xl font-bold text-zinc-900 leading-tight">
                                We couldn&apos;t complete your enlistment
                            </h1>
                            <p className="text-zinc-700 text-sm leading-relaxed mt-1">
                                No charge has been finalised on your account.
                                Please try again or contact us if the problem
                                persists.
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
                                <p className="leading-relaxed">
                                    {reason ??
                                        "The payment gateway returned an error before your enlistment could be saved."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6">
                        <Link
                            href="/enlist-dojo/payment"
                            className="w-full inline-flex items-center justify-center gap-3 bg-accent-red text-white px-6 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors group rounded-sm"
                        >
                            <RefreshCcw size={14} />
                            Try payment again
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

function KV({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                {label}
            </p>
            <p
                className={`text-sm text-zinc-900 ${
                    mono ? "font-mono font-semibold" : ""
                }`}
            >
                {value}
            </p>
        </div>
    );
}

function ChecklistRow({
    index,
    state,
    title,
    body,
}: {
    index: number;
    state: "done" | "in_progress" | "pending";
    title: string;
    body: string;
}) {
    const styles = {
        done: {
            ring: "bg-emerald-600 text-white",
            label: "Complete",
            labelClass: "text-emerald-700 bg-emerald-50",
            icon: <CheckCircle2 size={16} />,
        },
        in_progress: {
            ring: "bg-amber-500 text-white",
            label: "In progress",
            labelClass: "text-amber-800 bg-amber-50",
            icon: <Clock size={16} />,
        },
        pending: {
            ring: "bg-zinc-300 text-zinc-600",
            label: "Up next",
            labelClass: "text-zinc-600 bg-zinc-100",
            icon: <Circle size={14} />,
        },
    }[state];

    return (
        <li className="flex items-start gap-4">
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${styles.ring}`}
                aria-hidden
            >
                {styles.icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-900 text-sm">
                        <span className="text-zinc-400 mr-1">
                            {index.toString().padStart(2, "0")}
                        </span>
                        {title}
                    </p>
                    <span
                        className={`text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full ${styles.labelClass}`}
                    >
                        {styles.label}
                    </span>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed mt-1">
                    {body}
                </p>
            </div>
        </li>
    );
}
