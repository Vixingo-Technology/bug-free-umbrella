"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

interface Props {
    file: File;
    onCancel: () => void;
    onConfirm: (cropped: Blob) => void | Promise<void>;
    /** Output size in pixels (square). Defaults to 512. */
    outputSize?: number;
    /** Preview viewport size in CSS pixels. Defaults to 288. */
    viewportSize?: number;
    busy?: boolean;
}

export default function AvatarCropperDialog({
    file,
    onCancel,
    onConfirm,
    outputSize = 512,
    viewportSize = 288,
    busy = false,
}: Props) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [baseScale, setBaseScale] = useState(1);
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

    useEffect(() => {
        setMounted(true);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        const image = new Image();
        image.onload = () => {
            const bs = Math.max(viewportSize / image.naturalWidth, viewportSize / image.naturalHeight);
            setBaseScale(bs);
            const dw = image.naturalWidth * bs;
            const dh = image.naturalHeight * bs;
            setOffset({ x: (viewportSize - dw) / 2, y: (viewportSize - dh) / 2 });
            setZoom(1);
            setImg(image);
        };
        image.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file, viewportSize]);

    const clamp = useCallback(
        (x: number, y: number, zoomVal: number) => {
            if (!img) return { x, y };
            const scale = baseScale * zoomVal;
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            const minX = viewportSize - dw;
            const minY = viewportSize - dh;
            return {
                x: Math.min(0, Math.max(minX, x)),
                y: Math.min(0, Math.max(minY, y)),
            };
        },
        [img, baseScale, viewportSize]
    );

    function onZoomChange(next: number) {
        if (!img) return;
        // Zoom around the viewport center for a natural feel.
        const cx = viewportSize / 2;
        const cy = viewportSize / 2;
        const oldScale = baseScale * zoom;
        const newScale = baseScale * next;
        const relX = (cx - offset.x) / oldScale;
        const relY = (cy - offset.y) / oldScale;
        const newX = cx - relX * newScale;
        const newY = cy - relY * newScale;
        setZoom(next);
        setOffset(clamp(newX, newY, next));
    }

    function beginDrag(clientX: number, clientY: number) {
        dragRef.current = { startX: clientX, startY: clientY, ox: offset.x, oy: offset.y };
    }

    function moveDrag(clientX: number, clientY: number) {
        const d = dragRef.current;
        if (!d) return;
        const nx = d.ox + (clientX - d.startX);
        const ny = d.oy + (clientY - d.startY);
        setOffset(clamp(nx, ny, zoom));
    }

    function endDrag() {
        dragRef.current = null;
    }

    async function handleConfirm() {
        if (!img || saving || busy) return;
        setSaving(true);
        try {
            const canvas = document.createElement("canvas");
            canvas.width = outputSize;
            canvas.height = outputSize;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas not supported");
            ctx.imageSmoothingQuality = "high";

            const scale = baseScale * zoom;
            const sx = -offset.x / scale;
            const sy = -offset.y / scale;
            const sSize = viewportSize / scale;

            ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);

            const blob: Blob | null = await new Promise((resolve) =>
                canvas.toBlob(resolve, "image/jpeg", 0.9)
            );
            if (!blob) throw new Error("Could not export image");
            await onConfirm(blob);
        } finally {
            setSaving(false);
        }
    }

    const scale = baseScale * zoom;
    const busyState = saving || busy;

    if (!mounted) return null;

    const dialog = (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            style={{ zIndex: 2147483647 }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-900">
                        Position Your Photo
                    </h3>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busyState}
                        aria-label="Cancel"
                        className="p-1 text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-40"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-5 flex flex-col items-center">
                    <p className="text-xs text-zinc-500 mb-4 text-center">
                        Drag to reposition · use the slider to zoom
                    </p>

                    <div
                        ref={containerRef}
                        className="relative select-none touch-none bg-zinc-950 overflow-hidden"
                        style={{ width: viewportSize, height: viewportSize }}
                        onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
                        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
                        onMouseUp={endDrag}
                        onMouseLeave={endDrag}
                        onTouchStart={(e) => {
                            const t = e.touches[0];
                            if (t) beginDrag(t.clientX, t.clientY);
                        }}
                        onTouchMove={(e) => {
                            const t = e.touches[0];
                            if (t) moveDrag(t.clientX, t.clientY);
                        }}
                        onTouchEnd={endDrag}
                    >
                        {objectUrl && img && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={objectUrl}
                                alt=""
                                draggable={false}
                                className="absolute top-0 left-0 origin-top-left pointer-events-none"
                                style={{
                                    width: `${img.naturalWidth}px`,
                                    height: `${img.naturalHeight}px`,
                                    maxWidth: "none",
                                    maxHeight: "none",
                                    minWidth: 0,
                                    minHeight: 0,
                                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                                    transformOrigin: "0 0",
                                }}
                            />
                        )}

                        {/* Circular mask overlay */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background:
                                    "radial-gradient(circle at center, transparent 0, transparent calc(50% - 1px), rgba(0,0,0,0.55) calc(50% + 1px))",
                            }}
                        />
                        <div
                            className="absolute inset-0 pointer-events-none rounded-full border-2 border-white/70"
                            style={{
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
                            }}
                        />

                        {!img && (
                            <div className="absolute inset-0 flex items-center justify-center text-white/80">
                                <Loader2 size={22} className="animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full mt-5">
                        <ZoomOut size={16} className="text-zinc-500 shrink-0" />
                        <input
                            type="range"
                            min={1}
                            max={4}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                            disabled={!img || busyState}
                            className="flex-1 accent-red-600"
                            aria-label="Zoom"
                        />
                        <ZoomIn size={16} className="text-zinc-500 shrink-0" />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-100 bg-zinc-50">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busyState}
                        className="px-4 py-2 text-xs font-bold tracking-widest uppercase text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!img || busyState}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent-red text-white text-xs font-bold tracking-widest uppercase shadow hover:bg-red-700 transition-colors disabled:opacity-60"
                    >
                        {busyState && <Loader2 size={12} className="animate-spin" />}
                        {busyState ? "Saving" : "Save Photo"}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(dialog, document.body);
}
