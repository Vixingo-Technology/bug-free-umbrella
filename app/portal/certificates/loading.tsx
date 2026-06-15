import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function CertificatesLoading() {
    return (
        <div className="space-y-6 max-w-5xl">
            <SkeletonHeader />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} className="h-48">
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-3 w-32 mt-3" />
                        <Skeleton className="h-3 w-20 mt-2" />
                    </SkeletonCard>
                ))}
            </div>
        </div>
    );
}
