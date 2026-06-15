"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Link as LinkIcon, QrCode, Check, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import DigitalCard, { type MembershipStatusLabel } from "./digital-card";

interface Props {
    open: boolean;
    onClose: () => void;
    memberId: string;
    fullName: string;
    email?: string | null;
    currentRank?: string | null;
    dojoName?: string | null;
    role?: string | null;
    membershipStatus: MembershipStatusLabel;
    memberNumber?: string | null;
    avatarUrl?: string | null;
}

export default function MembershipCardDialog({
    open,
    onClose,
    memberId,
    fullName,
    ...cardProps
}: Props) {
    const [copied, setCopied] = useState(false);
    const [qrBusy, setQrBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const shareUrl =
        typeof window !== "undefined" ? `${window.location.origin}/card/${memberId}` : "";

    async function handleShare() {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        } catch {
            window.prompt("Copy this link:", shareUrl);
        }
    }

    async function handleDownloadQr() {
        setQrBusy(true);
        try {
            const dataUrl = await QRCode.toDataURL(shareUrl, {
                width: 720,
                margin: 2,
                color: { dark: "#0a0a0a", light: "#ffffff" },
                errorCorrectionLevel: "H",
            });
            const a = document.createElement("a");
            a.href = dataUrl;
            const safeName = (fullName || "member")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") || "member";
            a.download = `jka-membership-${safeName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            setQrBusy(false);
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-sm"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white text-zinc-700 shadow-lg flex items-center justify-center hover:bg-zinc-100 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <DigitalCard fullName={fullName} {...cardProps} />

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={handleShare}
                                className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold tracking-widest uppercase px-4 py-3 rounded-xl transition-colors"
                            >
                                {copied ? <Check size={14} /> : <LinkIcon size={14} />}
                                {copied ? "Copied" : "Share Link"}
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadQr}
                                disabled={qrBusy}
                                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold tracking-widest uppercase px-4 py-3 rounded-xl border border-zinc-200 transition-colors disabled:opacity-60"
                            >
                                {qrBusy ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                                {qrBusy ? "Generating" : "Download QR"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
