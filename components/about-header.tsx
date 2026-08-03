"use client";

import Image from "next/image";
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
        <section className="relative pt-32 pb-12 min-h-[420px] md:min-h-[560px] bg-bg-charcoal border-b border-zinc-200 overflow-hidden">
            <Image
                src="/assets/about.jpeg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-center grayscale opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-bg-charcoal/70 via-bg-charcoal/20 to-bg-charcoal/60" />

            <div className="relative max-w-6xl mx-auto px-6 lg:px-12">
                <Breadcrumbs />
                <br />
                {/* <h1 className="font-karate text-4xl md:text-4xl text-zinc-900 uppercase tracking-wider mb-2 drop-shadow-[0_2px_8px_rgba(255,255,255,0.6)]">
                    {title}
                </h1> */}
            </div>
        </section>
    );
}
