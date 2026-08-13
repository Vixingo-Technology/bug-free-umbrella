import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import ServiceRequestClient from "@/components/portal/services/service-request-client";

type PageParams = Promise<{ slug: string }>;
type SearchParams = Promise<{
    status?: string;
    free?: string;
    orderId?: string;
    reason?: string;
}>;

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

    const { slug } = await params;
    const { status, free, orderId, reason } = await searchParams;

    // Unauthenticated visitors are allowed here only when returning from an
    // SSLCommerz post-payment redirect (the middleware whitelists that case
    // because the cross-site POST chain can drop the session cookie).
    if (!user && !status) redirect("/login");

    const service = await prisma.service.findUnique({ where: { slug } });
    if (!service || !service.isActive) notFound();

    // Resolve the buyer — signed-in visitor, or (post-payment, session lost)
    // the student who owns the passed orderId. Either way we then render the
    // page with real data so the popup lands on the same screen the buyer
    // came from, not on /login.
    let studentId: string | null = user?.id ?? null;
    if (!studentId && orderId) {
        const order = await prisma.shopOrder.findUnique({
            where: { id: orderId },
            select: { userId: true },
        });
        studentId = order?.userId ?? null;
    }

    if (!studentId) redirect("/login");

    // Sweep stale requests so the "one open at a time" guard doesn't hang.
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.serviceRequest.updateMany({
        where: {
            studentId,
            serviceId: service.id,
            status: "PENDING_PAYMENT",
            createdAt: { lt: cutoff },
        },
        data: { status: "CANCELLED" },
    });

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            user: { select: { fullName: true } },
            dojo: { select: { id: true, name: true } },
        },
    });
    if (!student) redirect(user ? "/portal" : "/login");

    const activeRequest = await prisma.serviceRequest.findFirst({
        where: {
            studentId,
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
            studentId,
            serviceId: service.id,
            status: { in: ["APPROVED", "DENIED", "CANCELLED"] },
        },
        include: { service: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    // Only signed-in visitors can submit a fresh request — an unauth
    // post-payment landing sees the popup on top of a read-only view.
    const canRequest =
        !!user &&
        !activeRequest &&
        !!student.dojoId &&
        student.membershipStatus === "ACTIVE";

    // Find the last pending order for retry when payment failed. Prefer the
    // active request's linked order; fall back to the passed orderId.
    const retryOrderId =
        status === "failed"
            ? (activeRequest?.order?.id ?? orderId ?? null)
            : null;

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
            paymentStatus={status === "success" && free !== "1" ? "success" : status === "failed" ? "failed" : null}
            paymentReason={reason ?? null}
            retryCheckoutUrl={retryOrderId ? `/portal/checkout?orderId=${retryOrderId}` : null}
        />
    );
}
