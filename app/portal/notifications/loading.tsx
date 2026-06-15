import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function NotificationsLoading() {
    return (
        <div className="space-y-6 max-w-3xl">
            <SkeletonHeader />
            <SkeletonCard>
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </SkeletonCard>
        </div>
    );
}
