import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function OrdersLoading() {
    return (
        <div className="space-y-6 max-w-4xl">
            <SkeletonHeader />
            {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i}>
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="mt-4 space-y-2">
                        {Array.from({ length: 2 }).map((__, j) => (
                            <Skeleton key={j} className="h-10 w-full rounded-lg" />
                        ))}
                    </div>
                </SkeletonCard>
            ))}
        </div>
    );
}
