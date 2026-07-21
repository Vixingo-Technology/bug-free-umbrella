"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import React from "react";

export default function Breadcrumbs() {
    const pathname = usePathname();
    const paths = pathname.split("/").filter(Boolean);

    // Capitalize first letter and format dashed paths
    const formatLabel = (str: string) => {
        return str
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-zinc-500">
                <li>
                    <Link href="/" className="hover:text-accent-red transition-colors">
                        Home
                    </Link>
                </li>
                {paths.map((path, index) => {
                    const href = `/${paths.slice(0, index + 1).join("/")}`;
                    const isLast = index === paths.length - 1;
                    const label = formatLabel(path);

                    return (
                        <React.Fragment key={path}>
                            <li>
                                <ChevronRight size={14} className="mx-1" />
                            </li>
                            <li>
                                {isLast ? (
                                    <span className="text-zinc-900 font-medium" aria-current="page">
                                        {label}
                                    </span>
                                ) : (
                                    <Link href={href} className="hover:text-accent-red transition-colors">
                                        {label}
                                    </Link>
                                )}
                            </li>
                        </React.Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}
