"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState, useEffect } from "react";
import { useLanguage } from "@/components/language-provider";

export default function Hero() {
    const containerRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoReady, setVideoReady] = useState(false);
    const { copy } = useLanguage();

    useEffect(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
            setVideoReady(true);
        }
    }, []);

    useEffect(() => {
        if (!videoReady) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [videoReady]);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
    return (
        <section
            ref={containerRef}
            className="relative h-screen w-full flex items-center justify-center overflow-hidden hero-gradient font-heading text-zinc-950"
        >
            {/* Background Video/Image Parallax */}
            <motion.div
                style={{ y: y1 }}
                className="absolute inset-0 w-full h-full z-0"
            >
                <div className="absolute inset-0 overflow-hidden ">
                    {/* bg-zinc-950 */}
                    <video
                        ref={videoRef}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onLoadedData={() => setVideoReady(true)}
                        className={`absolute inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-700 saturate-0 contrast-125 brightness-65 ${videoReady ? "opacity-28" : "opacity-0"}`}
                    >
                        <source src="/assets/bg.mp4" type="video/mp4" />
                    </video>
                </div>
                {!videoReady ? (
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[9999] h-[100dvh] w-screen flex items-center justify-center bg-bg-deep"
                    >
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="relative flex h-24 w-24 items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-accent-gold/25" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 1.8,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                    className="absolute inset-2 rounded-full border border-zinc-900/20 border-t-transparent"
                                />
                                <span className="font-serif text-3xl italic text-zinc-950">
                                    空手
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold tracking-[0.55em] uppercase text-zinc-800">
                                    {copy.hero.loadingTitle}
                                </p>
                                <p className="mt-2 text-xs uppercase tracking-[0.35em] text-zinc-600">
                                    {copy.hero.loadingSubtitle}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-b from-bg-deep/28 via-bg-deep/70 to-bg-deep z-10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent-red/25 via-transparent to-transparent z-10 mix-blend-overlay" />
                <div className="absolute inset-0 z-10 opacity-5 bg-[url('https://picsum.photos/seed/noise/1000/1000')] bg-repeat mix-blend-overlay" />
            </motion.div>


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
                        <span className="text-accent-red drop-shadow-[0_0_8px_rgba(196,30,58,0.6)] tracking-[0.6em] text-xs font-bold uppercase">
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
                        className="font-heading text-5xl md:text-7xl lg:text-7xl text-zinc-950 mb-6 leading-[0.92] font-bold"
                    >
                        <span className="font-karate">
                            {copy.hero.titleLines[0]}
                            <br />
                            {copy.hero.titleLines[1]}
                        </span>
                        <br />
                        <span className="italic font-light text-accent-red drop-shadow-[0_0_15px_rgba(196,30,58,0.3)]">
                            {copy.hero.titleLines[2]}
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="text-zinc-700 text-base md:text-lg max-w-md mx-auto lg:mx-0 leading-relaxed mb-8"
                    >
                        {copy.hero.description}
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
                            {copy.hero.primaryCta}
                        </a>
                        <a
                            href="#branches"
                            className="px-8 py-4 border border-zinc-300 text-zinc-900 text-[10px] tracking-widest uppercase font-bold glass hover:bg-zinc-50 transition-colors"
                        >
                            {copy.hero.secondaryCta}
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
                            <div className="w-5 h-[400px] bg-zinc-950 shadow-lg relative rounded-b-sm">
                                <div className="absolute bottom-0 w-full h-35 bg-accent-red "></div>
                                <div className="absolute top-10  text-[12px] vertical-text font-bold text-white tracking-[0.2em]">
                                    {copy.hero.verticalBrand}
                                </div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-90 rounded-full border border-accent-red/30 blur-xl shadow-[0_0_60px_rgba(196,30,58,0.2)]"></div>
                        </div>
                        {/* Elegant Japanese Calligraphy Character representing "Karate" or "Way/Do" */}
                        <h2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-serif text-[400px] text-zinc-900/[0.12] pointer-events-none">
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
