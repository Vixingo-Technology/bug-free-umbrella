"use client";

import { usePathname } from "next/navigation";
import Breadcrumbs from "./breadcrumbs";

const pathnameTitleMap: Record<string, string> = {
    "/about": "About JKA WF Bangladesh",
    "/about/history": "History",
    "/about/history/chronology": "Chronology",
    "/about/organization/structure": "Organizational Structure",
    "/about/masters/funakoshi": "Supreme Master Funakoshi Gichin",
    "/about/masters/nakayama": "Master Nakayama Masatoshi",
    "/about/masters/sugiura": "Master Sugiura Motokuni",
    "/about/masters/ueki": "Master Ueki Masaaki",
    "/about/karate/philosophy": "Philosophy",
    "/about/karate/features": "Training System",
    "/about/karate/children": "Children",
    "/about/karate/techniques": "Techniques",
};

export default function AboutHeader() {
    const pathname = usePathname();
    const title = pathnameTitleMap[pathname] || "About Us";

    return (
        <section className="pt-32 pb-12 bg-bg-charcoal border-b border-zinc-200">
            <div className="max-w-6xl mx-auto px-6 lg:px-12">
                {/* <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4"> */}
                <Breadcrumbs />
                {/* </p> */}
                <br />
                <h1 className="font-karate text-4xl md:text-4xl text-zinc-900 uppercase tracking-wider mb-2">
                    {title}
                </h1>
            </div>
        </section>
    );
}
