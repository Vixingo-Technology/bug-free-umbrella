import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    Award,
    Calendar,
    CheckCircle2,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    ShieldCheck,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
    title: "Enlist Your Dojo — JKA Bangladesh",
    description:
        "Affiliate your dojo with the only JKA-recognised federation in Bangladesh. Access our digital portal, host certified gradings, and join the national family of Shotokan instructors.",
};

const benefits = [
    {
        icon: ShieldCheck,
        title: "JKA-recognised affiliation",
        body: "Become an officially listed branch of Japan Karate Association Bangladesh — the sole legal representative of JKA in the country.",
    },
    {
        icon: Trophy,
        title: "Tournaments & seminars",
        body: "Priority invitations to national tournaments, regional events, and special seminars led by visiting JKA Sensei.",
    },
    {
        icon: GraduationCap,
        title: "Certified gradings",
        body: "Host JKA-syllabus gradings at your dojo with official examiners. Your students receive certificates signed by the federation.",
    },
    {
        icon: LayoutDashboard,
        title: "Digital portal access",
        body: "Manage every student, attendance record, payment, and certificate from one cinematic dashboard built for instructors.",
    },
    {
        icon: Users,
        title: "Instructor development",
        body: "Yearly refresher courses, kata research clinics, and direct access to senior national instructors.",
    },
    {
        icon: Sparkles,
        title: "Marketing & visibility",
        body: "Your dojo appears on the public branch locator with photos, schedules, and contact details — discoverable nationwide.",
    },
];

const requirements = [
    "A qualified head instructor holding minimum 1st Dan (Shodan) certified by JKA or affiliated body.",
    "A dedicated training space (dojo) of suitable size with a clean, safe floor.",
    "Commitment to follow the official JKA syllabus for kihon, kata, and kumite.",
    "Valid contact information, including a primary email and phone number.",
    "Acceptance of the JKA Bangladesh Code of Conduct and federation by-laws.",
];

const portalFeatures = [
    {
        title: "Member management",
        body: "Full roster of students with belt rank, profile photo, contact, and progress timeline — searchable in seconds.",
    },
    {
        title: "Attendance & schedule",
        body: "QR-based session check-in, weekly schedule editor, and absence analytics tracked by class.",
    },
    {
        title: "Grading & certificates",
        body: "Apply students for gradings, track results, and generate digitally signed PDF certificates with a single click.",
    },
];

