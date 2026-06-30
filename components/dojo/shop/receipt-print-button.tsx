"use client";

import { Printer } from "lucide-react";

export default function ReceiptPrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 rounded-sm"
        >
            <Printer size={14} />
            Print
        </button>
    );
}
