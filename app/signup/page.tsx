import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CheckCircle2,
    Mail,
    UserRound,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";

export const metadata: Metadata = {
    title: "Join JKA Bangladesh",
    description:
        "Pick how you want to join JKA Bangladesh — as a student training at an affiliated dojo, or as a Dojo Head opening a new branch.",
};

type ChoiceProps = {
    href: string;
    title: string;
    eyebrow: string;
    body: string;
    bullets: string[];
    icon: React.ReactNode;
    cta: string;
};

const CHOICES: ChoiceProps[] = [
    {
        href: "/signup/student",
        eyebrow: "Train at a dojo",
        title: "I'm joining as a student",
        body: "Apply to train at an affiliated JKA branch. Track your belt progress, certificates, and grading applications from your member portal.",
        bullets: [
            "Personal training journal & rank history",
            "Apply for federation-recognised gradings",
            "Register for tournaments and seminars",
        ],
        icon: <UserRound size={22} />,
        cta: "Continue as student",
    },
    {
        href: "/enlist-dojo",
        eyebrow: "Open a dojo",
        title: "I'm opening or affiliating a dojo",
        body: "Enlist your dojo with the federation. Get listed in the public locator, host certified gradings, and manage your roster from the Dojo Dashboard.",
        bullets: [
            "Official JKA-Bangladesh recognition",
            "Manage students, attendance & gradings",
            "Invite instructors and managers to your dojo",
        ],
        icon: <Building2 size={22} />,
        cta: "Enlist a dojo",
    },
];

export default function SignupChooserPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-charcoal relative overflow-hidden py-12">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-4xl p-6 relative z-10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8 group"
                >
                    <ArrowLeft
                        size={16}
                        className="group-hover:-translate-x-1 transition-transform"
                    />
                    Back to home
                </Link>

                <div className="flex flex-col items-center text-center mb-10">
                    <Image
                        src={Logo}
                        alt="JKA Bangladesh"
                        width={56}
                        height={56}
                        className="mb-5"
                    />
                    <p className="text-[10px] tracking-[0.3em] uppercase text-accent-red font-bold mb-3">
                        Join JKA Bangladesh
                    </p>
                    <h1 className="font-serif text-3xl md:text-4xl font-bold text-zinc-900 mb-3 leading-tight max-w-2xl">
                        How would you like to join?
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base leading-relaxed max-w-xl">
                        Pick the path that fits you. You can always switch
                        later, and Dojo Heads can invite their team after they
                        enlist.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                    {CHOICES.map((c) => (
                        <Choice key={c.href} {...c} />
                    ))}
                </div>

                <div className="mt-10 bg-white border border-zinc-200 rounded-sm px-5 py-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
                        <Mail size={16} />
                    </div>
                    <div className="flex-1 text-sm text-zinc-700 leading-relaxed">
                        <p className="font-semibold text-zinc-900 mb-0.5">
                            Got an invite from your dojo?
                        </p>
                        <p className="text-zinc-600">
                            Check your inbox for the activation link from JKA
                            Bangladesh. Already activated?{" "}
                            <Link
                                href="/login"
                                className="text-accent-red font-semibold hover:text-accent-gold transition-colors"
                            >
                                Sign in here
                            </Link>
                            .
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs text-zinc-500 mt-8">
                    Already a member?{" "}
                    <Link
                        href="/login"
                        className="text-accent-red font-semibold hover:text-accent-gold transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

function Choice({
    href,
    title,
    eyebrow,
    body,
    bullets,
    icon,
    cta,
}: ChoiceProps) {
    return (
        <Link
            href={href}
            className="group block bg-white border border-zinc-200 rounded-sm p-7 shadow-sm hover:border-accent-red hover:shadow-md transition-all relative"
        >
            <div className="flex items-start justify-between gap-4 mb-5">
                <div className="w-12 h-12 rounded-sm bg-accent-red/10 flex items-center justify-center text-accent-red shrink-0">
                    {icon}
                </div>
                <ArrowRight
                    size={18}
                    className="text-zinc-300 group-hover:text-accent-red group-hover:translate-x-1 transition-all"
                    aria-hidden
                />
            </div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-accent-red font-bold mb-2">
                {eyebrow}
            </p>
            <h2 className="font-serif text-xl font-bold text-zinc-900 mb-2 leading-snug">
                {title}
            </h2>
            <p className="text-zinc-600 text-sm leading-relaxed mb-5">
                {body}
            </p>
            <ul className="space-y-2 mb-6">
                {bullets.map((b) => (
                    <li
                        key={b}
                        className="flex items-start gap-2 text-zinc-700 text-sm"
                    >
                        <CheckCircle2
                            size={14}
                            className="text-emerald-600 shrink-0 mt-0.5"
                            aria-hidden
                        />
                        <span>{b}</span>
                    </li>
                ))}
            </ul>
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-accent-red">
                {cta}
                <ArrowRight
                    size={12}
                    className="group-hover:translate-x-1 transition-transform"
                />
            </span>
        </Link>
    );
}
