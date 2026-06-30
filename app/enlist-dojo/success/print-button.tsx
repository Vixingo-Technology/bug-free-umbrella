"use client";

import { Printer } from "lucide-react";

export default function PrintReceiptButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 px-4 py-3 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors rounded-sm"
        >
            <Printer size={14} />
            Download receipt
        </button>
    );
}
