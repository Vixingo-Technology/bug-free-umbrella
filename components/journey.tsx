"use client";

import { motion } from "motion/react";
import { useLanguage } from "@/components/language-provider";

export default function Journey() {
    const { copy } = useLanguage();
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
                                {belt.color === "black" && (
                                    <div className="w-8 h-[2px] bg-accent-red"></div>
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
            </div>
        </section>
    );
}
