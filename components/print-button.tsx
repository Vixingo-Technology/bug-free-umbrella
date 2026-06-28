"use client";

import { Printer } from "lucide-react";

export default function PrintButton({
    label = "Print / Save as PDF",
}: {
    label?: string;
}) {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors"
        >
            <Printer size={14} />
            {label}
        </button>
    );
}