export default function EnlistDojoPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-24 bg-bg-charcoal border-b border-zinc-200 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <Image
                        src="https://picsum.photos/seed/dojo-enlist-hero/1800/900"
                        alt=""
                        fill
                        className="object-cover grayscale"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="max-w-5xl mx-auto px-6 lg:px-12 relative">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-6">
                        Enlist Your Dojo
                    </p>
                    <h1 className="font-karate text-4xl md:text-6xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-8">
                        Bring your dojo into the{" "}
                        <span className="text-accent-red italic lowercase font-serif font-normal">
                            JKA family
                        </span>
                    </h1>
                    <div className="h-px w-24 bg-accent-red mb-8" />
                    <p className="text-lg md:text-xl text-zinc-700 leading-relaxed max-w-3xl mb-10">
                        Affiliate with the only federation in Bangladesh
                        directly chartered by the Japan Karate Association
                        World Federation. Stand alongside more than 50
                        registered branches, certify your students under the
                        official JKA syllabus, and run your dojo from a single,
                        beautiful digital portal.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/enlist-dojo/signup"
                            className="inline-flex items-center gap-3 bg-accent-red text-white px-8 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors group"
                        >
                            Enlist Now
                            <ArrowRight
                                size={16}
                                className="group-hover:translate-x-1 transition-transform"
                            />
                        </Link>
                        <a
                            href="#requirements"
                            className="inline-flex items-center gap-3 border border-zinc-300 text-zinc-700 px-8 py-4 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors"
                        >
                            See Requirements
                        </a>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-24 bg-bg-deep">
                <div className="max-w-6xl mx-auto px-6 lg:px-12">
                    <div className="grid lg:grid-cols-3 gap-12 mb-16">
                        <div className="lg:col-span-1">
                            <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                                Perks of affiliation
                            </p>
                            <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15] mb-6">
                                Why affiliate{" "}
                                <span className="text-accent-red italic lowercase font-serif font-normal">
                                    with us
                                </span>
                            </h2>
                            <div className="h-px w-16 bg-accent-red" />
                        </div>
                        <div className="lg:col-span-2 text-zinc-700 text-lg leading-relaxed">
                            <p>
                                Affiliating with JKA Bangladesh is more than a
                                certificate on the wall — it is a working
                                partnership. Your dojo joins a federation that
                                actively invests in instructor growth, student
                                recognition, and national reach.
                            </p>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {benefits.map((b) => {
                            const Icon = b.icon;
                            return (
                                <div
                                    key={b.title}
                                    className="bg-white border border-zinc-200 p-8 rounded-sm shadow-sm hover:border-accent-red/40 hover:shadow-md transition-all"
                                >
                                    <div className="w-12 h-12 rounded-sm bg-accent-red/10 flex items-center justify-center mb-6">
                                        <Icon
                                            size={22}
                                            className="text-accent-red"
                                        />
                                    </div>
                                    <h3 className="font-serif font-bold text-lg text-zinc-900 mb-3">
                                        {b.title}
                                    </h3>
                                    <p className="text-zinc-600 leading-relaxed text-sm">
                                        {b.body}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Portal preview */}
            <section className="py-24 bg-bg-charcoal border-y border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-12">
                    <div className="text-center mb-16">
                        <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                            Digital Portal
                        </p>
                        <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15] mb-6">
                            Run your dojo from a{" "}
                            <span className="text-accent-red italic lowercase font-serif font-normal">
                                single dashboard
                            </span>
                        </h2>
                        <div className="h-px w-16 bg-accent-red mx-auto" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {portalFeatures.map((f) => (
                            <div
                                key={f.title}
                                className="bg-white border border-zinc-200 p-8 rounded-sm shadow-sm"
                            >
                                <h3 className="font-serif font-bold text-lg text-zinc-900 mb-3">
                                    {f.title}
                                </h3>
                                <p className="text-zinc-600 leading-relaxed text-sm">
                                    {f.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Requirements */}
            <section
                id="requirements"
                className="py-24 bg-bg-deep scroll-mt-24"
            >
                <div className="max-w-5xl mx-auto px-6 lg:px-12">
                    <div className="grid lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-1">
                            <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                                Eligibility
                            </p>
                            <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15] mb-6">
                                Requirements{" "}
                                <span className="text-accent-red italic lowercase font-serif font-normal">
                                    to enlist
                                </span>
                            </h2>
                            <div className="h-px w-16 bg-accent-red" />
                        </div>
                        <ul className="lg:col-span-2 space-y-5">
                            {requirements.map((r) => (
                                <li
                                    key={r}
                                    className="flex items-start gap-4 text-zinc-700 text-base leading-relaxed"
                                >
                                    <CheckCircle2
                                        size={20}
                                        className="text-accent-red shrink-0 mt-1"
                                    />
                                    <span>{r}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Payment details */}
            <section className="py-24 bg-bg-charcoal border-y border-zinc-200">
                <div className="max-w-5xl mx-auto px-6 lg:px-12">
                    <div className="text-center mb-12">
                        <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                            Fees
                        </p>
                        <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15] mb-6">
                            Affiliation{" "}
                            <span className="text-accent-red italic lowercase font-serif font-normal">
                                & dues
                            </span>
                        </h2>
                        <div className="h-px w-16 bg-accent-red mx-auto" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white border border-zinc-200 p-10 rounded-sm shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <Award
                                    size={20}
                                    className="text-accent-red"
                                />
                                <h3 className="font-serif font-bold text-lg text-zinc-900">
                                    One-time enlistment fee
                                </h3>
                            </div>
                            <p className="font-karate text-3xl font-bold text-zinc-900 mb-4">
                                ৳ 10,000
                            </p>
                            <p className="text-zinc-600 leading-relaxed text-sm">
                                Covers certification review, federation listing,
                                onboarding of your head instructor, and digital
                                portal provisioning.
                            </p>
                        </div>
                        <div className="bg-white border border-zinc-200 p-10 rounded-sm shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <Calendar
                                    size={20}
                                    className="text-accent-red"
                                />
                                <h3 className="font-serif font-bold text-lg text-zinc-900">
                                    Annual renewal
                                </h3>
                            </div>
                            <p className="font-karate text-3xl font-bold text-zinc-900 mb-4">
                                ৳ 6,000{" "}
                                <span className="text-base text-zinc-500 font-sans font-normal">
                                    / year
                                </span>
                            </p>
                            <p className="text-zinc-600 leading-relaxed text-sm">
                                Keeps your dojo certified, students event-eligible,
                                and your portal access active. Renewable 60 days
                                before expiry.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-3 text-xs text-zinc-500 justify-center">
                        <CreditCard size={14} />
                        <span className="uppercase tracking-widest font-bold">
                            Payable via SSLCommerz · bKash · Nagad · Card
                        </span>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 bg-bg-deep">
                <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
                    <h2 className="font-karate text-3xl md:text-5xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15] mb-6">
                        Ready to{" "}
                        <span className="text-accent-red italic lowercase font-serif font-normal">
                            enlist?
                        </span>
                    </h2>
                    <p className="text-zinc-700 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
                        Complete the registration in a few guided steps. Verify
                        your email, settle the enlistment fee, and your dojo
                        dashboard will be live the same day.
                    </p>
                    <Link
                        href="/enlist-dojo/signup"
                        className="inline-flex items-center gap-3 bg-accent-red text-white px-10 py-5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors group"
                    >
                        Start Enlistment
                        <ArrowRight
                            size={16}
                            className="group-hover:translate-x-1 transition-transform"
                        />
                    </Link>
                </div>
            </section>

            <Footer />
        </main>
    );
}
