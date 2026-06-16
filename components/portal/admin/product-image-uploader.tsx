"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, X, AlertCircle, RefreshCw } from "lucide-react";
import { uploadProductImageAction } from "@/app/actions/admin-products";

interface Props {
    value: string;
    onChange: (url: string) => void;
}

export default function ProductImageUploader({ value, onChange }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function pick() {
        if (isPending) return;
        inputRef.current?.click();
    }

    function clear() {
        setError(null);
        setPreview(null);
        onChange("");
        if (inputRef.current) inputRef.current.value = "";
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Show the picked file immediately while uploading in the background.
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);

        const fd = new FormData();
        fd.append("image", file);

        startTransition(async () => {
            const res = await uploadProductImageAction(fd);
            URL.revokeObjectURL(localUrl);
            setPreview(null);

            if (res.error || !res.url) {
                setError(res.error ?? "Upload failed.");
            } else {
                onChange(res.url);
            }
            if (inputRef.current) inputRef.current.value = "";
        });
    }

    const shown = preview ?? value;

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
                className="hidden"
                onChange={handleChange}
            />

            {shown ? (
                <div className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                    <div className="aspect-video w-full bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={shown}
                            alt="Product"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {isPending && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold tracking-widest uppercase gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Uploading
                        </div>
                    )}

                    <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={pick}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-lg bg-white/90 text-zinc-800 hover:bg-white shadow-sm transition-colors disabled:opacity-60"
                        >
                            <RefreshCw size={10} /> Replace
                        </button>
                        <button
                            type="button"
                            onClick={clear}
                            disabled={isPending}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-zinc-600 hover:text-red-600 hover:bg-white shadow-sm transition-colors disabled:opacity-60"
                            aria-label="Remove image"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={pick}
                    disabled={isPending}
                    className="w-full aspect-video flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 hover:border-accent-red/40 hover:bg-accent-red/[0.02] text-zinc-500 hover:text-accent-red transition-colors disabled:opacity-60"
                >
                    {isPending ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <ImagePlus size={20} />
                    )}
                    <span className="text-xs font-bold tracking-widest uppercase">
                        {isPending ? "Uploading…" : "Upload image"}
                    </span>
                    <span className="text-[10px] text-zinc-400 normal-case tracking-normal">
                        JPG, PNG, WebP · up to 8 MB
                    </span>
                </button>
            )}

            {error && (
                <p className="flex items-center gap-1 text-[11px] text-red-600 mt-2 font-medium">
                    <AlertCircle size={12} /> {error}
                </p>
            )}
        </div>
    );
}
