import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function ProfileLoading() {
    return (
        <div className="space-y-6 max-w-3xl">
            <SkeletonHeader />
            <SkeletonCard>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-56" />
                    </div>
                </div>
            </SkeletonCard>
            <SkeletonCard>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-2 w-20" />
                            <Skeleton className="h-9 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
            </SkeletonCard>
        </div>
    );
}
