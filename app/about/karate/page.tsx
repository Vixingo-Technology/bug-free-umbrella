import type { Metadata } from "next";
import {
    Award,
    Compass,
    Globe,
    Shield,
    Activity,
    Users,
    Sparkles,
    Layers3,
    Mountain,
    Zap,
    ArrowRight,
    ExternalLink,
    Calendar
} from "lucide-react";

export const metadata: Metadata = {
    title: "JKA Karate | JKA Bangladesh",
    description: "Explore traditional Shotokan Karate training at JKA Bangladesh. Discover the training system of Kihon, Kata, Kumite, and their path to Kime.",
};

export default function JkaKaratePage() {
    const pillars = [
        {
            num: "01",
            title: "Kihon",
            subtitle: "Basics",
            short: "The foundation of karate. Students develop correct stances, punches, strikes, blocks, and kicks through consistent repetition.",
            details: "JKA training emphasizes posture, balance, angle, and repetition so every movement is built correctly from the start. Practitioners repeat basic techniques until efficient movement becomes second-nature."
        },
        {
            num: "02",
            title: "Kata",
            subtitle: "Forms",
            short: "A sequence of traditional techniques that preserves the principles of combat while developing balance, rhythm, and concentration.",
            details: "Kata preserves the core of karate skill. Through repeated practice, movements become efficient, automatic, and deeply understood rather than mechanical. It forms the library of karate combat application."
        },
        {
            num: "03",
            title: "Kumite",
            subtitle: "Sparring",
            short: "Controlled partner practice that develops timing, distance, awareness, and composure through disciplined application of technique.",
            details: "Kumite applies what is learned in kihon and kata. It develops timing, awareness, and natural response so technique can be used freely and appropriately, without uncontrolled aggression or injury."
        }
    ];

    const benefits = [
        {
            icon: Shield,
            title: "Technical Excellence",
            desc: "Training emphasises efficient body mechanics, strong fundamentals, balanced movement, and effective power generation."
        },
        {
            icon: Globe,
            title: "International Standards",
            desc: "JKA grading is conducted under globally recognised technical criteria, allowing practitioners to earn qualifications respected throughout the worldwide JKA network."
        },
        {
            icon: Activity,
            title: "Lifelong Practice",
            desc: "The principles of Shougai Karate encourage safe, progressive training that can be adapted to every stage of life."
        },
        {
            icon: Users,
            title: "Character Development",
            desc: "Through regular practice, students cultivate discipline, humility, perseverance, respect, integrity, and self-control—qualities that extend well beyond the dojo."
        }
    ];

    const progression = [
        {
            title: "Study the fundamentals",
            description: "Continuous repetition of the basics builds correct form, power, and precision. If the fundamentals are wrong, progress cannot be stable."
        },
        {
            title: "Internalize the forms",
            description: "Kata teaches the body to move with less conscious effort, allowing the mind to remain calm while the technique becomes more natural."
        },
        {
            title: "Apply with freedom",
            description: "In kumite, the same principles are expressed in a living situation, where timing and adaptation matter as much as technique itself."
        }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-16">
            {/* Header Section */}
            <div>
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4 font-sans">
                    Training System
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    JKA <span className="text-accent-red italic">Karate</span>
                </h1>
                <div className="h-px w-24 bg-accent-red mb-8" />
            </div>

            {/* Section 1: Tradition of Shotokan */}
            <section id="tradition" className="scroll-mt-28 space-y-6">
                <h2 className="font-serif font-bold text-2xl text-zinc-900 mb-4 flex items-center gap-3">
                    <Compass className="w-5 h-5 text-accent-red" />
                    The Tradition of Authentic Shotokan
                </h2>
                <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed text-base space-y-6 font-sans">
                    <p className="text-lg text-zinc-800 leading-relaxed font-medium">
                        The Japan Karate Association (JKA) is one of the world&apos;s oldest and most respected organisations dedicated to the preservation and advancement of traditional Shotokan Karate.
                    </p>
                    <p>
                        Founded by the direct students of Master Gichin Funakoshi, the father of modern karate, the JKA has established the technical standards that continue to guide Shotokan practitioners across the globe.
                    </p>
                    <p>
                        Unlike sport-oriented organisations that focus primarily on competition, the JKA upholds Karate-Do as a lifelong martial discipline. Its training philosophy is rooted in Budo—the martial way—and the principle of Ippon, the pursuit of a single decisive technique executed with precision, timing, and control.
                    </p>
                </div>
            </section>

            {/* Section 2: JKA Training System */}
            <section id="training-system" className="scroll-mt-28 space-y-8 pt-8 border-t border-zinc-200">
                <h2 className="font-serif font-bold text-2xl text-zinc-900 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-accent-red" />
                    The JKA Training System (San-Min)
                </h2>
                
                <p className="text-zinc-700 leading-relaxed font-sans">
                    JKA Shotokan is recognised for its disciplined methodology, precise technique, and emphasis on developing the complete martial artist. Every aspect of training is designed to cultivate physical ability, mental focus, and strength of character. Training is built upon three fundamental, inseparable disciplines:
                </p>

                {/* 3 Pillars Cards */}
                <div className="grid grid-cols-1 gap-6 pt-2 font-sans">
                    {pillars.map((pillar) => (
                        <div
                            key={pillar.title}
                            className="rounded-xl border border-zinc-150 bg-zinc-50/50 p-6 shadow-sm hover:shadow transition-shadow"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                    <span className="font-serif font-bold text-accent-red text-sm">
                                        {pillar.num}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-xl text-zinc-900">
                                        {pillar.title}
                                    </h3>
                                    <p className="text-xs font-semibold tracking-wider text-accent-red uppercase">
                                        {pillar.subtitle}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3 text-zinc-600 text-sm leading-relaxed">
                                <p className="font-medium text-zinc-800">{pillar.short}</p>
                                <p>{pillar.details}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Inseparable Trinity & Kime Sub-block */}
                <div className="grid gap-6 md:grid-cols-2 pt-6 font-sans">
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 p-6 shadow-sm">
                        <div className="absolute right-0 bottom-0 opacity-[0.03] font-karate text-7xl font-black text-zinc-900 select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
                            JKA
                        </div>
                        <div className="relative z-10 space-y-3">
                            <div className="flex items-center gap-2">
                                <Layers3 className="w-4 h-4 text-accent-red" />
                                <h4 className="font-serif font-bold text-lg text-zinc-900">
                                    The Inseparable Trinity
                                </h4>
                            </div>
                            <p className="text-zinc-650 text-sm leading-relaxed">
                                Kihon, kata, and kumite are not separate islands. Without kihon there can be no meaningful kata or kumite. Kata without kumite becomes rote movement, while kumite without kata loses the fluidity that defines karate.
                            </p>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-red pt-1">
                                <span>Kihon</span>
                                <ArrowRight className="w-3 h-3" />
                                <span>Kata</span>
                                <ArrowRight className="w-3 h-3" />
                                <span>Kumite</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-150 bg-zinc-900 text-white p-6 shadow-lg">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Mountain className="w-4 h-4 text-accent-red" />
                                <h4 className="font-serif font-bold text-lg text-white">
                                    Lead to Kime
                                </h4>
                            </div>
                            <p className="text-zinc-300 text-sm leading-relaxed">
                                When body and mind move together and a technique is delivered with complete focus, the result is <strong>kime</strong>. This is the decisive expression of karate, and it is the ultimate purpose of the trinity.
                            </p>
                            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                                <span className="font-bold text-accent-red block mb-1">KEY CONCEPT</span>
                                Kime is not just force. It is total commitment, timing, and unity of mind and body at the exact moment of impact.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progression Sub-block */}
                <div className="space-y-4 pt-6 font-sans">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-accent-red" />
                        <h4 className="font-serif font-bold text-lg text-zinc-900">
                            From Fundamentals to Free Application
                        </h4>
                    </div>
                    <div className="grid gap-3">
                        {progression.map((step, index) => (
                            <div
                                key={step.title}
                                className="flex gap-4 rounded-xl border border-zinc-150 bg-zinc-50/50 p-4 shadow-sm"
                            >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-zinc-200 font-serif font-bold text-accent-red text-sm">
                                    {index + 1}
                                </div>
                                <div>
                                    <h5 className="font-serif font-bold text-zinc-950 text-base mb-1">
                                        {step.title}
                                    </h5>
                                    <p className="text-zinc-650 text-sm leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 3: Why Train in JKA Karate */}
            <section id="why-train" className="scroll-mt-28 space-y-8 pt-8 border-t border-zinc-200">
                <h2 className="font-serif font-bold text-2xl text-zinc-900 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-accent-red" />
                    Why Train in JKA Karate?
                </h2>
                
                <p className="text-zinc-700 leading-relaxed font-sans">
                    JKA training develops far more than self-defence skills. It provides a structured path for continuous personal growth and refinement through disciplined practice.
                </p>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                    {benefits.map((b) => {
                        const Icon = b.icon;
                        return (
                            <div key={b.title} className="flex gap-4 p-4 border border-zinc-150 rounded-xl bg-white shadow-sm hover:shadow transition-shadow">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-accent-red" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-serif font-bold text-lg text-zinc-900 mb-1">
                                        {b.title}
                                    </h4>
                                    <p className="text-zinc-600 text-sm leading-relaxed">
                                        {b.desc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 bg-zinc-50 border-l-4 border-accent-red text-zinc-700 text-sm md:text-base leading-relaxed font-sans rounded-r-lg shadow-sm">
                    JKA Karate measures success not simply by victory in competition, but by continuous improvement in both technique and character. The ultimate objective is the harmonious development of body, mind, and spirit.
                </div>
            </section>

            {/* Section 4: Dan Ranking & Grading System */}
            <section id="dan-ranking" className="scroll-mt-28 space-y-8 pt-8 border-t border-zinc-200">
                <h2 className="font-serif font-bold text-2xl text-zinc-900 flex items-center gap-3">
                    <Award className="w-5 h-5 text-accent-red" />
                    Dan Ranking &amp; Grading System
                </h2>

                <p className="text-zinc-700 leading-relaxed font-sans">
                    The JKA grading system provides a structured framework for measuring progress and recognising achievement. Understanding the grading process helps students set clear goals and train with purpose.
                </p>

                {/* Kari Grading */}
                <div className="font-sans space-y-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent-red" />
                        <h4 className="font-serif font-bold text-lg text-zinc-900">
                            Kari (Grading)
                        </h4>
                    </div>
                    <p className="text-zinc-700 text-sm leading-relaxed">
                        Kari is used in two ways depending on the student&apos;s age:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-zinc-150 bg-zinc-50/50 p-5 shadow-sm">
                            <span className="inline-block text-xs uppercase tracking-[0.2em] text-accent-red font-bold mb-2">
                                Kids (Under 13)
                            </span>
                            <p className="text-zinc-700 text-sm leading-relaxed">
                                Kari is used as a grading level to promote encouragement. This approach supports younger students by recognising their effort and progress, keeping them motivated on their karate journey.
                            </p>
                        </div>
                        <div className="rounded-xl border border-zinc-150 bg-zinc-50/50 p-5 shadow-sm">
                            <span className="inline-block text-xs uppercase tracking-[0.2em] text-accent-red font-bold mb-2">
                                Students (13 &amp; Above)
                            </span>
                            <p className="text-zinc-700 text-sm leading-relaxed">
                                For students aged 13 and above, including adults, if for any reason a student doesn&apos;t pass their grading, they can receive a Kari level rather than failing them. This ensures continued progress and recognition of effort.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Kyu Grading Schedule */}
                <div className="font-sans space-y-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent-red" />
                        <h4 className="font-serif font-bold text-lg text-zinc-900">
                            Kyu Grading Schedule
                        </h4>
                    </div>
                    <p className="text-zinc-700 text-sm leading-relaxed">
                        Kyu gradings are recommended to be carried out 3 times a year:
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { month: "April", detail: "Last week of April" },
                            { month: "August", detail: "Last week of August" },
                            { month: "December", detail: "Last week of December" },
                        ].map((period) => (
                            <div
                                key={period.month}
                                className="flex items-center gap-3 bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-sm"
                            >
                                <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                                <span className="text-sm font-bold uppercase tracking-wider">
                                    {period.detail}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Official JKA Link */}
                <div className="p-6 bg-zinc-50 border-l-4 border-accent-red rounded-r-lg shadow-sm font-sans">
                    <p className="text-zinc-700 text-sm md:text-base leading-relaxed mb-4">
                        For a comprehensive overview of the official certification system, including Dan rank requirements and examination criteria, visit the official JKA website.
                    </p>
                    <a
                        href="https://www.jka.or.jp/en/about-jka/dan-ranking/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-accent-red text-white text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                        JKA Kyu &amp; Dan Rank Certification System
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </section>
        </div>
    );
}
