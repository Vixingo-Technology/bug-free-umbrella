"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
    Calendar,
    Award,
    BookOpen,
    MapPin,
    Activity,
    Quote,
    Users,
    Brain,
    Heart,
    ShieldAlert,
    Clock
} from "lucide-react";

// Masters Database
type MasterData = {
    id: string;
    shortName: string;
    fullName: string;
    years: string;
    image: string;
    born: string;
    passed: string;
    origin: string;
    rank: string;
    keyWork: string;
    role: string;
    intro: string;
    quote: string;
    quoteRole: string;
    chapters: { title: string; text: string[] }[];
};

const masters: MasterData[] = [
    {
        id: "funakoshi",
        shortName: "Funakoshi Gichin",
        fullName: "Supreme Master Funakoshi Gichin",
        years: "1868 – 1957",
        image: "/assets/masters/funakoshi.png",
        born: "Nov 10, 1868",
        passed: "Apr 26, 1957",
        origin: "Shuri, Okinawa",
        rank: "Father of Modern Karate",
        keyWork: "Shoto (Pine Waves)",
        role: "Supreme Master",
        intro: "Gichin Funakoshi is widely revered as the \"Father of Modern Karate\" and the founder of the Shotokan style. He devoted his life to transforming a secretive Okinawan martial art into a global path of physical education, self-defense, and character development.",
        quote: "The ultimate aim of karate lies not in victory or defeat, but in the perfection of the character of its participants.",
        quoteRole: "Supreme Master Gichin Funakoshi",
        chapters: [
            {
                title: "Early Life & Okinawan Roots",
                text: [
                    "Born into a samurai family in Shuri, Okinawa, Gichin Funakoshi was a weak and sickly child. To improve his health, his family enrolled him in martial arts training under the legendary Okinawan masters Ankō Asato and Ankō Itosu.",
                    "Under their strict tutelage, Funakoshi practiced Okinawan Te (the precursor to modern karate) in secret, as the practice of martial arts was banned by the Japanese government at the time. Through years of dedicated practice, he not only built a robust physical body but also developed a profound appreciation for the mental and philosophical aspects of the art."
                ]
            },
            {
                title: "Bringing Karate to Mainland Japan",
                text: [
                    "In 1922, at the age of 54, Funakoshi was selected to travel to Tokyo to demonstrate Okinawan karate-jutsu at the First Ministry of Education Physical Education Exhibition. His demonstrations captivated the audiences, including Jigoro Kano (the founder of Judo), who invited him to present at his Kodokan Dojo.",
                    "Encouraged by mainland martial artists and universities, Funakoshi chose to remain in Japan to spread the art. He established karate clubs at prestigious universities, including Keio, Waseda, and Takushoku. In 1939, his students built the first official dedicated dojo for him in Tokyo, naming it Shotokan—derived from Funakoshi's pen name, Shoto (meaning 'pine waves'), which he used when writing poetry and calligraphy."
                ]
            },
            {
                title: "Founding the JKA & Philosophical Legacy",
                text: [
                    "Following the destruction of the original Shotokan dojo during World War II, Funakoshi's senior students regrouped to establish the Japan Karate Association (JKA) in 1949. Funakoshi was appointed its first Supreme Master, providing symbolic and philosophical leadership.",
                    "Funakoshi firmly believed that karate should be practiced as a path to peace. He formulated the twenty precepts of karate (the Niju Kun), starting with the cardinal rule: 'Karate Ni Sente Nashi'—meaning 'There is no first strike in karate.' His philosophy taught that a karate practitioner must be calm, courteous, and avoid conflict whenever possible, using physical techniques only in absolute self-defense."
                ]
            }
        ]
    },
    {
        id: "nakayama",
        shortName: "Nakayama Masatoshi",
        fullName: "Master Nakayama Masatoshi",
        years: "1913 – 1987",
        image: "/assets/masters/nakayama.png",
        born: "Apr 13, 1913",
        passed: "Apr 15, 1987",
        origin: "Yamaguchi, Japan",
        rank: "10th Dan (Posthumous)",
        keyWork: "Best Karate Series",
        role: "1st Chief Instructor",
        intro: "Masatoshi Nakayama was a visionary master who bridged traditional Okinawan karate and modern sports science. As the long-serving Chief Instructor of the JKA, he created a standardized training method and established the international programs that spread Shotokan Karate around the globe.",
        quote: "The ultimate goal of karate-do is not to win over others, but to overcome oneself.",
        quoteRole: "Master Nakayama Masatoshi",
        chapters: [
            {
                title: "Early Life & Samurai Lineage",
                text: [
                    "Born in Yamaguchi Prefecture, Masatoshi Nakayama descended from the prominent Sanada samurai clan, who were historically skilled in kenjutsu (swordsmanship). Growing up with martial values, he enrolled at Takushoku University in 1932.",
                    "Due to a class schedule mix-up, Nakayama accidentally walked into a karate club session instead of his intended kendo practice. Fascinated by the training, he joined the club immediately. There, he trained under the founder of Shotokan, Gichin Funakoshi, and his highly influential son, Yoshitaka (Gigō) Funakoshi."
                ]
            },
            {
                title: "Studies in China & Returning to Japan",
                text: [
                    "After graduating with a degree in Chinese language and history in 1937, Nakayama traveled to China as an exchange student. He remained there for nearly a decade, studying various Chinese martial arts (wushu) and learning from local masters, which broadened his understanding of body mechanics and soft-style training.",
                    "Upon returning to war-torn Japan in 1946, he reunited with fellow Shotokan practitioners to resume training. He began working alongside other senior students to consolidate resources and plan the future of Shotokan Karate."
                ]
            },
            {
                title: "Modernizing and Globalizing the JKA",
                text: [
                    "In 1949, Nakayama co-founded the Japan Karate Association (JKA). While Funakoshi remained the formal Supreme Master, Nakayama was appointed the first Chief Instructor, a position he held for almost 40 years.",
                    "Nakayama revolutionized karate by applying principles of modern kinesiology, anatomy, and physics to traditional karate techniques. He co-created the JKA Instructor Trainee Program, which trained elite students to become professional instructors. These instructors were sent worldwide, establishing dojos and making Shotokan the most widely practiced karate style globally. He also introduced the first standardized competition rules for tournament sparring (kumite), helping karate gain acceptance as a modern sport."
                ]
            },
            {
                title: "Technical Writings & Legacy",
                text: [
                    "Nakayama was a prolific writer who documented Shotokan techniques in detail. He authored the famous 11-volume Best Karate series and Dynamic Karate, which continue to serve as the definitive technical guides for karate students worldwide.",
                    "Nakayama passed away on April 15, 1987, at the age of 74. He achieved the rank of 9th Dan during his lifetime and was posthumously awarded 10th Dan by the JKA, leaving behind an unmatched legacy of global expansion and scientific modernization."
                ]
            }
        ]
    },
    {
        id: "sugiura",
        shortName: "Sugiura Motokuni",
        fullName: "Master Sugiura Motokuni",
        years: "1924 – 2015",
        image: "/assets/masters/sugiura.png",
        born: "Oct 4, 1924",
        passed: "Aug 10, 2015",
        origin: "Aichi, Japan",
        rank: "9th Dan",
        keyWork: "JKA Kata Series",
        role: "2nd Chief Instructor",
        intro: "Motokuni Sugiura was a highly revered master who dedicated his career to refining and standardizing the technical foundation of JKA Shotokan. As the second Chief Instructor, he placed a intense focus on basic training (kihon) and kata, creating the definitive modern standards for JKA kata.",
        quote: "True karate is not about sports points. It is a lifelong journey of self-reflection, seeking to polish the spirit through correct posture, strong basics, and deep training.",
        quoteRole: "Master Sugiura Motokuni",
        chapters: [
            {
                title: "Early Life & Wartime Service",
                text: [
                    "Born on October 4, 1924, in Aichi Prefecture, Motokuni Sugiura began his karate journey at the age of 18 when he enrolled at Koa Junior College (now Asia University) in 1942. There, he trained directly under the founder of Shotokan, Gichin Funakoshi, and his son, Yoshitaka Funakoshi.",
                    "He achieved the rank of 1st Dan in March 1944. Shortly thereafter, during the height of World War II, Sugiura was called to military service and joined the Tsuchiura Navy Flying Corps, serving until the war concluded in August 1945."
                ]
            },
            {
                title: "JKA Leadership & Development",
                text: [
                    "Following the war, Sugiura returned to karate training in 1949 under the direction of Masatoshi Nakayama. In 1955, he began working full-time for the JKA in the Guidance Division.",
                    "Sugiura was key in establishing the JKA's early tournament rules, acting as a referee, and managing the instructors at the headquarters dojo. His career extended into academics, serving as a professor at Asia University, where he also instructed the university's karate team."
                ]
            },
            {
                title: "Chief Instructor & Preservation of Kata",
                text: [
                    "In 1991, during a period of organizational instability within the JKA, Sugiura was inaugurated as the second Chief Instructor (Shuseki Shihan) of the association. He immediately went to work to unify the organization and focus the training on the pure traditions of Shotokan.",
                    "Sugiura believed that the essence of karate layout lies in kata. He established a committee to carefully review, refine, and standardize all JKA kata, ensuring that the original teachings of Gichin Funakoshi were preserved without losing their martial efficacy. During his tenure, the JKA published the landmark Karate-Do Kata book series, widely considered the authoritative bible of Shotokan kata."
                ]
            },
            {
                title: "Retirement & Legacy",
                text: [
                    "Master Sugiura served as Chief Instructor until his retirement in 2009 at the age of 85. He passed away on August 10, 2015, at the age of 90. He is remembered by the JKA community as a gentle but strict teacher who preserved the technical purity of the art and insisted on respect and character above athletic prestige."
                ]
            }
        ]
    },
    {
        id: "ueki",
        shortName: "Ueki Masaaki",
        fullName: "Master Ueki Masaaki",
        years: "1939 – 2024",
        image: "/assets/masters/ueki.png",
        born: "Mar 24, 1939",
        passed: "Jul 14, 2024",
        origin: "Tokyo, Japan",
        rank: "10th Dan",
        keyWork: "JKA Gasshuku",
        role: "3rd Chief Instructor",
        intro: "Masaaki Ueki was a legendary master of JKA Shotokan Karate, famous for his lightning speed, incredible flexibility, and crisp execution of techniques. He made history as the first living 10th Dan in JKA history and served as the Chief Instructor until his passing in 2024.",
        quote: "Always remember—the mind and body are one. Karate is not just moving your limbs; it is directing your spirit into every strike, stance, and block.",
        quoteRole: "Master Ueki Masaaki",
        chapters: [
            {
                title: "Early Life & Initiation into Karate",
                text: [
                    "Born on March 24, 1939, in Tokyo, Masaaki Ueki began his Shotokan Karate training at the age of 16 under the guidance of Motokuni Sugiura. Prior to karate, Ueki had briefly trained in judo but felt it was not well suited to his leaner physical frame. He was instantly drawn to karate due to its reliance on speed, precision, and agility.",
                    "Ueki studied at Asia University and joined the university's karate club. Following his graduation in 1961, he entered the prestigious JKA Instructor Program, graduating in the same year alongside other legendary figures like Keinosuke Enoeda and Satoshi Miyazaki."
                ]
            },
            {
                title: "Competitive Success & Nakayama's Praise",
                text: [
                    "Ueki was a dominant figure in the competitive circuit during the 1960s. He became the JKA All-Japan Grand Champion in both 1965 and 1968, consistently displaying outstanding skill in both kata and kumite.",
                    "His extreme speed and the sharpness of his techniques were frequently praised in Masatoshi Nakayama's famous Best Karate book series, where he was featured demonstrating several advanced kata and kumite tactics."
                ]
            },
            {
                title: "Chief Instructor & 10th Dan Inauguration",
                text: [
                    "Ueki served as an Executive Director of the JKA starting in July 1995. On May 29, 2010, he was inaugurated as the third Chief Instructor (Shuseki Shihan) of the Japan Karate Association, succeeding his former teacher, Motokuni Sugiura.",
                    "Ueki held the rank of 10th Dan, which marked him as the first living 10th Dan in JKA history. He travelled extensively to lead international seminars (Gasshukus) and examinations, keeping JKA standards consistent and high throughout the global federation."
                ]
            },
            {
                title: "Passing & Legacy",
                text: [
                    "Master Masaaki Ueki passed away on July 14, 2024, at the age of 85, following an illness. He is remembered for his dedication to preserving the authentic techniques of traditional Shotokan Karate and his philosophy that the mind and body are one. He has been succeeded as Chief Instructor by Master Takeshi Oishi."
                ]
            }
        ]
    }
];

