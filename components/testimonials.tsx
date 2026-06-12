"use client";

import { motion } from "motion/react";
import { Quote } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";

export default function Testimonials() {
    const { copy } = useLanguage();
    const testimonials = copy.testimonials.items;

    return (
        <section className="py-32 bg-bg-deep relative overflow-hidden">
            {/* Background motif */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] text-zinc-900/[0.03] font-serif font-black whitespace-nowrap -z-10 pointer-events-none">
                押忍
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
                <h2 className="font-serif text-3xl md:text-5xl text-zinc-900 mb-4 uppercase tracking-widest font-bold">
                    {copy.testimonials.heading}
                </h2>
                <div className="h-px w-24 bg-accent-red mx-auto mb-20"></div>

                <div className="grid md:grid-cols-2 gap-12 text-left">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: i * 0.2 }}
                            className="relative p-10 bg-white border border-zinc-200/75 rounded-sm shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                        >
                            <Quote className="text-accent-red/10 w-16 h-16 absolute -top-6 -left-6 z-0" />
                            <p className="text-zinc-700 font-normal text-lg leading-loose relative z-10 mb-8 font-serif italic">
                                &quot;{t.quote}&quot;
                            </p>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden grayscale border border-zinc-200">
                                    <Image
                                        src={t.avatar}
                                        alt={t.author}
                                        fill
                                        className="object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-zinc-900 font-bold tracking-wider uppercase text-sm">
                                        {t.author}
                                    </h4>
                                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                                        {t.role}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
