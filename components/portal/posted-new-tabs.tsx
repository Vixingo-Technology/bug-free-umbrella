import Link from "next/link";
import { Inbox, Plus } from "lucide-react";

export type TabValue = "posted" | "new";

export default function PostedNewTabs({
    current,
    basePath,
    postedCount,
    postedLabel = "Posted",
    newLabel = "New",
}: {
    current: TabValue;
    basePath: string;
    postedCount: number;
    postedLabel?: string;
    newLabel?: string;
}) {
    return (
        <div className="flex items-center gap-2 p-1.5 bg-white border border-zinc-200 rounded-sm shadow-sm mb-6 w-fit">
            <TabLink
                href={basePath}
                active={current === "posted"}
                icon={<Inbox size={14} />}
                label={postedLabel}
                badge={postedCount}
            />
            <TabLink
                href={`${basePath}?tab=new`}
                active={current === "new"}
                icon={<Plus size={14} />}
                label={newLabel}
            />
        </div>
    );
}

function TabLink({
    href,
    active,
    icon,
    label,
    badge,
}: {
    href: string;
    active: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors ${
                active
                    ? "bg-accent-red text-white"
                    : "text-zinc-600 hover:text-accent-red"
            }`}
        >
            {icon}
            {label}
            {typeof badge === "number" && (
                <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        active
                            ? "bg-white/20 text-white"
                            : "bg-zinc-100 text-zinc-500"
                    }`}
                >
                    {badge}
                </span>
            )}
        </Link>
    );
}
