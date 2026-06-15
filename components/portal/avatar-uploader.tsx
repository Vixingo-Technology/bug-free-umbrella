"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { uploadAvatarAction } from "@/app/actions/avatar";

interface Props {
    initialUrl?: string | null;
    fallbackInitial?: string;
    /** Tailwind size classes for the round avatar (w-?/h-?). */
    sizeClasses?: string;
    /** Called after a successful upload, with the new URL. */
    onUploaded?: (url: string) => void;
    /** Adds a hint line under the picker. */
    showHint?: boolean;
}

export default function AvatarUploader({
    initialUrl,
    fallbackInitial = "M",
    sizeClasses = "w-24 h-24",
    onUploaded,
    showHint = true,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [url, setUrl] = useState<string | null>(initialUrl ?? null);
    const [error, setError] = useState<string | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const [isPending, startTransition] = useTransition();

    function pickFile() {
        if (isPending) return;
        inputRef.current?.click();
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setJustSaved(false);

        // Optimistic preview while the upload is in flight.
        const previewUrl = URL.createObjectURL(file);
        setUrl(previewUrl);

        const fd = new FormData();
        fd.append("avatar", file);

        startTransition(async () => {
            const res = await uploadAvatarAction(fd);
            if (res.error || !res.url) {
                setError(res.error ?? "Upload failed.");
                setUrl(initialUrl ?? null);
            } else {
                setUrl(res.url);
                setJustSaved(true);
                onUploaded?.(res.url);
                setTimeout(() => setJustSaved(false), 2400);
            }
            URL.revokeObjectURL(previewUrl);
            if (inputRef.current) inputRef.current.value = "";
        });
    }

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={pickFile}
                disabled={isPending}
                aria-label="Change profile photo"
                className={`relative ${sizeClasses} rounded-full overflow-hidden border-2 border-white shadow-lg group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/60 disabled:opacity-80`}
            >
                {url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="flex w-full h-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-700 text-white text-3xl font-bold">
                        {fallbackInitial}
                    </span>
                )}

                <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold tracking-widest uppercase gap-1">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    {isPending ? "Uploading" : "Change"}
                </span>
            </button>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleChange}
            />

            <button
                type="button"
                onClick={pickFile}
                disabled={isPending}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-accent-red hover:text-zinc-900 transition-colors disabled:opacity-60"
            >
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                {url ? "Change Photo" : "Upload Photo"}
            </button>

            {showHint && !error && !justSaved && (
                <p className="text-[11px] text-zinc-400 mt-1">JPG, PNG or WebP · max 5 MB</p>
            )}

            {justSaved && (
                <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 font-medium">
                    <CheckCircle2 size={12} /> Photo updated
                </p>
            )}

            {error && (
                <p className="flex items-center gap-1 text-[11px] text-red-600 mt-1 font-medium">
                    <AlertCircle size={12} /> {error}
                </p>
            )}
        </div>
    );
}
