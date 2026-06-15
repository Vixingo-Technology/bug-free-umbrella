import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function EventsLoading() {
    return (
        <div className="space-y-6 max-w-5xl">
            <SkeletonHeader />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} className="h-44">
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-4 w-20 rounded-full" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-5 w-3/4 mt-4" />
                        <Skeleton className="h-3 w-40 mt-2" />
                        <Skeleton className="h-3 w-32 mt-2" />
                    </SkeletonCard>
                ))}
            </div>
        </div>
    );
}
