import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Benefits from "@/components/benefits";

export const metadata: Metadata = {
    title: "About — JKA Bangladesh",
    description:
        "Japan Karate Association Bangladesh — the sole legal representative of JKA in Bangladesh, directly affiliated with JKA World Federation, Tokyo. Preserving the spirit of Shotokan since 1978.",
};

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-20 bg-bg-charcoal border-b border-zinc-200 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <Image
                        src="https://picsum.photos/seed/dojo-hero/1800/900"
                        alt=""
                        fill
                        className="object-cover grayscale"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="max-w-5xl mx-auto px-6 lg:px-12 relative">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-6">
                        About Us
                    </p>
                    <h1 className="font-karate text-4xl md:text-6xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-8">
                        Japan Karate Association{" "}
                        <span className="text-accent-red italic lowercase font-serif font-normal">
                            of
                        </span>{" "}
                        Bangladesh
                    </h1>
                    <div className="h-px w-24 bg-accent-red mb-8" />
                    <p className="text-lg md:text-xl text-zinc-700 leading-relaxed max-w-3xl">
                        The sole legal representative of the Japan Karate
                        Association in Bangladesh — directly affiliated with
                        the JKA World Federation in Tokyo, Japan. For nearly
                        five decades we have preserved the discipline,
                        respect, and uncompromising standards of traditional
                        Shotokan karate-do.
                    </p>
                </div>
            </section>

            {/* Heritage / History */}
            <section className="py-24 bg-bg-deep">
                <div className="max-w-6xl mx-auto px-6 lg:px-12">
                    <div className="grid lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-1">
                            <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                                Heritage
                            </p>
                            <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-6">
                                A line traced back{" "}
                                <span className="text-accent-red italic lowercase font-serif font-normal">
                                    to the source
                                </span>
                            </h2>
                            <div className="h-px w-16 bg-accent-red" />
                        </div>

                        <div className="lg:col-span-2 space-y-6 text-zinc-700 text-lg leading-relaxed">
                            <p>
                                The Japan Karate Association (JKA) was founded
                                in Tokyo in 1949 by senior students of Gichin
                                Funakoshi — the Okinawan master who carried
                                karate-do to mainland Japan. In 1957 the
                                Japanese Ministry of Education formally
                                recognised the JKA as the national body for
                                the promotion of karate, with Masatoshi
                                Nakayama as its first Chief Instructor.
                            </p>
                            <p>
                                JKA Bangladesh began its journey in 1978,
                                planting the first roots of authentic
                                Shotokan in this country. Decades later, we
                                remain the only organisation in Bangladesh
                                directly chartered by JKA Headquarters in
                                Tokyo, following the syllabus, rank
                                standards, and examiner protocols issued by
                                the parent body.
                            </p>
                            <p>
                                Between 2016 and 2020 — until international
                                travel was halted by the COVID-19 pandemic —
                                JKA Bangladesh pioneered the regular
                                invitation of world-renowned Japanese
                                instructors to Dhaka, raising the technical
                                level of Bangladeshi karateka and connecting
                                local students directly to the Honbu Dojo
                                tradition.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Timeline */}
            <section className="py-24 bg-bg-charcoal border-y border-zinc-200">
                <div className="max-w-5xl mx-auto px-6 lg:px-12">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        Milestones
                    </p>
                    <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-16">
                        Nearly five decades{" "}
                        <span className="text-accent-red italic lowercase font-serif font-normal">
                            of practice
                        </span>
                    </h2>

                    <div className="space-y-10">
                        {[
                            {
                                year: "1949",
                                title: "JKA founded in Tokyo",
                                body: "Senior students of Gichin Funakoshi establish the Japan Karate Association as the formal body for Shotokan research and instruction.",
                            },
                            {
                                year: "1978",
                                title: "JKA arrives in Bangladesh",
                                body: "The first JKA-affiliated dojo opens in Dhaka, introducing authentic Shotokan training to Bangladesh.",
                            },
                            {
                                year: "1990s",
                                title: "Regional expansion",
                                body: "Branches established across Dhaka, Chattogram, Sylhet, Rajshahi, and Khulna divisions.",
                            },
                            {
                                year: "2016 – 2020",
                                title: "Era of the visiting Sensei",
                                body: "JKA Bangladesh hosts a sustained programme of seminars led by senior JKA instructors from Japan, lifting national technical standards.",
                            },
                            {
                                year: "Today",
                                title: "A national federation",
                                body: "Over 50 registered branches and a community of more than 700 active members, all training to JKA World Federation standards.",
                            },
                        ].map((m) => (
                            <div
                                key={m.year}
                                className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 border-l-2 border-accent-red/30 pl-6"
                            >
                                <div className="font-heading font-bold text-2xl md:text-3xl text-accent-red whitespace-nowrap">
                                    {m.year}
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-xl text-zinc-900 mb-2">
                                        {m.title}
                                    </h3>
                                    <p className="text-zinc-700 leading-relaxed">
                                        {m.body}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission & Philosophy */}
            <section className="py-24 bg-bg-deep">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-start">
                    <div>
                        <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                            Mission
                        </p>
                        <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-6">
                            Character before{" "}
                            <span className="text-accent-red italic lowercase font-serif font-normal">
                                technique
                            </span>
                        </h2>
                        <div className="h-px w-16 bg-accent-red mb-8" />
                        <div className="space-y-5 text-zinc-700 text-lg leading-relaxed">
                            <p>
                                Our mission is to cultivate not only physical
                                strength, but the indomitable spirit,
                                character, and discipline that traditional
                                karate-do demands. We follow the exact
                                syllabus and standards set by the masters in
                                Japan, without dilution or shortcut.
                            </p>
                            <p>
                                The dojo is the place where this work begins.
                                Every belt awarded, every kata corrected, and
                                every examination conducted in Bangladesh is
                                measured against the same standard upheld at
                                the JKA Honbu Dojo in Tokyo.
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                            Dojo Kun
                        </p>
                        <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-6">
                            The five{" "}
                            <span className="text-accent-red italic lowercase font-serif font-normal">
                                precepts
                            </span>
                        </h2>
                        <div className="h-px w-16 bg-accent-red mb-8" />
                        <ul className="space-y-5 text-zinc-700 text-lg leading-relaxed">
                            {[
                                "Seek perfection of character",
                                "Be faithful",
                                "Endeavour",
                                "Respect others",
                                "Refrain from violent behaviour",
                            ].map((line, idx) => (
                                <li key={line} className="flex gap-4">
                                    <span className="font-heading font-bold text-accent-red w-6">
                                        {idx + 1}.
                                    </span>
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Affiliation */}
            <section className="py-24 bg-bg-charcoal border-y border-zinc-200">
                <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        Affiliation
                    </p>
                    <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-8">
                        Direct line to{" "}
                        <span className="text-accent-red italic lowercase font-serif font-normal">
                            Tokyo
                        </span>
                    </h2>
                    <div className="h-px w-16 bg-accent-red mx-auto mb-8" />
                    <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl mx-auto mb-12">
                        JKA Bangladesh is the only organisation in this
                        country recognised by the JKA World Federation,
                        headquartered in Tokyo, Japan. Our members hold the
                        official JKA passport — accepted at affiliated dojos
                        in more than 100 countries — and our Dan
                        certifications are issued and verifiable directly by
                        the parent body.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                        {[
                            { value: "1949", label: "JKA Founded (Tokyo)" },
                            { value: "1978", label: "JKA in Bangladesh" },
                            { value: "100+", label: "Countries Affiliated" },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="border border-zinc-200 bg-white/40 backdrop-blur-sm p-6 rounded-sm"
                            >
                                <div className="font-heading font-bold text-3xl text-zinc-900 mb-2">
                                    {s.value}
                                </div>
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* National Reach */}
            <section className="py-24 bg-bg-deep">
                <div className="max-w-6xl mx-auto px-6 lg:px-12">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        National Reach
                    </p>
                    <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-12">
                        A federation that{" "}
                        <span className="text-accent-red italic lowercase font-serif font-normal">
                            spans
                        </span>{" "}
                        the country
                    </h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                        {[
                            { name: "Dhaka", count: 24 },
                            { name: "Chattogram", count: 12 },
                            { name: "Sylhet", count: 6 },
                            { name: "Rajshahi", count: 5 },
                            { name: "Khulna", count: 4 },
                        ].map((region) => (
                            <div
                                key={region.name}
                                className="border border-zinc-200 bg-bg-charcoal p-6 rounded-sm"
                            >
                                <div className="font-heading font-bold text-4xl text-accent-red mb-2">
                                    {region.count}
                                </div>
                                <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                                    {region.name}
                                </p>
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mt-1">
                                    Division
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/branches"
                            className="group inline-flex items-center gap-2 px-6 py-3 bg-accent-red text-white text-xs tracking-[0.3em] uppercase font-bold hover:bg-accent-gold transition-colors"
                        >
                            Find a Dojo
                            <ArrowRight
                                size={14}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </Link>
                        <Link
                            href="/journey"
                            className="group inline-flex items-center gap-2 px-6 py-3 border border-zinc-300 text-zinc-800 text-xs tracking-[0.3em] uppercase font-bold hover:border-accent-red hover:text-accent-red transition-colors"
                        >
                            The Belt Journey
                            <ArrowRight
                                size={14}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Privileges */}
            <Benefits />

            {/* Contact */}
            <section className="py-24 bg-bg-charcoal border-t border-zinc-200">
                <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        Visit Us
                    </p>
                    <h2 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-8">
                        Begin your{" "}
                        <span className="text-accent-red italic lowercase font-serif font-normal">
                            training
                        </span>
                    </h2>
                    <div className="h-px w-16 bg-accent-red mx-auto mb-8" />
                    <div className="inline-block text-left p-8 border border-zinc-200 bg-white/40 backdrop-blur-sm rounded-sm">
                        <p className="font-serif font-bold text-zinc-900 mb-2">
                            Japan Karate Association Bangladesh
                        </p>
                        <p className="text-zinc-700">
                            National Sports Council, 62/3 Purana Paltan
                        </p>
                        <p className="text-zinc-700">Dhaka, Bangladesh</p>
                        <p className="mt-4 text-zinc-700">
                            Email:{" "}
                            <a
                                href="mailto:info@jkabangladesh.com"
                                className="text-accent-red hover:underline"
                            >
                                info@jkabangladesh.com
                            </a>
                        </p>
                        <p className="text-zinc-700">Phone: +880 1234 567890</p>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
