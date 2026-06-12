"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";

export default function CTA() {
    const { copy } = useLanguage();

    return (
        <section
            id="membership"
            className="relative py-40 bg-bg-deep flex items-center justify-center overflow-hidden"
        >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="https://picsum.photos/seed/ceremony/1920/1080"
                    alt="Ceremony"
                    fill
                    className="object-cover opacity-20 grayscale"
                    referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/30 to-bg-deep z-10"></div>
                <div className="absolute inset-0 bg-accent-red/5 mix-blend-overlay z-10"></div>
            </div>

            <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                >
                    <h2 className="font-serif text-5xl md:text-7xl text-zinc-900 mb-6 leading-tight tracking-tighter font-bold">
                        {copy.cta.headingLines[0]} <br />
                        <span className="italic text-accent-red font-serif font-normal text-4xl md:text-5xl uppercase tracking-widest block mt-2">
                            {copy.cta.headingLines[1]}
                        </span>
                    </h2>

                    <p className="text-zinc-650 mb-12 max-w-2xl mx-auto font-normal leading-relaxed text-lg">
                        {copy.cta.description}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button className="px-10 py-5 bg-accent-red hover:bg-red-700 text-white font-bold tracking-[0.2em] uppercase text-sm rounded-sm transition-colors shadow-md w-full sm:w-auto">
                            {copy.cta.primary}
                        </button>
                        <button className="px-10 py-5 bg-transparent text-accent-red font-bold tracking-[0.2em] uppercase text-sm border-2 border-accent-red/20 hover:border-accent-red hover:bg-accent-red hover:text-white rounded-sm transition-all duration-350 w-full sm:w-auto">
                            {copy.cta.secondary}
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
