/**
 * Skeleton primitives for portal loading states.
 *
 * `Skeleton` is a single shimmer block. `SkeletonCard` is a rounded
 * panel that matches the portal's card visual language.
 *
 * Used by `app/portal/.../loading.tsx` files — those render instantly while
 * the Server Component fetches data, so navigation feels immediate.
 */

import { ReactNode } from "react";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`relative overflow-hidden rounded-md bg-zinc-100 ${className}`}
            aria-hidden
        >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>
    );
}

export function SkeletonCard({ children, className = "" }: { children?: ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 ${className}`}>
            {children}
        </div>
    );
}

/** Shared page header skeleton — title + subtitle. */
export function SkeletonHeader() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
        </div>
    );
}
