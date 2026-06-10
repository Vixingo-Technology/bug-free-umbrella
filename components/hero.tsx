"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export default function Hero() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
    const backgroundVideoId = "8QRrnc0UGGg";
    const backgroundVideoSrc = `https://www.youtube-nocookie.com/embed/${backgroundVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${backgroundVideoId}&playsinline=1&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3`;

    return (
        <section
            ref={containerRef}
            className="relative h-screen w-full flex items-center justify-center overflow-hidden hero-gradient"
        >
            {/* Background Video/Image Parallax */}
            <motion.div
                style={{ y: y1 }}
                className="absolute inset-0 w-full h-full z-0"
            >
                <div className="absolute inset-0 overflow-hidden bg-zinc-950">
                    <iframe
                        src={backgroundVideoSrc}
                        title="Cinematic karate training background video"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full min-w-[177.78vh] w-[100vw] -translate-x-1/2 -translate-y-1/2 scale-110 pointer-events-none opacity-35 saturate-0 contrast-125 brightness-75"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-bg-deep/20 via-bg-deep/55 to-bg-deep z-10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent-red/10 via-transparent to-transparent z-10" />
                <div className="absolute inset-0 z-10 opacity-5 bg-[url('https://picsum.photos/seed/noise/1000/1000')] bg-repeat mix-blend-overlay" />
            </motion.div>

            {/* Content */}
            <motion.div
                style={{ opacity }}
                className="relative z-20 max-w-7xl mx-auto px-6 text-center lg:text-left flex flex-col lg:flex-row items-center w-full"
            >
                <div className="flex-1 mt-20 lg:mt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="mb-4 justify-center lg:justify-start"
                    >
                        <span className="text-accent-gold tracking-[0.6em] text-xs font-semibold uppercase">
                            Shotokan Heritage
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            duration: 1.2,
                            delay: 0.4,
                            ease: "easeOut",
                        }}
                        className="font-serif text-5xl md:text-7xl lg:text-7xl text-zinc-900 mb-6 leading-tight font-bold"
                    >
                        THE HIGHEST
                        <br />
                        TRADITION OF
                        <br />
                        <span className="italic font-light text-accent-red">
                            MASTERY.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="text-zinc-600 text-sm max-w-sm mx-auto lg:mx-0 leading-relaxed mb-8"
                    >
                        The sole legal representative of Japan Karate
                        Association (JKA) in Bangladesh. Preserving the
                        discipline, respect, and power of traditional karate-do
                        since 1978.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start hover:z-30 relative"
                    >
                        <a
                            href="#membership"
                            className="px-8 py-4 bg-accent-red hover:bg-accent-red/90 text-white text-[10px] tracking-widest uppercase font-bold transition-colors shadow-sm"
                        >
                            Begin Your Journey
                        </a>
                        <a
                            href="#branches"
                            className="px-8 py-4 border border-zinc-300 text-zinc-800 text-[10px] tracking-widest uppercase font-bold glass hover:bg-zinc-50 transition-colors"
                        >
                            Explore Dojos
                        </a>
                    </motion.div>
                </div>

                {/* Abstract Visual Element Container on Desktop */}
                <div className="hidden lg:flex flex-1 justify-center items-center relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            duration: 2,
                            ease: "easeOut",
                            delay: 0.6,
                        }}
                        className="relative flex justify-center items-center"
                    >
                        <div className="absolute w-96 h-96 border border-zinc-200 rounded-full"></div>
                        <div className="absolute w-[450px] h-[450px] border border-zinc-100 rounded-full"></div>

                        {/* Symbolic Black Belt Concept */}
                        <div className="relative z-20">
                            <div className="w-2.5 h-[400px] bg-zinc-950 shadow-lg relative rounded-b-sm">
                                <div className="absolute bottom-0 w-full h-24 bg-accent-gold"></div>
                                <div className="absolute top-10 -left-0.5 text-[8px] vertical-text font-bold text-white tracking-[0.2em]">
                                    JAPAN KARATE ASSOCIATION BANGLADESH
                                </div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-accent-gold/10 blur-xl"></div>
                        </div>
                        {/* Elegant Japanese Calligraphy Character representing "Karate" or "Way/Do" */}
                        <h2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-serif text-[400px] text-zinc-900/[0.15] pointer-events-none">
                            空手
                        </h2>
                    </motion.div>
                </div>
            </motion.div>

            <div className="absolute bottom-12 left-12 opacity-40 hidden xl:flex flex-col text-zinc-500 z-20">
                <div className="text-[8px] tracking-[0.5em] font-bold uppercase vertical-text h-32 border-l border-zinc-300 pl-2">
                    PRESTIGE · DISCIPLINE · HONOR
                </div>
            </div>
        </section>
    );
}
