"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AnimatePresence,
    animate,
    motion,
    useMotionValue,
    useTransform,
} from "motion/react";
import { X, QrCode } from "lucide-react";
import QRCode from "qrcode";
import DigitalCard, {
    type MembershipStatusLabel,
} from "@/components/portal/digital-card";

interface CardData {
    id: string;
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

interface Props {
    open: boolean;
    onClose: () => void;
    card: CardData | null;
}

const CARD_HEIGHT = 300;

export default function DigitalCardModal({ open, onClose, card }: Props) {
    const [flipped, setFlipped] = useState(false);
    const rotateX = useMotionValue(0);
    const hoverY = useMotionValue(0);
    const flipY = useMotionValue(0);
    const rotateY = useTransform<number, number>(
        [hoverY, flipY],
        ([h, f]) => h + f,
    );
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    const cardUrl = useMemo(() => {
        if (!card?.id) return "";
        if (typeof window === "undefined") return `/card/${card.id}`;
        return `${window.location.origin}/card/${card.id}`;
    }, [card?.id]);

    useEffect(() => {
        if (!open) return;
        setFlipped(false);
        rotateX.set(0);
        hoverY.set(0);
        flipY.set(0);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose, rotateX, hoverY, flipY]);

    useEffect(() => {
        const controls = animate(flipY, flipped ? 180 : 0, {
            duration: 0.9,
            ease: [0.4, 0, 0.2, 1],
        });
        return () => controls.stop();
    }, [flipped, flipY]);

    useEffect(() => {
        if (!open || !cardUrl) return;
        let cancelled = false;
        QRCode.toDataURL(cardUrl, {
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
    }, [open, cardUrl]);

    const handleMove = (e: React.MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        rotateX.set(-(py - 0.5) * 18);
        if (flipped) {
            hoverY.set(0);
        } else {
            hoverY.set((px - 0.5) * 24);
        }
    };

    const handleLeave = () => {
        rotateX.set(0);
        hoverY.set(0);
    };

    return (
        <AnimatePresence>
            {open && card && (
                <motion.div
                    key="card-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 bg-zinc-950/70 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        onClick={(e) => e.stopPropagation()}
                        initial={{
                            opacity: 0,
                            y: 30,
                            scale: 0.9,
                            rotateY: -90,
                        }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9, rotateY: 90 }}
                        transition={{
                            type: "spring",
                            stiffness: 180,
                            damping: 22,
                        }}
                        style={{ perspective: 1400 }}
                        className="relative w-full max-w-md"
                    >
                        <div className="flex items-center justify-between mb-4 text-white/90">
                            <div>
                                <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-white/60">
                                    JKA Bangladesh
                                </p>
                                <p className="text-sm font-bold">
                                    Digital Membership Card
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="p-1.5 rounded-full border border-white/20 hover:border-white/60 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

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
                            aria-label={
                                flipped ? "Show card front" : "Show card back"
                            }
                            className="relative w-full block cursor-pointer focus:outline-none"
                            style={{
                                perspective: 1200,
                                height: CARD_HEIGHT,
                            }}
                            onMouseMove={handleMove}
                            onMouseLeave={handleLeave}
                        >
                            <motion.div
                                style={{
                                    transformStyle: "preserve-3d",
                                    rotateX,
                                    rotateY,
                                }}
                                className="relative w-full h-full will-change-transform"
                            >
                                {/* Front */}
                                <div
                                    className="absolute inset-0"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <div
                                        className="w-full drop-shadow-[0_25px_45px_rgba(0,0,0,0.45)]"
                                        style={{ height: CARD_HEIGHT }}
                                    >
                                        <DigitalCard
                                            fullName={card.fullName}
                                            currentRank={
                                                card.currentRank ?? undefined
                                            }
                                            dojoName={
                                                card.dojoName ?? undefined
                                            }
                                            role={card.role ?? undefined}
                                            membershipStatus={
                                                card.membershipStatus
                                            }
                                            memberNumber={
                                                card.memberNumber ?? undefined
                                            }
                                            avatarUrl={
                                                card.avatarUrl ?? undefined
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "rotateY(180deg)",
                                    }}
                                >
                                    <div
                                        className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border border-white/10 text-white p-6 drop-shadow-[0_25px_45px_rgba(0,0,0,0.45)] flex flex-col"
                                        style={{ height: CARD_HEIGHT }}
                                    >
                                        <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-accent-red/20 blur-[70px]" />

                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] tracking-[0.3em] uppercase text-white/60 font-bold">
                                                Verified Member
                                            </p>
                                            <p className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-bold">
                                                JKA · BD
                                            </p>
                                        </div>

                                        <div className="flex-1 flex items-center justify-between gap-6 mt-4">
                                            <div className="flex flex-col gap-4 min-w-0">
                                                <Detail
                                                    label="Reg No"
                                                    value={
                                                        card.memberNumber ?? "—"
                                                    }
                                                    emphasized
                                                />
                                                {card.joinedLabel && (
                                                    <Detail
                                                        label="Joined"
                                                        value={card.joinedLabel}
                                                    />
                                                )}
                                                {card.expiresLabel && (
                                                    <Detail
                                                        label="Valid Until"
                                                        value={
                                                            card.expiresLabel
                                                        }
                                                    />
                                                )}
                                            </div>

                                            <div className="flex flex-col items-center gap-2 shrink-0">
                                                <div className="w-[104px] h-[104px] rounded-md bg-white p-1.5 shadow-lg">
                                                    {qrDataUrl ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={qrDataUrl}
                                                            alt="Scan for public card"
                                                            className="w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                                            <QrCode size={30} />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[8px] tracking-widest uppercase text-white/40 font-mono">
                                                    Scan to verify
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <p className="text-center mt-6 text-[10px] uppercase tracking-widest text-white/50">
                            Tap the card to flip
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Detail({
    label,
    value,
    emphasized = false,
}: {
    label: string;
    value: string;
    emphasized?: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[9px] tracking-widest uppercase text-white/40">
                {label}
            </p>
            <p
                className={`mt-1 truncate ${
                    emphasized
                        ? "text-base font-bold tracking-widest font-mono"
                        : "text-xs font-semibold"
                }`}
            >
                {value}
            </p>
        </div>
    );
}
