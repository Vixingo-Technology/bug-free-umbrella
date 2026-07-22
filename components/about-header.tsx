"use client";

import { usePathname } from "next/navigation";
import Breadcrumbs from "./breadcrumbs";

const pathnameTitleMap: Record<string, string> = {
    "/about": "About JKA WF Bangladesh",
    "/about/history": "History",
    "/about/organization": "Organizational Structure",
    "/about/karate": "JKA Karate",
    "/about/karate/philosophy": "Philosophy",
    "/about/extras": "Extra Pages",
};

export default function AboutHeader() {
    const pathname = usePathname();
    const title = pathnameTitleMap[pathname] || "About Us";

    return (
        <section className="pt-32 pb-12 bg-bg-charcoal border-b border-zinc-200">
            <div className="max-w-6xl mx-auto px-6 lg:px-12">
                <Breadcrumbs />
                <br />
                <h1 className="font-karate text-4xl md:text-4xl text-zinc-900 uppercase tracking-wider mb-2">
                    {title}
                </h1>
            </div>
        </section>
    );
}
