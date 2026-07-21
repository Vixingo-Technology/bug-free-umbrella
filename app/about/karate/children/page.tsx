import type { Metadata } from "next";
import { BookOpen, Brain, Heart, ShieldAlert, Users } from "lucide-react";

export const metadata: Metadata = {
    title: "Children | JKA Bangladesh",
    description:
        "Discover how JKA karate helps children and youth develop focus, discipline, confidence, and physical strength.",
};

const developmentPillars = [
    {
        icon: Brain,
        title: "Chiiku",
        subtitle: "Mental development",
        description:
            "Karate helps build concentration, focus, clear thinking, and decisiveness.",
    },
    {
        icon: Heart,
        title: "Tokuiku",
        subtitle: "Moral development",
        description:
            "It cultivates patience, discipline, perseverance, understanding, confidence, self-control, courtesy, and calmness.",
    },
    {
        icon: ShieldAlert,
        title: "Taiiku",
        subtitle: "Physical development",
        description:
            "Karate strengthens the heart, bones, and muscles while supporting resilience and resistance to sickness and injury.",
    },
];

const youthPrograms = [
    "Separate youth tournaments in Japan for ages 6–18, established in 1983 at the 26th JKA All Japan Karate Championship.",
    "A dedicated annual tournament for elementary and junior high school students.",
    "A youth division at the Shoto World Cup Karate Championship tournaments.",
    "National-scale karate camps for school-age youth at the JKA headquarters in Tokyo.",
];

export default function Page() {
    return (
        <div className="max-w-5xl mx-auto space-y-12">
            <div>
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                    Karate for Children
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    JKA <span className="text-accent-red italic">Children</span>
                </h1>
                <div className="h-px w-24 bg-accent-red mb-8" />
                <p className="text-lg text-zinc-700 leading-relaxed max-w-3xl">
                    At the JKA, we have thousands of children and youth members
                    from elementary school to high school learning the values of
                    karate and applying them in their daily life.
                </p>
            </div>

            <section className="grid gap-6 lg:grid-cols-1">
                <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <Users className="w-5 h-5 text-accent-red" />
                        <h2 className="font-serif font-bold text-2xl text-zinc-900">
                            Youth Programs
                        </h2>
                    </div>
                    <p className="text-zinc-700 leading-relaxed mb-6">
                        JKA has long supported school-age karate through
                        structured tournaments, youth divisions, and camps
                        designed specifically for children and teenagers.
                    </p>
                    <ul className="space-y-4">
                        {youthPrograms.map((program) => (
                            <li
                                key={program}
                                className="flex gap-3 text-zinc-700 leading-relaxed"
                            >
                                <span className="mt-2 h-2 w-2 rounded-full bg-accent-red shrink-0" />
                                <span>{program}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-zinc-900 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 font-karate text-8xl font-black text-white select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
                        JKA
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-accent-red" />
                            <h2 className="font-serif font-bold text-2xl text-white">
                                Why Children Benefit
                            </h2>
                        </div>
                        <p className="text-zinc-300 leading-relaxed">
                            Karate is not only fun. It supports the same three
                            classes of personal development found in traditional
                            education: mental, moral, and physical growth.
                        </p>
                        <p className="text-zinc-300 leading-relaxed">
                            It gives young people balance and perspective at an
                            age when these are needed most, and helps build a
                            strong foundation for character.
                        </p>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        Three Forms of Development
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    {developmentPillars.map((pillar) => {
                        const Icon = pillar.icon;

                        return (
                            <article
                                key={pillar.title}
                                className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
                            >
                                <div className="flex items-center gap-3 mb-3 ">
                                    <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-2">
                                        <Icon className="w-5 h-5 text-accent-red" />
                                    </div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-accent-red font-bold mb-2">
                                        {pillar.subtitle}
                                    </p>
                                </div>
                                <h3 className="font-serif font-bold text-xl text-zinc-900 mb-3">
                                    {pillar.title}
                                </h3>
                                <p className="text-zinc-600 leading-relaxed text-sm">
                                    {pillar.description}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        Safety First
                    </h2>
                </div>

                <p className="text-zinc-700 leading-relaxed">
                    Other karate organizations often allow children as young as
                    six or seven to start kumite, or sparring. At the JKA,
                    sparring is not allowed until a child is ten years old and
                    in the fifth grade, helping reduce the possibility of injury
                    while preserving the spirit of training.
                </p>
            </section>
        </div>
    );
}
