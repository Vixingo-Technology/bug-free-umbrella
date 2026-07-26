"use client";

import { motion } from "motion/react";
import { siteContent } from "@/lib/i18n/site-content";

export default function Journey() {
    const copy = siteContent;
    const belts = copy.journey.belts;

    return (
        <section id="journey" className="py-32 bg-bg-deep relative">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/texture7/1000/1000')] opacity-[0.02] mix-blend-overlay"></div>

            <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6">
                    <div>
                        <h2 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-4 uppercase tracking-widest font-bold">
                            {copy.journey.heading}
                        </h2>
                        <div className="h-px w-24 bg-accent-red mb-6"></div>
                        <p className="text-zinc-600 font-normal max-w-xl">
                            {copy.journey.description}
                        </p>
                    </div>
                </div>

                {/* Desktop Journey Progress */}
                <div className="hidden lg:flex items-center justify-between relative mt-32 mb-20">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-zinc-200 -translate-y-1/2 z-0"></div>

                    {belts.map((belt, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="relative z-10 flex flex-col items-center gap-6 group"
                        >
                            <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity text-xs uppercase tracking-widest text-zinc-800 font-bold whitespace-nowrap">
                                {belt.desktopLabel}
                            </div>
                            <div
                                className={`w-16 h-16 rounded-full border-[4px] ${belt.border} ${belt.bg} shadow-md flex items-center justify-center transition-transform duration-500 group-hover:scale-125`}
                            >
                                {/* {belt.color === "black" && (
                                    <div className="w-16 h-[2px] bg-accent-red"></div>
                                )} */}
                                {belt.color === "stripe-yellow" && (
                                    <div className="w-16 h-[2px] bg-yellow-300"></div>
                                )}
                                {belt.color === "brown-white" && (
                                    <div className="w-16 h-[2px] bg-white"></div>
                                )}
                                {belt.color === "brown-black" && (
                                    <div className="w-16 h-[2px] bg-black"></div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Mobile Journey */}
                <div className="lg:hidden flex flex-col gap-8 mt-12 relative border-l border-zinc-200 pl-6 ml-4">
                    {belts.map((belt, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="relative flex items-center gap-6"
                        >
                            <div
                                className={`absolute -left-[41px] w-8 h-8 rounded-full border-2 ${belt.border} ${belt.bg} shadow-sm`}
                            ></div>
                            <div>
                                <h4 className="text-zinc-800 font-heading tracking-widest uppercase text-sm mb-1 font-bold">
                                    {belt.mobileLabel}
                                </h4>
                                <p className="text-zinc-600 text-xs font-mono">
                                    {belt.desktopLabel}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Grading Information */}
                {copy.journey.gradingInfo && (
                    <div className="mt-24 grid md:grid-cols-2 gap-8">
                        {copy.journey.gradingInfo.map((info, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.15 }}
                                className="bg-white/80 backdrop-blur-sm border border-zinc-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-accent-red/10 flex items-center justify-center">
                                        <span className="text-accent-red font-bold text-lg">
                                            {info.title.charAt(0)}
                                        </span>
                                    </div>
                                    <h3 className="font-karate text-xl text-zinc-900 uppercase tracking-widest font-bold">
                                        {info.title}
                                    </h3>
                                </div>

                                <p className="text-zinc-600 mb-5 leading-relaxed">
                                    {info.description}
                                </p>

                                {/* Kari-style details */}
                                {"details" in info && info.details && (
                                    <div className="space-y-4">
                                        {info.details.map((detail, j) => (
                                            <div
                                                key={j}
                                                className="bg-zinc-50 rounded-xl p-4 border border-zinc-100"
                                            >
                                                <span className="inline-block text-xs uppercase tracking-widest text-accent-red font-bold mb-1">
                                                    {detail.label}
                                                </span>
                                                <p className="text-zinc-700 text-sm leading-relaxed">
                                                    {detail.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Kyu-style schedule */}
                                {"schedule" in info && info.schedule && (
                                    <div className="flex flex-wrap gap-3">
                                        {info.schedule.map((period, j) => (
                                            <span
                                                key={j}
                                                className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs uppercase tracking-widest px-4 py-2.5 rounded-full font-bold"
                                            >
                                                <svg
                                                    className="w-3.5 h-3.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                {period}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