// Children Development Pillars
const developmentPillars = [
    {
        icon: Brain,
        title: "Chiiku",
        subtitle: "Mental development",
        description:
            "Karate helps build concentration, focus, clear thinking, and decisiveness."
    },
    {
        icon: Heart,
        title: "Tokuiku",
        subtitle: "Moral development",
        description:
            "It cultivates patience, discipline, perseverance, understanding, confidence, self-control, courtesy, and calmness."
    },
    {
        icon: ShieldAlert,
        title: "Taiiku",
        subtitle: "Physical development",
        description:
            "Karate strengthens the heart, bones, and muscles while supporting resilience and resistance to sickness and injury."
    }
];

const youthPrograms = [
    "Separate youth tournaments in Japan for ages 6–18, established in 1983 at the 26th JKA All Japan Karate Championship.",
    "A dedicated annual tournament for elementary and junior high school students.",
    "A youth division at the Shoto World Cup Karate Championship tournaments.",
    "National-scale karate camps for school-age youth at the JKA headquarters in Tokyo."
];

// Timeline Milestones
const chronologyEvents = [
    {
        year: "2015",
        title: "First Official JKA WF Country Licence for Bangladesh",
        description:
            "A historic milestone was achieved when Bangladesh received its first official JKA WF Country Licence—the first recognition of its kind in the nation's history. The licence was formally presented at the JKA WF Headquarters in Tokyo, where Sensei Tulu Ush Shams, Country Representative, led the Bangladesh delegation. He was accompanied by Sensei Imtiaz Salim during the official licensing ceremony."
    }
];

