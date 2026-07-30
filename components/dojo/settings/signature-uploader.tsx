"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Upload, Check, Trash2, AlertCircle } from "lucide-react";
import { saveDojoSignatureAction } from "@/app/portal/dojo/settings/actions";

async function loadImageForCanvas(src: string): Promise<HTMLImageElement> {
    const load = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Could not load image."));
            el.src = url;
        });

    if (src.startsWith("data:") || src.startsWith("blob:")) {
        return load(src);
    }

    // Remote URL — fetch as blob so the canvas isn't tainted and we don't
    // depend on the browser's crossOrigin cache state.
    const res = await fetch(src, { mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`Could not fetch image (${res.status}).`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    try {
        return await load(url);
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Remove the background from a signature image so only the dark strokes
 * remain, on a transparent canvas. Runs entirely in the browser via
 * <canvas>. Near-white pixels become fully transparent; darker pixels are
 * forced to pure black with alpha scaling for anti-aliased edges.
 *
 * Returns `needsCleanup=true` when the source appears to have a solid
 * background (opaque, near-white corner pixels). Callers use this to decide
 * whether to re-upload a legacy signature.
 */
async function stripSignatureBackground(src: string): Promise<{
    dataUrl: string;
    needsCleanup: boolean;
}> {
    const img = await loadImageForCanvas(src);

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.drawImage(img, 0, 0);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const w = canvas.width;
    const h = canvas.height;

    // Luminance above HI → background (transparent). Below LO → definite
    // stroke (fully opaque). Between → linear alpha ramp. Then any pixel
    // whose final alpha is below ALPHA_FLOOR is snapped to fully transparent
    // to kill faint "ghost" background artefacts left over from a JPG scan
    // (or from an earlier, less-aggressive cleanup pass).
    const HI = 210;
    const LO = 60;
    const RANGE = HI - LO;
    const ALPHA_FLOOR = 100;

    let needsCleanup = false;
    const corners: Array<[number, number]> = [
        [0, 0],
        [w - 1, 0],
        [0, h - 1],
        [w - 1, h - 1],
    ];
    for (const [x, y] of corners) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Case 1: raw upload — opaque near-white corner.
        const rawBg = a > 200 && lum >= HI - 10;
        // Case 2: previously-processed file with partial-alpha black
        // ghost in the corner where fully transparent is expected.
        const ghostBg =
            a > 0 && a < ALPHA_FLOOR && r === 0 && g === 0 && b === 0;
        if (rawBg || ghostBg) {
            needsCleanup = true;
            break;
        }
    }

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const srcA = data[i + 3];

        if (srcA === 0) continue;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        let alpha: number;
        if (lum >= HI) {
            alpha = 0;
        } else if (lum <= LO) {
            alpha = 255;
        } else {
            alpha = Math.round((255 * (HI - lum)) / RANGE);
        }

        alpha = Math.min(srcA, alpha);
        if (alpha < ALPHA_FLOOR) alpha = 0;

        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = alpha;
    }

    ctx.putImageData(image, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), needsCleanup };
}

type Props = {
    currentUrl: string | null;
};

/**
 * Owner-signature uploader for the dojo settings page.
 *
 * The signature is rendered onto the certificate PDF, so the input should be
 * a PNG with a transparent background. We upload directly to Cloudinary via
 * an unsigned preset (same path as avatar uploads) and persist the URL on
 * `dojos.owner_signature_url`.
 */
export default function SignatureUploader({ currentUrl }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();
    const autoCleanTriedRef = useRef(false);

    // One-shot: if the stored signature was uploaded before background
    // removal existed, strip its background client-side and re-upload the
    // transparent version so the certificate PDF gets the clean file too.
    useEffect(() => {
        if (!currentUrl) return;
        if (autoCleanTriedRef.current) return;
        autoCleanTriedRef.current = true;

        (async () => {
            try {
                const { dataUrl, needsCleanup } =
                    await stripSignatureBackground(currentUrl);
                if (!needsCleanup) return;
                setPreviewUrl(dataUrl);
                const res = await saveDojoSignatureAction({ dataUrl });
                if (!("error" in res) && res.url) {
                    setPreviewUrl(res.url);
                }
            } catch (e) {
                console.error("[signature] auto-cleanup failed", e);
            }
        })();
    }, [currentUrl]);

    function pickFile() {
        fileRef.current?.click();
    }

    function handleFile(file: File) {
        setError(null);
        setSaved(false);

        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Image must be under 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const rawDataUrl = reader.result as string;

            let cleanedDataUrl: string;
            try {
                const result = await stripSignatureBackground(rawDataUrl);
                cleanedDataUrl = result.dataUrl;
            } catch (e) {
                console.error("[signature] background strip failed", e);
                setError("Could not process this image. Try another file.");
                return;
            }

            setPreviewUrl(cleanedDataUrl);

            startTransition(async () => {
                const res = await saveDojoSignatureAction({
                    dataUrl: cleanedDataUrl,
                });
                if ("error" in res) {
                    setError(res.error);
                    setPreviewUrl(currentUrl);
                } else {
                    setPreviewUrl(res.url);
                    setSaved(true);
                }
            });
        };
        reader.readAsDataURL(file);
    }

    function remove() {
        setError(null);
        setSaved(false);
        startTransition(async () => {
            const res = await saveDojoSignatureAction({ dataUrl: null });
            if ("error" in res) {
                setError(res.error);
            } else {
                setPreviewUrl(null);
            }
        });
    }

    return (
        <div className="space-y-3">
            <div className="bg-white border border-zinc-200 rounded-sm p-4 flex items-center gap-4">
                <div
                    className="w-32 h-16 border border-dashed border-zinc-200 rounded-sm flex items-center justify-center overflow-hidden"
                    style={
                        previewUrl
                            ? {
                                  backgroundImage:
                                      "linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)",
                                  backgroundSize: "8px 8px",
                                  backgroundPosition:
                                      "0 0, 0 4px, 4px -4px, -4px 0",
                                  backgroundColor: "#fafafa",
                              }
                            : { backgroundColor: "#fafafa" }
                    }
                >
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewUrl}
                            alt="Owner signature"
                            className="max-h-full max-w-full object-contain"
                        />
                    ) : (
                        <span className="text-[10px] tracking-widest uppercase text-zinc-400">
                            No signature
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                        Dojo Owner Signature
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        PNG with transparent background, under 2MB. Required
                        before you can request certificates.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={pickFile}
                        disabled={pending}
                        className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-accent-red disabled:opacity-40 rounded-sm"
                    >
                        {pending ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Upload size={12} />
                        )}
                        Upload
                    </button>
                    {previewUrl && !pending && (
                        <button
                            type="button"
                            onClick={remove}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red px-3 py-2 rounded-sm"
                        >
                            <Trash2 size={12} />
                            Remove
                        </button>
                    )}
                </div>
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                }}
            />

            {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle size={12} /> {error}
                </p>
            )}
            {saved && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Check size={12} /> Saved
                </p>
            )}
        </div>
    );
}
