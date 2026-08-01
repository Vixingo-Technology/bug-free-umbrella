import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import ServiceRequestClient from "@/components/portal/services/service-request-client";

type PageParams = Promise<{ slug: string }>;
type SearchParams = Promise<{ status?: string; free?: string }>;

const OPEN_STATUSES = ["PENDING_PAYMENT", "AWAITING_DOJO", "AWAITING_ADMIN"] as const;

export async function generateMetadata({ params }: { params: PageParams }) {
    const { slug } = await params;
    const service = await prisma.service.findUnique({
        where: { slug },
        select: { name: true },
    });
    return { title: `${service?.name ?? "Service"} — JKA Bangladesh` };
}

export default async function ServiceRequestPage({
    params,
    searchParams,
}: {
    params: PageParams;
    searchParams: SearchParams;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { slug } = await params;
    const { status, free } = await searchParams;

    const service = await prisma.service.findUnique({ where: { slug } });
    if (!service || !service.isActive) notFound();

    // Sweep stale requests so the "one open at a time" guard doesn't hang.
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.serviceRequest.updateMany({
        where: {
            studentId: user.id,
            serviceId: service.id,
            status: "PENDING_PAYMENT",
            createdAt: { lt: cutoff },
        },
        data: { status: "CANCELLED" },
    });

    const student = await prisma.student.findUnique({
        where: { id: user.id },
        include: {
            user: { select: { fullName: true } },
            dojo: { select: { id: true, name: true } },
        },
    });
    if (!student) redirect("/portal");

    const activeRequest = await prisma.serviceRequest.findFirst({
        where: {
            studentId: user.id,
            serviceId: service.id,
            status: { in: [...OPEN_STATUSES] },
        },
        include: {
            service: { select: { name: true } },
            order: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const history = await prisma.serviceRequest.findMany({
        where: {
            studentId: user.id,
            serviceId: service.id,
            status: { in: ["APPROVED", "DENIED", "CANCELLED"] },
        },
        include: { service: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    const canRequest =
        !activeRequest &&
        !!student.dojoId &&
        student.membershipStatus === "ACTIVE";

    return (
        <ServiceRequestClient
            service={{
                id: service.id,
                slug: service.slug,
                name: service.name,
                description: service.description,
                fee: Number(service.feeBDT),
                handler: service.handler,
            }}
            student={{
                fullName: student.user.fullName,
                membershipStatus: student.membershipStatus,
                currentRank: student.currentRank ?? null,
                dojo: student.dojo ? { id: student.dojo.id, name: student.dojo.name } : null,
            }}
            activeRequest={serialize(activeRequest) as never}
            history={serialize(history) as never}
            canRequest={canRequest}
            justCompletedFree={status === "success" && free === "1"}
        />
    );
}
