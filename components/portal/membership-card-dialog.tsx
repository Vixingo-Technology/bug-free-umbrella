"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Link as LinkIcon, Check, Loader2, Download, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import DigitalCard, { type MembershipStatusLabel } from "./digital-card";
import DigitalCardBack from "./digital-card-back";

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
    joinedLabel?: string | null;
    expiresLabel?: string | null;
}

// Off-screen render size for PDF capture (kept consistent across viewports).
const CAPTURE_W = 384;
const CAPTURE_H = 300;

export default function MembershipCardDialog({
    open,
    onClose,
    memberId,
    fullName,
    joinedLabel,
    expiresLabel,
    ...cardProps
}: Props) {
    const [copied, setCopied] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const [busy, setBusy] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    const frontRef = useRef<HTMLDivElement | null>(null);
    const backRef = useRef<HTMLDivElement | null>(null);

    const shareUrl = useMemo(() => {
        if (typeof window === "undefined") return `/card/${memberId}`;
        return `${window.location.origin}/card/${memberId}`;
    }, [memberId]);

    useEffect(() => {
        if (!open) return;
        setFlipped(false);
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        QRCode.toDataURL(shareUrl, {
            width: 320,
            margin: 1,
            color: { dark: "#0a0a0a", light: "#ffffff" },
            errorCorrectionLevel: "M",
        })
            .then((url) => {
                if (!cancelled) setQrDataUrl(url);
            })
            .catch(() => {
                if (!cancelled) setQrDataUrl(null);
            });
        return () => {
            cancelled = true;
        };
    }, [open, shareUrl]);

    async function handleShare() {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        } catch {
            window.prompt("Copy this link:", shareUrl);
        }
    }

    const safeName = useMemo(
        () =>
            (fullName || "member")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") || "member",
        [fullName],
    );

    async function handleDownloadPdf() {
        if (!frontRef.current || !backRef.current) return;
        setBusy(true);
        try {
            const [{ toPng }, { PDFDocument }] = await Promise.all([
                import("html-to-image"),
                import("pdf-lib"),
            ]);

            const [frontPng, backPng] = await Promise.all([
                toPng(frontRef.current, {
                    pixelRatio: 3,
                    cacheBust: true,
                    backgroundColor: "#0a0a0a",
                }),
                toPng(backRef.current, {
                    pixelRatio: 3,
                    cacheBust: true,
                    backgroundColor: "#0a0a0a",
                }),
            ]);

            const pdf = await PDFDocument.create();

            // Landscape A4 in points (1pt = 1/72 in). 842 × 595.
            const pageW = 842;
            const pageH = 595;
            const page = pdf.addPage([pageW, pageH]);

            const [frontImg, backImg] = await Promise.all([
                pdf.embedPng(frontPng),
                pdf.embedPng(backPng),
            ]);

            // Standard ID-1 card: 85.6mm × 53.98mm → 242.6 × 153.0 pt.
            const cardW = 242.6;
            const cardH = 153.0;
            const gap = 24;
            const totalW = cardW * 2 + gap;
            const startX = (pageW - totalW) / 2;
            const y = (pageH - cardH) / 2;

            page.drawImage(frontImg, {
                x: startX,
                y,
                width: cardW,
                height: cardH,
            });
            page.drawImage(backImg, {
                x: startX + cardW + gap,
                y,
                width: cardW,
                height: cardH,
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `jka-card-${safeName}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setBusy(false);
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
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-sm my-auto"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white text-zinc-700 shadow-lg flex items-center justify-center hover:bg-zinc-100 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        {/* Flippable preview */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setFlipped((v) => !v)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setFlipped((v) => !v);
                                }
                            }}
                            aria-label={flipped ? "Show card front" : "Show card back"}
                            className="relative w-full h-[300px] cursor-pointer focus:outline-none"
                            style={{ perspective: 1200 }}
                        >
                            <motion.div
                                animate={{ rotateY: flipped ? 180 : 0 }}
                                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                                style={{ transformStyle: "preserve-3d" }}
                                className="relative w-full h-full"
                            >
                                <div
                                    className="absolute inset-0"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <DigitalCard fullName={fullName} {...cardProps} />
                                </div>
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "rotateY(180deg)",
                                    }}
                                >
                                    <DigitalCardBack
                                        memberNumber={cardProps.memberNumber}
                                        joinedLabel={joinedLabel}
                                        expiresLabel={expiresLabel}
                                        qrDataUrl={qrDataUrl}
                                    />
                                </div>
                            </motion.div>
                        </div>

                        <p className="text-center mt-3 text-[10px] uppercase tracking-widest text-white/60 flex items-center justify-center gap-1.5">
                            <RefreshCw size={10} />
                            Tap the card to flip
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={busy}
                                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold tracking-widest uppercase px-4 py-3 rounded-xl border border-zinc-200 transition-colors disabled:opacity-60"
                            >
                                {busy ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Download size={14} />
                                )}
                                {busy ? "Building PDF" : "Download PDF"}
                            </button>
                            <button
                                type="button"
                                onClick={handleShare}
                                className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold tracking-widest uppercase px-4 py-3 rounded-xl transition-colors"
                            >
                                {copied ? <Check size={14} /> : <LinkIcon size={14} />}
                                {copied ? "Copied" : "Share Link"}
                            </button>
                        </div>

                        {/* Off-screen high-res render targets used for the PDF
                            capture so the exported cards are always at the
                            same crisp size regardless of viewport, and don't
                            fight with the flip transform on the visible copy. */}
                        <div
                            aria-hidden
                            style={{
                                position: "fixed",
                                left: -10000,
                                top: 0,
                                pointerEvents: "none",
                                opacity: 0,
                            }}
                        >
                            <div ref={frontRef} style={{ width: CAPTURE_W, height: CAPTURE_H }}>
                                <DigitalCard fullName={fullName} {...cardProps} />
                            </div>
                            <div ref={backRef} style={{ width: CAPTURE_W, height: CAPTURE_H }}>
                                <DigitalCardBack
                                    memberNumber={cardProps.memberNumber}
                                    joinedLabel={joinedLabel}
                                    expiresLabel={expiresLabel}
                                    qrDataUrl={qrDataUrl}
                                />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
