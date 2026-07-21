import type { Metadata } from "next";
import Link from "next/link";
import {
    Award,
    Compass,
    Globe,
    Shield,
    Activity,
    Users,
    Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
    title: "JKA Karate Features | JKA Bangladesh",
    description:
        "Explore the core features of JKA Karate: Kihon, Kata, and Kumite. Learn about the tradition of authentic Shotokan Karate training.",
};

export default function FeaturesPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-12">
            {/* Header Section */}
            <div>
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                    Training System
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    JKA Karate{" "}
                    <span className="text-accent-red italic">Features</span>
                </h1>
                <div className="h-px w-24 bg-accent-red mb-8" />
            </div>

            {/* The Tradition of Authentic Shotokan */}
            <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed text-base space-y-6">
                <h2 className="font-serif font-bold text-2xl text-zinc-900 mb-4 flex items-center gap-3">
                    <Compass className="w-5 h-5 text-accent-red" />
                    The Tradition of Authentic Shotokan
                </h2>
                <p className="text-lg text-zinc-800 leading-relaxed font-medium">
                    The Japan Karate Association (JKA) is one of the world's
                    oldest and most respected organisations dedicated to the
                    preservation and advancement of traditional Shotokan Karate.
                </p>
                <p>
                    Founded by the direct students of Master Gichin Funakoshi,
                    the father of modern karate, the JKA has established the
                    technical standards that continue to guide Shotokan
                    practitioners across the globe.
                </p>
                <p>
                    Unlike sport-oriented organisations that focus primarily on
                    competition, the JKA upholds Karate-Do as a lifelong martial
                    discipline. Its training philosophy is rooted in Budo—the
                    martial way—and the principle of Ippon, the pursuit of a
                    single decisive technique executed with precision, timing,
                    and control.
                </p>
            </div>

            {/* The JKA Training System */}
            <div className="space-y-6 pt-4">
                <h2 className="font-serif font-bold text-2xl text-zinc-900 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-accent-red" />
                    The JKA Training System (San-Min)
                </h2>
                <p className="text-zinc-700 leading-relaxed">
                    JKA Shotokan is recognised for its disciplined methodology,
                    precise technique, and emphasis on developing the complete
                    martial artist. Every aspect of training is designed to
                    cultivate physical ability, mental focus, and strength of
                    character.
                </p>

                {/* 3 Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 pt-2">
                    <Link
                        href="/about/karate/techniques"
                        className="block rounded-lg border border-zinc-100 bg-zinc-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/70 focus-visible:ring-offset-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <span className="font-serif font-bold text-accent-red text-lg">
                                01
                            </span>
                        </div>
                        <h3 className="font-serif font-bold text-xl text-zinc-900 mb-2">
                            Kihon
                        </h3>
                        <p className="text-xs font-semibold tracking-wider text-accent-red uppercase mb-3">
                            Basics
                        </p>
                        <p className="text-zinc-600 text-sm leading-relaxed">
                            The foundation of karate. Students develop correct
                            stances, punches, strikes, blocks, and kicks through
                            consistent repetition until efficient movement
                            becomes instinctive.
                        </p>
                    </Link>

                    <Link
                        href="/about/karate/techniques"
                        className="block rounded-lg border border-zinc-100 bg-zinc-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/70 focus-visible:ring-offset-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <span className="font-serif font-bold text-accent-red text-lg">
                                02
                            </span>
                        </div>
                        <h3 className="font-serif font-bold text-xl text-zinc-900 mb-2">
                            Kata
                        </h3>
                        <p className="text-xs font-semibold tracking-wider text-accent-red uppercase mb-3">
                            Forms
                        </p>
                        <p className="text-zinc-600 text-sm leading-relaxed">
                            A sequence of traditional techniques that preserves
                            the principles of combat while developing balance,
                            rhythm, concentration, and technical precision.
                        </p>
                    </Link>

                    <Link
                        href="/about/karate/techniques"
                        className="block rounded-lg border border-zinc-100 bg-zinc-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/70 focus-visible:ring-offset-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <span className="font-serif font-bold text-accent-red text-lg">
                                03
                            </span>
                        </div>
                        <h3 className="font-serif font-bold text-xl text-zinc-900 mb-2">
                            Kumite
                        </h3>
                        <p className="text-xs font-semibold tracking-wider text-accent-red uppercase mb-3">
                            Sparring
                        </p>
                        <p className="text-zinc-600 text-sm leading-relaxed">
                            Controlled partner practice that develops timing,
                            distance, awareness, and composure through
                            disciplined application of technique rather than
                            uncontrolled aggression.
                        </p>
                    </Link>
                </div>
            </div>

            {/* Why Train in JKA Karate? */}
            <div className="space-y-6 pt-4">
                <h2 className="font-serif font-bold text-2xl text-zinc-900 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-accent-red" />
                    Why Train in JKA Karate?
                </h2>
                <p className="text-zinc-700 leading-relaxed">
                    JKA training develops far more than self-defence skills. It
                    provides a structured path for continuous personal growth
                    through disciplined practice.
                </p>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex gap-4 p-4 border border-zinc-100 rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-accent-red" />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-serif font-bold text-lg text-zinc-900 mb-1">
                                Technical Excellence
                            </h4>
                            <p className="text-zinc-600 text-sm leading-relaxed">
                                Training emphasises efficient body mechanics,
                                strong fundamentals, balanced movement, and
                                effective power generation.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-zinc-100 rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-accent-red" />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-serif font-bold text-lg text-zinc-900 mb-1">
                                International Standards
                            </h4>
                            <p className="text-zinc-600 text-sm leading-relaxed">
                                JKA grading is conducted under globally
                                recognised technical criteria, allowing
                                practitioners to earn qualifications respected
                                throughout the worldwide network.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-zinc-100 rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-accent-red" />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-serif font-bold text-lg text-zinc-900 mb-1">
                                Lifelong Practice
                            </h4>
                            <p className="text-zinc-600 text-sm leading-relaxed">
                                The principles of Shougai Karate encourage safe,
                                progressive training that can be adapted to
                                every stage of life.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-zinc-100 rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-accent-red" />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-serif font-bold text-lg text-zinc-900 mb-1">
                                Character Development
                            </h4>
                            <p className="text-zinc-600 text-sm leading-relaxed">
                                Through regular practice, students cultivate
                                discipline, humility, perseverance, respect,
                                integrity, and self-control.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Concluding Message */}
            <div className="p-6 bg-zinc-50 rounded-lg border-l-4 border-accent-red text-zinc-700 text-sm md:text-base leading-relaxed">
                JKA Karate measures success not simply by victory in
                competition, but by continuous improvement in both technique and
                character. The ultimate objective is the harmonious development
                of body, mind, and spirit.
            </div>
        </div>
    );
}
