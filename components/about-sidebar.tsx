"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";

type NavItem = {
    title: string;
    href: string;
};

type NavSection = {
    title: string;
    items: NavItem[];
};

const navigation: NavSection[] = [
    {
        title: "History",
        items: [
            { title: "History", href: "/about/history" },
            { title: "Chronology", href: "/about/history/chronology" },
        ],
    },
    {
        title: "Organization",
        items: [
            {
                title: "Organizational Structure",
                href: "/about/organization/structure",
            },
        ],
    },
    {
        title: "Masters",
        items: [
            {
                title: "Supreme Master Funakoshi Gichin",
                href: "/about/masters/funakoshi",
            },
            {
                title: "Master Nakayama Masatoshi",
                href: "/about/masters/nakayama",
            },
            {
                title: "Master Sugiura Motokuni",
                href: "/about/masters/sugiura",
            },
            { title: "Master Ueki Masaaki", href: "/about/masters/ueki" },
        ],
    },
    {
        title: "JKA Karate",
        items: [
            { title: "Philosophy", href: "/about/karate/philosophy" },
            { title: "Features", href: "/about/karate/features" },
            { title: "Children", href: "/about/karate/children" },
            { title: "Techniques", href: "/about/karate/techniques" },
        ],
    },
];

export default function AboutSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full lg:w-80 flex-shrink-0 bg-white/80 backdrop-blur-md p-6 rounded-xl border border-zinc-200/50 shadow-[0_0_20px_rgba(204,0,0,0.15)] relative overflow-hidden md:sticky md:top-24">
            {/* Red glow ambient light behind */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-accent-red/10 blur-[60px] rounded-full pointer-events-none" />

            <h2 className="text-lg font-bold mb-6 text-zinc-900 border-b border-zinc-200 pb-4 relative z-10">
                <Link
                    href="/about"
                    className="hover:text-accent-red transition-colors flex items-center justify-between text-sm"
                >
                    About the Japan Karate Association
                    {/* <ChevronDown size={16} className="text-zinc-500" /> */}
                </Link>
            </h2>

            <div className="space-y-4 relative z-10">
                {navigation.map((section, idx) => {
                    const isChildActive = section.items.some(
                        (item) => pathname === item.href,
                    );
                    return (
                        <AccordionSection
                            key={idx}
                            section={section}
                            pathname={pathname}
                            defaultOpen={isChildActive}
                        />
                    );
                })}
            </div>
        </aside>
    );
}

function AccordionSection({
    section,
    pathname,
    defaultOpen,
}: {
    section: NavSection;
    pathname: string;
    defaultOpen: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="pb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 py-2 text-left text-zinc-800 font-serif text-lg hover:text-accent-red transition-colors group"
            >
                <div className="w-5 h-5 bg-accent-red/10 border border-accent-red/30 shadow-[0_0_8px_rgba(204,0,0,0.2)] flex items-center justify-center text-accent-red text-xs rounded-sm flex-shrink-0 transition-shadow group-hover:shadow-[0_0_12px_rgba(204,0,0,0.3)]">
                    {isOpen ? (
                        <ChevronDown size={14} />
                    ) : (
                        <ChevronRight size={14} />
                    )}
                </div>
                {section.title}
            </button>

            {isOpen && (
                <ul className="mt-2 ml-2.5 space-y-1 border-l border-zinc-300">
                    {section.items.map((item, itemIdx) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={itemIdx} className="relative group/link">
                                {/* Dotted line connector */}
                                <div className="absolute left-0 top-1/2 w-4 border-t border-zinc-300 -translate-y-1/2 group-hover/link:border-accent-red/50 transition-colors" />

                                <Link
                                    href={item.href}
                                    className={clsx(
                                        "block py-2 pl-6 pr-2 text-[15px] transition-colors border-b border-zinc-100 ml-4",
                                        isActive
                                            ? "text-accent-red font-bold bg-zinc-50/50"
                                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50/50",
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            "mr-1.5 text-xs transition-colors",
                                            isActive
                                                ? "text-accent-red"
                                                : "text-zinc-400 group-hover/link:text-accent-red",
                                        )}
                                    >
                                        ›
                                    </span>
                                    {item.title}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
