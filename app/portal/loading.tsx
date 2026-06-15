import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function DashboardLoading() {
    return (
        <div className="space-y-6 max-w-5xl">
            <SkeletonHeader />

            {/* 4 stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i}>
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <Skeleton className="h-3 w-20 mt-4" />
                        <Skeleton className="h-5 w-28 mt-2" />
                    </SkeletonCard>
                ))}
            </div>

            {/* Member card + gradings */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <SkeletonCard className="lg:col-span-2 h-56">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16 mt-1" />
                    <Skeleton className="h-5 w-40 mt-6" />
                    <Skeleton className="h-3 w-32 mt-2" />
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i}>
                                <Skeleton className="h-2 w-12" />
                                <Skeleton className="h-3 w-20 mt-1" />
                            </div>
                        ))}
                    </div>
                </SkeletonCard>
                <SkeletonCard className="lg:col-span-3 h-56">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="space-y-2 mt-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-xl" />
                        ))}
                    </div>
                </SkeletonCard>
            </div>

            {/* Events strip */}
            <SkeletonCard>
                <Skeleton className="h-4 w-32" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
            </SkeletonCard>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} className="h-24" />
                ))}
            </div>
        </div>
    );
}
