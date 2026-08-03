"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { siteContent } from "@/lib/i18n/site-content";
import Link from "next/link";

export default function CTA() {
    const copy = siteContent;

    return (
        <section
            id="membership"
            className="relative pt-[38rem] pb-40 bg-bg-deep flex items-end justify-center overflow-hidden"
        >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/assets/cta.jpeg"
                    alt="Ceremony"
                    fill
                    className="object-cover object-top opacity-80 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/70 via-40% to-transparent z-10"></div>
                <div className="absolute inset-0 bg-accent-red/5 mix-blend-overlay z-10"></div>
            </div>

            <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                >
                    <h2 className="font-karate text-5xl md:text-7xl text-zinc-900 mb-6 leading-tight tracking-tighter font-bold drop-shadow-[0_2px_8px_rgba(255,255,255,0.6)]">
                        {copy.cta.headingLines[0]} <br />
                        <span className="italic text-accent-red font-serif font-normal text-4xl md:text-5xl uppercase tracking-widest block mt-2">
                            {copy.cta.headingLines[1]}
                        </span>
                    </h2>

                    <p className="text-zinc-800 mb-12 max-w-2xl mx-auto font-medium leading-relaxed text-lg drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                        {copy.cta.description}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link href="/signup">
                            <button className="px-10 py-5 bg-accent-red hover:bg-red-700 text-white font-bold tracking-[0.2em] uppercase text-sm rounded-sm transition-colors shadow-md w-full sm:w-auto">
                                {copy.cta.primary}
                            </button>
                        </Link>
                        <button className="px-10 py-5 bg-transparent text-accent-red font-bold tracking-[0.2em] uppercase text-sm border-2 border-accent-red/20 hover:border-accent-red hover:bg-accent-red hover:text-white rounded-sm transition-all duration-350 w-full sm:w-auto">
                            {copy.cta.secondary}
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
