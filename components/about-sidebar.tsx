"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "motion/react";

type AnchorItem = {
    title: string;
    id: string;
};

type NavTab = {
    title: string;
    href: string;
    anchors: AnchorItem[];
};

const navigation: NavTab[] = [
    {
        title: "History",
        href: "/about/history",
        anchors: [
            { title: "Origins of JKA", id: "origins" },
            { title: "About JKA WF Bangladesh", id: "jka-bangladesh" },
        ],
    },
    {
        title: "Organizational Structure",
        href: "/about/organization",
        anchors: [
            { title: "JKA Organization", id: "structure" },
        ],
    },
    {
        title: "JKA Karate",
        href: "/about/karate",
        anchors: [
            { title: "Authentic Shotokan", id: "tradition" },
            { title: "Training System", id: "training-system" },
            { title: "Why Train in JKA?", id: "why-train" },
        ],
    },
    {
        title: "JKA Karate Philosophy",
        href: "/about/karate/philosophy",
        anchors: [
            { title: "A Way of Life", id: "way-of-life" },
            { title: "Training Beyond Technique", id: "beyond-technique" },
            { title: "A Lifelong Journey", id: "lifelong-journey" },
        ],
    },
    {
        title: "Extra Pages",
        href: "/about/extras",
        anchors: [
            { title: "JKA Masters Series", id: "masters" },
            { title: "Karate for Children", id: "children" },
            { title: "JKA Chronology", id: "chronology" },
        ],
    },
];

function useScrollSpy(ids: string[], offset = 140) {
    const [activeId, setActiveId] = useState<string>("");

    useEffect(() => {
        if (ids.length === 0) return;

        const handleScroll = () => {
            const scrollPosition = window.scrollY + offset;

            // Check if we are at the very bottom of the page
            const isBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;

            if (isBottom) {
                setActiveId(ids[ids.length - 1]);
                return;
            }

            for (let i = ids.length - 1; i >= 0; i--) {
                const id = ids[i];
                const element = document.getElementById(id);
                if (element) {
                    if (scrollPosition >= element.offsetTop) {
                        setActiveId(id);
                        return;
                    }
                }
            }
            setActiveId(ids[0]);
        };

        window.addEventListener("scroll", handleScroll);
        const timer = setTimeout(handleScroll, 100);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            clearTimeout(timer);
        };
    }, [ids, offset]);

    return activeId;
}

export default function AboutSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full lg:w-80 flex-shrink-0 bg-white/80 backdrop-blur-md p-6 rounded-xl border border-zinc-200/50 shadow-[0_0_20px_rgba(204,0,0,0.15)] relative overflow-hidden md:sticky md:top-28">
            {/* Red glow ambient light behind */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-accent-red/10 blur-[60px] rounded-full pointer-events-none" />

            <h2 className="text-lg font-bold mb-6 text-zinc-900 border-b border-zinc-200 pb-4 relative z-10">
                <Link
                    href="/about"
                    className="hover:text-accent-red transition-colors flex items-center justify-between text-sm uppercase tracking-wider font-karate"
                >
                    About the JKA WF Bangladesh
                </Link>
            </h2>

            <div className="space-y-4 relative z-10">
                {navigation.map((tab, idx) => {
                    const isActive = pathname === tab.href;
                    return (
                        <SidebarTab
                            key={idx}
                            tab={tab}
                            isActive={isActive}
                        />
                    );
                })}
            </div>
        </aside>
    );
}

function SidebarTab({
    tab,
    isActive,
}: {
    tab: NavTab;
    isActive: boolean;
}) {
    const anchorIds = tab.anchors.map((a) => a.id);
    const activeAnchorId = useScrollSpy(isActive ? anchorIds : []);

    const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const offset = 112; // safe area height (navbar)
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            });

            // Update hash without jumping
            window.history.pushState(null, "", `#${id}`);
        }
    };

    return (
        <div className="pb-2">
            <Link
                href={tab.href}
                className={clsx(
                    "w-full flex items-center gap-3 py-2 text-left font-serif text-lg transition-colors group",
                    isActive
                        ? "text-accent-red font-bold"
                        : "text-zinc-800 hover:text-accent-red"
                )}
            >
                <div className={clsx(
                    "w-5 h-5 flex items-center justify-center text-xs rounded-sm flex-shrink-0 transition-all duration-300",
                    isActive 
                        ? "bg-accent-red text-white shadow-[0_0_8px_rgba(204,0,0,0.3)]"
                        : "bg-accent-red/10 border border-accent-red/30 text-accent-red group-hover:bg-accent-red/20"
                )}>
                    {isActive ? (
                        <ChevronDown size={12} className="stroke-[3]" />
                    ) : (
                        <ChevronRight size={12} className="stroke-[3]" />
                    )}
                </div>
                <span>{tab.title}</span>
            </Link>

            <AnimatePresence initial={false}>
                {isActive && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="relative mt-2 ml-2.5 pl-6 border-l border-zinc-200/80 space-y-1 py-1">
                            {tab.anchors.map((anchor) => {
                                const isAnchorActive = activeAnchorId === anchor.id;
                                return (
                                    <a
                                        key={anchor.id}
                                        href={`#${anchor.id}`}
                                        onClick={(e) => handleAnchorClick(e, anchor.id)}
                                        className={clsx(
                                            "relative block py-1.5 text-[14px] transition-colors leading-snug select-none",
                                            isAnchorActive
                                                ? "text-accent-red font-semibold"
                                                : "text-zinc-500 hover:text-zinc-900"
                                        )}
                                    >
                                        {isAnchorActive && (
                                            <motion.span
                                                layoutId="activeDot"
                                                className="absolute -left-[28.5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-red shadow-[0_0_6px_rgba(204,0,0,0.6)]"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        {anchor.title}
                                    </a>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
