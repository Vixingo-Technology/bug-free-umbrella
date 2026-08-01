import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import AdminServiceRequestsClient from "@/components/portal/admin/service-requests-client";

export const metadata = { title: "Service requests — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminServiceRequestsPage() {
    await requireAdmin();

    const requests = await prisma.serviceRequest.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
            service: { select: { name: true, slug: true, handler: true } },
            student: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
            dojo: { select: { id: true, name: true, city: true } },
            dojoActedBy: { select: { fullName: true } },
        },
    });

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900">Service requests</h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        Approve or deny student service requests. Requests reach you only after the dojo has acted
                        (or rejected — you can still override).
                    </p>
                </div>
                <AdminServiceRequestsClient requests={serialize(requests) as never} />
            </div>
        </div>
    );
}
