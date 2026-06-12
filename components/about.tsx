"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";

export default function About() {
    const { copy } = useLanguage();

    return (
        <section
            id="about"
            className="py-32 bg-bg-charcoal relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent"></div>

            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    {/* Left Column: Visuals */}
                    <div className="relative h-[600px] w-full">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 z-10 shadow-lg rounded-sm overflow-hidden"
                        >
                            <Image
                                src="https://picsum.photos/seed/sensei/800/1000"
                                alt="Leadership"
                                fill
                                className="object-cover rounded-sm grayscale contrast-110 opacity-95"
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-charcoal/50 via-transparent to-transparent"></div>
                        </motion.div>

                        {/* Overlapping element */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="absolute -bottom-10 -right-10 w-64 h-80 z-20 hidden md:block border border-zinc-200 bg-white p-2 shadow-2xl rounded-sm"
                        >
                            <div className="relative w-full h-full">
                                <Image
                                    src="https://picsum.photos/seed/tradition/400/500"
                                    alt="Tradition"
                                    fill
                                    className="object-cover grayscale opacity-90"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Content */}
                    <div className="relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="font-karate text-4xl lg:text-5xl font-bold text-zinc-900 mb-6 uppercase tracking-wider"
                        >
                            {copy.about.titleBefore} <br />{" "}
                            <span className="text-accent-red italic lowercase font-serif font-normal">
                                {copy.about.titleHighlight}
                            </span>{" "}
                            {copy.about.titleAfter}
                        </motion.h2>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="h-px w-24 bg-accent-red mb-8"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="space-y-6 text-zinc-700 font-normal text-lg leading-relaxed"
                        >
                            {copy.about.paragraphs.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="mt-12 grid grid-cols-2 gap-8"
                        >
                            {copy.about.stats.map((stat) => (
                                <div key={stat.label}>
                                    <h4 className="text-4xl font-heading font-bold text-zinc-900 mb-2">
                                        {stat.value}
                                    </h4>
                                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