export default function ExtraPages() {
    const [activeMaster, setActiveMaster] = useState<string>("funakoshi");
    const selectedMaster = masters.find((m) => m.id === activeMaster) || masters[0];

    return (
        <div className="max-w-4xl mx-auto space-y-16">
            {/* Header Section */}
            <div>
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4 font-sans">
                    Resources & Details
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    Extra <span className="text-accent-red italic">Pages</span>
                </h1>
                <div className="h-px w-24 bg-accent-red mb-8" />
            </div>

            {/* Section 1: Masters Series */}
            <section id="masters" className="scroll-mt-28 space-y-8">
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        JKA Masters Series
                    </h2>
                </div>

                <p className="text-zinc-700 leading-relaxed font-sans">
                    Meet the pioneering masters who founded, standardized, and expanded Japan Karate Association (JKA) Shotokan Karate globally. Select a master below to view their complete biography.
                </p>

                {/* Masters Tab Selector */}
                <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
                    {masters.map((master) => {
                        const isTabActive = master.id === activeMaster;
                        return (
                            <button
                                key={master.id}
                                onClick={() => setActiveMaster(master.id)}
                                className={`relative py-2.5 px-4 font-serif text-sm transition-colors rounded-t-lg font-bold border-t border-x ${
                                    isTabActive
                                        ? "text-accent-red bg-zinc-50 border-zinc-200"
                                        : "text-zinc-500 hover:text-zinc-900 border-transparent bg-transparent"
                                }`}
                            >
                                {master.shortName}
                                {isTabActive && (
                                    <motion.div
                                        layoutId="activeMasterBorder"
                                        className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent-red"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Animated Master Profile Showcase */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeMaster}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-2"
                    >
                        {/* Profile Image */}
                        <div className="md:col-span-5 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-accent-red to-zinc-900 rounded-xl blur opacity-20" />
                            <div className="relative bg-white p-2 rounded-xl border border-zinc-200/50 shadow-md">
                                <div className="aspect-square relative w-full h-[280px] bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center">
                                    <Image
                                        src={selectedMaster.image}
                                        alt={selectedMaster.fullName}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 300px"
                                        className="rounded-lg object-contain grayscale hover:grayscale-0 transition-all duration-500"
                                        priority
                                    />
                                </div>
                                <div className="mt-3 text-center">
                                    <span className="text-xs text-zinc-500 font-serif italic">
                                        {selectedMaster.fullName} ({selectedMaster.years})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats & Bio */}
                        <div className="md:col-span-7 space-y-6">
                            <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-5 space-y-3.5 shadow-sm font-sans">
                                <h3 className="font-serif font-bold text-base text-zinc-950 border-b border-zinc-200 pb-2">
                                    Key Biographical Details
                                </h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="flex items-center gap-2.5 text-zinc-700">
                                        <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                                        <span><strong>Born:</strong> {selectedMaster.born}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-zinc-700">
                                        <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                                        <span><strong>Passed:</strong> {selectedMaster.passed}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-zinc-700">
                                        <MapPin className="w-4 h-4 text-accent-red flex-shrink-0" />
                                        <span><strong>Origin:</strong> {selectedMaster.origin}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-zinc-700">
                                        <Award className="w-4 h-4 text-accent-red flex-shrink-0" />
                                        <span><strong>Rank:</strong> {selectedMaster.rank}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-zinc-700">
                                        <BookOpen className="w-4 h-4 text-accent-red flex-shrink-0" />
                                        <span><strong>Key Work/Info:</strong> {selectedMaster.keyWork}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-zinc-700">
                                        <Activity className="w-4 h-4 text-accent-red flex-shrink-0" />
                                        <span><strong>JKA Role:</strong> {selectedMaster.role}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-zinc-750 text-sm leading-relaxed font-sans">
                                {selectedMaster.intro}
                            </p>
                        </div>

                        {/* Quote Block */}
                        <div className="md:col-span-12 relative my-4 p-6 bg-zinc-50 border-l-4 border-accent-red rounded-r-lg overflow-hidden shadow-sm">
                            <div className="absolute right-4 bottom-2 opacity-[0.03] text-zinc-900 pointer-events-none">
                                <Quote className="w-24 h-24" />
                            </div>
                            <div className="relative z-10 font-sans">
                                <p className="font-serif italic text-lg text-zinc-800 leading-relaxed mb-3">
                                    &quot;{selectedMaster.quote}&quot;
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="h-0.5 w-6 bg-accent-red" />
                                    <span className="font-semibold text-xs tracking-wider uppercase text-zinc-500">
                                        {selectedMaster.quoteRole}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Chapters / Detailed Bio */}
                        <div className="md:col-span-12 space-y-6 pt-2 font-sans text-sm text-zinc-750">
                            {selectedMaster.chapters.map((ch) => (
                                <section key={ch.title} className="space-y-3">
                                    <h4 className="font-serif font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-1.5">
                                        {ch.title}
                                    </h4>
                                    {ch.text.map((paragraph, index) => (
                                        <p key={index} className="leading-relaxed">
                                            {paragraph}
                                        </p>
                                    ))}
                                </section>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* Section 2: Children */}
            <section id="children" className="scroll-mt-28 space-y-8 pt-8 border-t border-zinc-200">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        Karate for Children & Youth
                    </h2>
                </div>

                <div className="space-y-6 text-zinc-700 leading-relaxed text-sm font-sans">
                    <p className="text-base text-zinc-800 leading-relaxed font-medium">
                        At the JKA, thousands of children and youth members—from elementary school to high school—learn the values of karate and apply them in their daily life.
                    </p>

                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                        {/* Youth Programs Callout */}
                        <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-6 shadow-sm">
                            <h3 className="font-serif font-bold text-lg text-zinc-900 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-accent-red" />
                                JKA Youth Programs & Tournaments
                            </h3>
                            <p className="text-zinc-650 mb-4 leading-relaxed">
                                JKA has long supported school-age karate through structured tournaments, youth divisions, and camps designed specifically for children and teenagers:
                            </p>
                            <ul className="space-y-3 pl-1">
                                {youthPrograms.map((program, idx) => (
                                    <li key={idx} className="flex gap-3 text-zinc-700 leading-relaxed text-sm">
                                        <span className="mt-1.5 h-2 w-2 rounded-full bg-accent-red shrink-0" />
                                        <span>{program}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Why Children Benefit Card */}
                        <div className="bg-zinc-900 text-white rounded-xl p-6 shadow-md relative overflow-hidden">
                            <div className="absolute right-0 bottom-0 opacity-[0.04] font-karate text-7xl font-black text-white select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
                                JKA
                            </div>
                            <div className="relative z-10 space-y-3">
                                <h3 className="font-serif font-bold text-lg text-white">
                                    Three Forms of Personal Development
                                </h3>
                                <p className="text-zinc-300">
                                    Karate is not only fun. It supports the same three pillars of personal development found in traditional education: mental, moral, and physical growth. It gives young people balance and perspective at an age when they are needed most.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Development Pillars */}
                    <div className="space-y-4 pt-4">
                        <h3 className="font-serif font-bold text-lg text-zinc-950">
                            The Three Core Pillars of Development
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {developmentPillars.map((pillar) => {
                                const Icon = pillar.icon;
                                return (
                                    <article
                                        key={pillar.title}
                                        className="bg-white border border-zinc-150 rounded-xl p-5 shadow-sm flex gap-4"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                            <Icon className="w-5 h-5 text-accent-red" />
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-accent-red font-bold mb-1">
                                                {pillar.subtitle}
                                            </p>
                                            <h4 className="font-serif font-bold text-base text-zinc-900 mb-1">
                                                {pillar.title}
                                            </h4>
                                            <p className="text-zinc-650 text-xs leading-relaxed">
                                                {pillar.description}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>

                    {/* Safety First Card */}
                    <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-6 shadow-sm space-y-3">
                        <h3 className="font-serif font-bold text-lg text-zinc-900 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-accent-red" />
                            Safety Standards & Age Limits
                        </h3>
                        <p className="text-zinc-650 text-sm leading-relaxed">
                            Other karate organizations often allow children as young as six or seven to start kumite (sparring). At the JKA, sparring is strictly prohibited until a child is at least ten years old and in the fifth grade, helping reduce the possibility of injury while preserving the pure spirit of training.
                        </p>
                    </div>
                </div>
            </section>

            {/* Section 3: Chronology */}
            <section id="chronology" className="scroll-mt-28 space-y-8 pt-8 border-t border-zinc-200">
                <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        JKA Chronology
                    </h2>
                </div>

                <p className="text-zinc-700 leading-relaxed font-sans text-sm">
                    Key historical milestones and licensing achievements of the Japan Karate Association World Federation Bangladesh.
                </p>

                {/* Timeline */}
                <div className="relative border-l-2 border-zinc-200 ml-4 md:ml-28 space-y-8 pt-2">
                    {chronologyEvents.map((event, index) => (
                        <div key={index} className="relative pl-6 md:pl-8 group font-sans">
                            {/* Dot */}
                            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-accent-red bg-white group-hover:bg-accent-red transition-colors duration-300" />

                            {/* Date Column */}
                            <div className="md:absolute md:-left-28 md:top-0 md:w-20 md:text-right">
                                <span className="block font-serif font-bold text-lg text-accent-red">
                                    {event.year}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-150 rounded-xl p-5 transition-all duration-300 shadow-sm">
                                <h3 className="font-serif font-bold text-base text-zinc-900 mb-2">
                                    {event.title}
                                </h3>
                                <p className="text-zinc-650 leading-relaxed text-xs">
                                    {event.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
