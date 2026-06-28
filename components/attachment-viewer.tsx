import { FileText, ImageIcon, Download } from "lucide-react";
import type { AttachmentType } from "@/prisma/generated/client";

export default function AttachmentViewer({
    url,
    type,
    title,
}: {
    url: string;
    type: AttachmentType;
    title: string;
}) {
    if (type === "IMAGE") {
        return (
            <figure className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt={title}
                    className="w-full h-auto object-contain bg-zinc-50"
                />
                <figcaption className="px-5 py-3 flex items-center justify-between border-t border-zinc-150 bg-zinc-50/60">
                    <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 flex items-center gap-2">
                        <ImageIcon size={12} />
                        Image attachment
                    </span>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                    >
                        <Download size={12} /> Open
                    </a>
                </figcaption>
            </figure>
        );
    }

    // PDF — open in a new tab on click.
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-zinc-200 rounded-sm shadow-sm hover:border-accent-red hover:shadow-md transition-all group"
        >
            <div className="flex items-center gap-4 p-5">
                <div className="shrink-0 w-12 h-12 rounded-sm bg-accent-red/5 border border-accent-red/20 flex items-center justify-center text-accent-red group-hover:bg-accent-red group-hover:text-white transition-colors">
                    <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                        PDF attachment
                    </p>
                    <p className="text-sm font-bold text-zinc-900 truncate group-hover:text-accent-red transition-colors">
                        {title}
                    </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-accent-red shrink-0">
                    <Download size={12} /> Open
                </span>
            </div>
        </a>
    );
}
