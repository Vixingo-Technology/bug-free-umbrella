"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload, Check, Trash2, AlertCircle } from "lucide-react";
import { saveDojoLogoAction } from "@/app/portal/dojo/settings/actions";

type Props = {
    currentUrl: string | null;
};

const ACCEPTED_MIME = ["image/png", "image/svg+xml"];

export default function LogoUploader({ currentUrl }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();

    function pickFile() {
        fileRef.current?.click();
    }

    function handleFile(file: File) {
        setError(null);
        setSaved(false);

        if (!ACCEPTED_MIME.includes(file.type)) {
            setError("Logo must be a PNG or SVG file.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Image must be under 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setPreviewUrl(dataUrl);

            startTransition(async () => {
                const res = await saveDojoLogoAction({
                    dataUrl,
                    mimeType: file.type,
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
            const res = await saveDojoLogoAction({
                dataUrl: null,
                mimeType: null,
            });
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
                    className="w-20 h-20 rounded-sm flex items-center justify-center overflow-hidden border border-dashed border-zinc-200"
                    style={{
                        backgroundImage:
                            "conic-gradient(from 45deg at 50% 50%, #f4f4f5 0 25%, #fff 0 50%, #f4f4f5 0 75%, #fff 0)",
                        backgroundSize: "12px 12px",
                    }}
                >
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewUrl}
                            alt="Dojo logo"
                            className="max-h-full max-w-full object-contain"
                        />
                    ) : (
                        <span className="text-[10px] tracking-widest uppercase text-zinc-400">
                            No logo
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                        Dojo Logo
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Upload a PNG or SVG with{" "}
                        <span className="font-semibold text-zinc-700">
                            no background
                        </span>{" "}
                        (transparent). Max 2MB. Appears on your public dojo
                        profile and certificates.
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
                        {previewUrl ? "Change" : "Upload"}
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
                accept="image/png,image/svg+xml"
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
