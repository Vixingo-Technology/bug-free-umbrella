"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, MapPin, X } from "lucide-react";
import { siteContent } from "@/lib/i18n/site-content";
import AllDojosMapWrapper from "./all-dojos-map-wrapper";
import type { DojoPin } from "./all-dojos-map";

type Division = { name: string; count: number };

type PinWithDivision = DojoPin & { division: string | null };

type Props = {
    dojos: PinWithDivision[];
    divisions: Division[];
};

export default function BranchesInteractive({ dojos, divisions }: Props) {
    const copy = siteContent;
    const [query, setQuery] = useState("");
    const [activeDivision, setActiveDivision] = useState<string | null>(null);

    const filteredDivisions = useMemo(() => {
        const populated = divisions.filter((r) => r.count > 0);
        const q = query.trim().toLowerCase();
        if (!q) return populated;
        return populated.filter((r) => r.name.toLowerCase().includes(q));
    }, [divisions, query]);

    const visibleDojos = useMemo(() => {
        if (!activeDivision) return dojos;
        return dojos.filter((d) => d.division === activeDivision);
    }, [dojos, activeDivision]);

    function toggleDivision(name: string) {
        setActiveDivision((prev) => (prev === name ? null : name));
    }

    return (
        <div className="flex flex-col lg:flex-row gap-16">
            {/* Left: Info */}
            <div className="flex-1">
                <h2 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-6 uppercase tracking-widest font-bold">
                    {copy.branches.heading}
                </h2>
                <div className="h-px w-24 bg-accent-red mb-8"></div>
                <p className="text-zinc-650 font-normal max-w-md mb-8">
                    {copy.branches.description}
                </p>
                {/* 
                <div className="relative mb-8">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={20}
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={copy.branches.searchPlaceholder}
                        className="w-full bg-white border border-zinc-200 text-zinc-950 px-12 py-4 focus:outline-none focus:border-accent-red font-mono text-sm tracking-widest placeholder:text-zinc-400 transition-colors shadow-sm"
                    />
                </div> */}

                {activeDivision && (
                    <button
                        type="button"
                        onClick={() => setActiveDivision(null)}
                        className="inline-flex items-center gap-2 mb-4 text-xs font-bold tracking-widest uppercase text-accent-red hover:underline"
                    >
                        <X size={14} />
                        Clear {activeDivision} filter
                    </button>
                )}

                <div className="space-y-2">
                    {filteredDivisions.map((region, i) => {
                        const active = activeDivision === region.name;
                        return (
                            <motion.button
                                key={region.name}
                                type="button"
                                onClick={() => toggleDivision(region.name)}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                aria-pressed={active}
                                className={`w-full flex justify-between items-center p-4 border cursor-pointer transition-all group shadow-sm rounded-sm text-left ${
                                    active
                                        ? "border-accent-red bg-accent-red/5 ring-1 ring-accent-red"
                                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <MapPin
                                        className={`transition-colors ${
                                            active
                                                ? "text-accent-red"
                                                : "text-accent-red/80 group-hover:text-accent-red"
                                        }`}
                                        size={18}
                                    />
                                    <span
                                        className={`font-semibold tracking-wide ${
                                            active
                                                ? "text-accent-red"
                                                : "text-zinc-800"
                                        }`}
                                    >
                                        {region.name}
                                    </span>
                                </div>
                                <span
                                    className={`font-mono text-xs font-bold ${
                                        active
                                            ? "text-accent-red"
                                            : "text-zinc-500"
                                    }`}
                                >
                                    {region.count}{" "}
                                    {copy.branches.dojoCountLabel}
                                </span>
                            </motion.button>
                        );
                    })}
                    {filteredDivisions.length === 0 &&
                        (query.trim() ? (
                            <p className="text-zinc-500 text-sm font-mono tracking-widest uppercase py-4">
                                No divisions match &ldquo;{query}&rdquo;
                            </p>
                        ) : (
                            <p className="text-zinc-500 text-sm font-mono tracking-widest uppercase py-4">
                                No dojos enlisted yet
                            </p>
                        ))}
                </div>
            </div>

            {/* Right: Map */}
            <div className="flex-1 relative min-h-[500px]">
                {dojos.length > 0 ? (
                    <>
                        <AllDojosMapWrapper
                            dojos={visibleDojos}
                            activeDivision={activeDivision}
                            height={500}
                        />
                        {activeDivision && visibleDojos.length === 0 && (
                            <p className="mt-3 text-xs font-mono tracking-widest uppercase text-zinc-500">
                                No dojos yet in {activeDivision}.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="w-full h-[500px] rounded-sm border border-zinc-200 bg-white shadow-md flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full border-2 border-accent-red/40 flex items-center justify-center animate-pulse bg-accent-red/5 mx-auto">
                                <div className="w-3 h-3 bg-accent-red rounded-full"></div>
                            </div>
                            <p className="text-accent-red font-mono text-xs mt-4 tracking-widest uppercase font-bold">
                                Map loading soon
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
