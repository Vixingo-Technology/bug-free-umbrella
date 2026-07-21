import type { Metadata } from "next";
import { ArrowRight, Layers3, Mountain, Sparkles, Zap } from "lucide-react";

export const metadata: Metadata = {
    title: "JKA Karate Techniques | JKA Bangladesh",
    description:
        "Explore the JKA training trinity of kihon, kata, and kumite, and understand how they lead to kime in traditional Shotokan Karate.",
};

const pillars = [
    {
        title: "Kihon",
        subtitle: "Basics",
        description:
            "Kihon is the foundation of all technique. JKA training emphasizes posture, balance, angle, and repetition so every movement is built correctly from the start.",
    },
    {
        title: "Kata",
        subtitle: "Forms",
        description:
            "Kata preserves the core of karate skill. Through repeated practice, movements become efficient, automatic, and deeply understood rather than mechanical.",
    },
    {
        title: "Kumite",
        subtitle: "Sparring",
        description:
            "Kumite applies what is learned in kihon and kata. It develops timing, awareness, and natural response so technique can be used freely and appropriately.",
    },
];

const progression = [
    {
        title: "Study the fundamentals",
        description:
            "Continuous repetition of the basics builds correct form, power, and precision. If the fundamentals are wrong, progress cannot be stable.",
    },
    {
        title: "Internalize the forms",
        description:
            "Kata teaches the body to move with less conscious effort, allowing the mind to remain calm while the technique becomes more natural.",
    },
    {
        title: "Apply with freedom",
        description:
            "In kumite, the same principles are expressed in a living situation, where timing and adaptation matter as much as technique itself.",
    },
];

export default function Page() {
    return (
        <div className="max-w-5xl mx-auto space-y-12">
            <div>
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                    Training System
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    JKA Karate{" "}
                    <span className="text-accent-red italic">Techniques</span>
                </h1>
                <div className="h-px w-24 bg-accent-red mb-8" />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    The foundation of karate is the inseparable trinity of
                    kihon, kata, and kumite. At the JKA, these are studied
                    together, because technique, speed, strength, and progress
                    all rest on them as one unified system.
                </p>
            </div>

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 p-6 md:p-8 shadow-sm">
                    <div className="absolute right-0 bottom-0 opacity-10 font-karate text-8xl font-black text-zinc-900 select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
                        JKA
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <Layers3 className="w-5 h-5 text-accent-red" />
                            <h2 className="font-serif font-bold text-2xl text-zinc-900">
                                The Inseparable Trinity
                            </h2>
                        </div>
                        <p className="text-zinc-700 leading-relaxed">
                            Kihon, kata, and kumite are not separate islands.
                            Without kihon there can be no meaningful kata or
                            kumite. Kata without kumite becomes rote movement,
                            while kumite without kata loses the smoothness and
                            agility that define karate.
                        </p>
                        <p className="text-zinc-700 leading-relaxed">
                            JKA training gives equal importance to all three so
                            the practitioner can build a complete and balanced
                            understanding of karate-do.
                        </p>
                        <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-red">
                            <span>Kihon</span>
                            <ArrowRight className="w-4 h-4" />
                            <span>Kata</span>
                            <ArrowRight className="w-4 h-4" />
                            <span>Kumite</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-900 text-white p-6 md:p-8 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <Mountain className="w-5 h-5 text-accent-red" />
                        <h2 className="font-serif font-bold text-2xl text-white">
                            Lead to Kime
                        </h2>
                    </div>
                    <p className="text-zinc-300 leading-relaxed mb-5">
                        When body and mind move together and a technique is
                        delivered with complete focus, the result is kime. This
                        is the decisive expression of karate, and it is the
                        ultimate purpose of the kihon-kata-kumite trinity.
                    </p>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm uppercase tracking-[0.3em] text-accent-red font-bold mb-2">
                            Key Idea
                        </p>
                        <p className="text-zinc-200 leading-relaxed">
                            Kime is not just force. It is total commitment,
                            timing, and unity of technique at the exact moment
                            of impact.
                        </p>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        How the JKA Builds Technique
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    {pillars.map((pillar, index) => (
                        <article
                            key={pillar.title}
                            className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                    <span className="font-serif font-bold text-accent-red text-sm">
                                        0{index + 1}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-accent-red font-bold">
                                        {pillar.subtitle}
                                    </p>
                                    <h3 className="font-serif font-bold text-xl text-zinc-900">
                                        {pillar.title}
                                    </h3>
                                </div>
                            </div>
                            <p className="text-zinc-600 leading-relaxed text-sm">
                                {pillar.description}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="space-y-6 pt-2">
                <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        From Fundamentals to Free Application
                    </h2>
                </div>

                <div className="grid gap-4">
                    {progression.map((step, index) => (
                        <div
                            key={step.title}
                            className="flex gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-5 shadow-sm"
                        >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-zinc-200 font-serif font-bold text-accent-red pb-1  ">
                                {index + 1}
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-lg text-zinc-900 mb-1">
                                    {step.title}
                                </h3>
                                <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
                <h2 className="font-serif font-bold text-2xl text-zinc-900">
                    The JKA Approach
                </h2>
                <p className="text-zinc-700 leading-relaxed">
                    At the JKA, the emphasis is always on studying kihon, kata,
                    and kumite equally and simultaneously. The method is
                    scientific, step-by-step, and built on continuous
                    repetition, because correct fundamentals are the base of all
                    later progress.
                </p>
                <p className="text-zinc-700 leading-relaxed">
                    With this approach, karate becomes more than mechanical
                    movement. It becomes a disciplined way to move naturally,
                    respond freely, and express true power with kime.
                </p>
            </section>
        </div>
    );
}
