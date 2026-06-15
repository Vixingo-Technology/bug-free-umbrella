"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ReactNode, useRef } from "react";
import Link from "next/link";

interface Props {
    children: ReactNode;
    className?: string;
    /** Wraps the card in a Next Link if provided. */
    href?: string;
    /** Stagger-in animation delay (seconds). */
    delay?: number;
    /** Show a red halo behind the card on hover. Defaults true. */
    glow?: boolean;
    /** Use the dark glass surface variant. */
    dark?: boolean;
    /** Optional click handler (e.g. for notification cards). */
    onClick?: () => void;
}

/**
 * 3D tilt + glass surface card used across the portal dashboard.
 *
 * - `perspective` lives on the OUTER wrapper so the inner `rotateX`/`rotateY`
 *   actually look 3D (CSS perspective doesn't apply to the same element it's
 *   declared on).
 * - Mouse position is read with motion-values and smoothed with a spring, so
 *   the tilt feels physical without re-renders.
 * - `.red-glow` and `.glass-card` come from globals.css.
 */
export default function TiltCard({
    children,
    className = "",
    href,
    delay = 0,
    glow = true,
    dark = false,
    onClick,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 22 });
    const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 220, damping: 22 });
    const shineX = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
    const shineY = useTransform(my, [-0.5, 0.5], ["0%", "100%"]);

    function onMove(e: React.MouseEvent) {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
    }
    function onLeave() {
        mx.set(0);
        my.set(0);
    }

    const surface = dark
        ? "bg-gradient-to-br from-zinc-900/95 via-zinc-800/95 to-zinc-900/95 border-white/10 text-white"
        : "glass-card text-zinc-900";

    const cardInner = (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={`relative h-full overflow-visible rounded-2xl ${surface} ${glow ? "red-glow" : ""} ${className}`}
        >
            {/* Specular shine that tracks the cursor */}
            <motion.div
                aria-hidden
                style={{
                    background: `radial-gradient(220px circle at ${shineX} ${shineY}, ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)"}, transparent 60%)`,
                }}
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 hover:opacity-100 group-hover:opacity-100"
            />
            {/* Content lifted on Z so it parallaxes vs. the surface */}
            <div style={{ transform: "translateZ(24px)" }} className="relative h-full">
                {children}
            </div>
        </motion.div>
    );

    const wrapper = (
        <div style={{ perspective: 1200 }} className="h-full group" onClick={onClick}>
            {cardInner}
        </div>
    );

    return href ? <Link href={href} className="block h-full">{wrapper}</Link> : wrapper;
}
