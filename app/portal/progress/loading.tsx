import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function ProgressLoading() {
    return (
        <div className="space-y-6 max-w-4xl">
            <SkeletonHeader />

            {/* Hero — current rank */}
            <SkeletonCard className="h-44 bg-gradient-to-br from-zinc-100 to-zinc-50">
                <div className="flex gap-6">
                    <Skeleton className="h-20 w-20 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            </SkeletonCard>

            {/* Progress bar placeholder */}
            <SkeletonCard className="h-40">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-full mt-6 rounded-full" />
                <div className="grid grid-cols-3 gap-3 mt-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 rounded-lg" />
                    ))}
                </div>
            </SkeletonCard>

            {/* Belt progression list */}
            <SkeletonCard>
                <Skeleton className="h-4 w-44" />
                <div className="space-y-2 mt-5">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                </div>
            </SkeletonCard>
        </div>
    );
}
