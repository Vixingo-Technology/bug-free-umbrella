import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/portal/skeleton";

export default function RenewLoading() {
    return (
        <div className="space-y-6 max-w-3xl">
            <SkeletonHeader />
            <SkeletonCard className="h-40">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-72 mt-3" />
                <Skeleton className="h-10 w-40 mt-6 rounded-xl" />
            </SkeletonCard>
        </div>
    );
}
