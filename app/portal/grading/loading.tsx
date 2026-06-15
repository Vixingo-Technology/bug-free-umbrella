import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function GradingLoading() {
    return (
        <div className="space-y-6 max-w-4xl">
            <SkeletonHeader />
            <SkeletonCard className="h-32">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-3/4 mt-3" />
                <Skeleton className="h-8 w-32 mt-4 rounded-lg" />
            </SkeletonCard>
            <SkeletonCard>
                <Skeleton className="h-4 w-44" />
                <div className="space-y-2 mt-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            </SkeletonCard>
        </div>
    );
}
