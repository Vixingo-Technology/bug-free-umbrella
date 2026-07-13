"use client";

import {
    Facebook,
    Instagram,
    Twitter,
    Mail,
    MapPin,
    Phone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/assets/jka_logo.svg";
import { siteContent } from "@/lib/i18n/site-content";

export default function Footer() {
    const copy = siteContent;

    return (
        <footer className="bg-bg-charcoal border-t border-zinc-200 pt-20 pb-10 text-sm">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div>
                        <Link
                            href="/"
                            aria-label="JKA Bangladesh — Home"
                            className="flex items-center gap-3 mb-6 group"
                        >
                            <Image
                                src={Logo}
                                alt="JKA Bangladesh logo"
                                width={40}
                                height={40}
                            />
                            <div className="flex flex-col">
                                <span className="font-karate font-bold text-zinc-900 tracking-[0.4em] text-xs leading-tight group-hover:text-accent-red transition-colors">
                                    JKA{" "}
                                    <span className="text-accent-red">
                                        BANGLADESH
                                    </span>
                                </span>
                            </div>
                        </Link>
                        <p className="text-zinc-600 font-normal leading-relaxed mb-6">
                            {copy.footer.description}
                        </p>
                        <div className="flex gap-4 text-zinc-500">
                            <a
                                href="#"
                                className="hover:text-accent-red transition-colors"
                            >
                                <Facebook size={20} />
                            </a>
                            <a
                                href="#"
                                className="hover:text-accent-red transition-colors"
                            >
                                <Instagram size={20} />
                            </a>
                            <a
                                href="#"
                                className="hover:text-accent-red transition-colors"
                            >
                                <Twitter size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-zinc-900 font-bold tracking-widest uppercase mb-6">
                            {copy.footer.headings.headquarters}
                        </h4>
                        <ul className="space-y-4 text-zinc-600 font-normal">
                            <li className="flex items-start gap-3">
                                <MapPin
                                    size={18}
                                    className="text-accent-red shrink-0 mt-0.5"
                                />
                                <span>
                                    89, Rahmathgonj
                                    <br />
                                    K.B.A Satter Road
                                    <br />
                                    Chittagong, Bangladesh
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone
                                    size={18}
                                    className="text-accent-red shrink-0 mt-0.5"
                                />
                                <span>
                                    <a
                                        href="tel:+8801612900075"
                                        className="hover:text-accent-red transition-colors"
                                    >
                                        +880 1612-900075
                                    </a>
                                    <br />
                                    <a
                                        href="tel:+8801819648456"
                                        className="hover:text-accent-red transition-colors"
                                    >
                                        +880 1819-648456
                                    </a>
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Mail
                                    size={18}
                                    className="text-accent-red shrink-0 mt-0.5"
                                />
                                <span>
                                    <a
                                        href="mailto:jkabangladesh@gmail.com"
                                        className="hover:text-accent-red transition-colors"
                                    >
                                        jkabangladesh@gmail.com
                                    </a>
                                    <br />
                                    <a
                                        href="mailto:shamscjks456@gmail.com"
                                        className="hover:text-accent-red transition-colors"
                                    >
                                        shamscjks456@gmail.com
                                    </a>
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-zinc-900 font-bold tracking-widest uppercase mb-6">
                            {copy.footer.headings.quickLinks}
                        </h4>
                        <ul className="space-y-3 text-zinc-600 font-normal">
                            {copy.footer.quickLinks.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="hover:text-accent-red transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Dojo Kun */}
                    <div>
                        <h4 className="text-zinc-900 font-bold tracking-widest uppercase mb-6">
                            {copy.footer.headings.dojoKun}
                        </h4>
                        <div className="space-y-2 text-zinc-700 font-medium text-xs italic border-l-2 border-accent-red/60 pl-4">
                            {copy.footer.dojoKun.map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                        </div>
                        <div className="mt-8">
                            <p className="text-zinc-900 font-serif text-3xl opacity-[0.08] font-bold">
                                道場訓
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-500 font-normal text-xs">
                    <p>
                        © {new Date().getFullYear()} Japan Karate Association
                        Bangladesh. {copy.footer.copyright}
                    </p>
                    <div className="flex gap-4">
                        {copy.footer.policies.map((policy) => (
                            <Link
                                key={policy.label}
                                href={policy.href}
                                className="hover:text-zinc-850 transition-colors"
                            >
                                {policy.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
