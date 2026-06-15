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
    /** Enable 3D tilt on cursor hover. Defaults true. */
    tilt?: boolean;
}

/**
 * Glass-surface card used across the portal. With `tilt` enabled (default) it
 * rotates with the cursor; with `glow` enabled an outer red halo blooms
 * behind the card. The halo lives outside the card box (see `.red-glow` in
 * globals.css) so the card surface itself stays clean.
 */
export default function TiltCard({
    children,
    className = "",
    href,
    delay = 0,
    glow = true,
    dark = false,
    onClick,
    tilt = true,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 22 });
    const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 220, damping: 22 });

    function onMove(e: React.MouseEvent) {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        if (tilt) {
            mx.set(nx - 0.5);
            my.set(ny - 0.5);
        }
        if (glow) {
            // Glow paints on the OPPOSITE side of the cursor — hovering on the
            // right lights up the left edge, like a counter-reflection.
            ref.current.style.setProperty("--gx", `${(1 - nx) * 100}%`);
            ref.current.style.setProperty("--gy", `${(1 - ny) * 100}%`);
        }
    }
    function onLeave() {
        if (tilt) {
            mx.set(0);
            my.set(0);
        }
        if (glow && ref.current) {
            ref.current.style.setProperty("--gx", "50%");
            ref.current.style.setProperty("--gy", "50%");
        }
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
            style={tilt ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
            onMouseMove={tilt || glow ? onMove : undefined}
            onMouseLeave={tilt || glow ? onLeave : undefined}
            className={`relative h-full overflow-visible rounded-2xl ${surface} ${glow ? "red-glow" : ""} ${className}`}
        >
            <div style={tilt ? { transform: "translateZ(24px)" } : undefined} className="relative h-full z-10">
                {children}
            </div>
        </motion.div>
    );

    const wrapper = (
        <div style={tilt ? { perspective: 1200 } : undefined} className="h-full group" onClick={onClick}>
            {cardInner}
        </div>
    );

    return href ? <Link href={href} className="block h-full">{wrapper}</Link> : wrapper;
}
