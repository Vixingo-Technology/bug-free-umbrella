"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Global top progress bar for route transitions.
 * Starts instantly on internal link click, finishes when the pathname changes.
 * Falls back to auto-complete on timeout so a stalled navigation never leaves it stuck.
 */
export default function RouteProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimers = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (safetyTimerRef.current) {
            clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = null;
        }
    };

    const start = () => {
        if (finishTimerRef.current) {
            clearTimeout(finishTimerRef.current);
            finishTimerRef.current = null;
        }
        clearTimers();
        setVisible(true);
        setProgress(8);

        timerRef.current = setInterval(() => {
            setProgress((p) => {
                if (p >= 90) return p;
                const step = p < 40 ? 6 : p < 70 ? 3 : 1;
                return Math.min(90, p + step);
            });
        }, 150);

        // Safety: if nothing changes in 10s, complete anyway.
        safetyTimerRef.current = setTimeout(() => finish(), 10000);
    };

    const finish = () => {
        clearTimers();
        setProgress(100);
        finishTimerRef.current = setTimeout(() => {
            setVisible(false);
            setProgress(0);
        }, 250);
    };

    // Complete the bar whenever the URL changes.
    useEffect(() => {
        if (visible) finish();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams]);

    // Intercept anchor clicks anywhere on the page to start the bar immediately.
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (
                e.defaultPrevented ||
                e.button !== 0 ||
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey
            ) {
                return;
            }
            const target = e.target as HTMLElement | null;
            const anchor = target?.closest("a") as HTMLAnchorElement | null;
            if (!anchor) return;

            const href = anchor.getAttribute("href");
            if (!href) return;
            if (anchor.target && anchor.target !== "_self") return;
            if (anchor.hasAttribute("download")) return;
            if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

            // Only internal navigations.
            let destUrl: URL;
            try {
                destUrl = new URL(anchor.href, window.location.href);
            } catch {
                return;
            }
            if (destUrl.origin !== window.location.origin) return;

            // Same URL (pathname + search) — no navigation will happen.
            if (
                destUrl.pathname === window.location.pathname &&
                destUrl.search === window.location.search
            ) {
                return;
            }

            start();
        };

        document.addEventListener("click", onClick, { capture: true });
        return () => document.removeEventListener("click", onClick, { capture: true });
    }, []);

    // Browser back / forward.
    useEffect(() => {
        const onPop = () => start();
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    useEffect(() => {
        return () => {
            clearTimers();
            if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
        };
    }, []);

    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-[1000] h-[3px]"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease-out" }}
        >
            <div
                className="h-full origin-left bg-accent-red"
                style={{
                    width: `${progress}%`,
                    transition:
                        progress === 100
                            ? "width 200ms ease-out"
                            : "width 300ms cubic-bezier(0.1, 0.5, 0.2, 1)",
                    boxShadow: "0 0 10px rgba(196, 30, 58, 0.6), 0 0 4px rgba(196, 30, 58, 0.8)",
                }}
            />
        </div>
    );
}
