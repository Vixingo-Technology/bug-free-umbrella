import Link from "next/link";

/**
 * Compact paginator: « Prev · 1 … 4 5 6 … 12 · Next »
 * Used by admin/dojo Posted tabs and the public archive.
 */
export default function Pager({
    page,
    pageCount,
    basePath,
    extraParams = {},
}: {
    page: number;
    pageCount: number;
    basePath: string;
    extraParams?: Record<string, string>;
}) {
    if (pageCount <= 1) return null;

    function href(p: number) {
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(extraParams)) {
            if (v) sp.set(k, v);
        }
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `${basePath}?${qs}` : basePath;
    }

    const pages: (number | "…")[] = [];
    const add = (n: number) => {
        if (!pages.includes(n)) pages.push(n);
    };
    add(1);
    for (let p = page - 1; p <= page + 1; p++) {
        if (p > 1 && p < pageCount) add(p);
    }
    if (pageCount > 1) add(pageCount);
    const withEllipses: (number | "…")[] = [];
    for (let i = 0; i < pages.length; i++) {
        const n = pages[i];
        const prev = pages[i - 1];
        if (typeof n === "number" && typeof prev === "number" && n - prev > 1) {
            withEllipses.push("…");
        }
        withEllipses.push(n);
    }

    return (
        <nav className="flex items-center justify-center gap-1 mt-6 flex-wrap">
            <Link
                href={href(Math.max(1, page - 1))}
                aria-disabled={page === 1}
                className={`text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm border ${
                    page === 1
                        ? "border-zinc-100 text-zinc-300 pointer-events-none"
                        : "border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red"
                }`}
            >
                Prev
            </Link>
            {withEllipses.map((n, i) =>
                n === "…" ? (
                    <span
                        key={`e-${i}`}
                        className="px-2 text-xs text-zinc-400"
                    >
                        …
                    </span>
                ) : (
                    <Link
                        key={n}
                        href={href(n)}
                        aria-current={n === page ? "page" : undefined}
                        className={`text-xs font-bold px-3 py-2 rounded-sm border min-w-[34px] text-center ${
                            n === page
                                ? "border-accent-red bg-accent-red text-white"
                                : "border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red"
                        }`}
                    >
                        {n}
                    </Link>
                ),
            )}
            <Link
                href={href(Math.min(pageCount, page + 1))}
                aria-disabled={page === pageCount}
                className={`text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm border ${
                    page === pageCount
                        ? "border-zinc-100 text-zinc-300 pointer-events-none"
                        : "border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red"
                }`}
            >
                Next
            </Link>
        </nav>
    );
}
