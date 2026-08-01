import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import AdminServicesClient from "@/components/portal/admin/services-client";

export const metadata = { title: "Services — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
    await requireAdmin();

    const services = await prisma.service.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900">Services</h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        Manage the services students can request from the portal. Set the fee, activate/deactivate,
                        and add new services as needed.
                    </p>
                </div>
                <AdminServicesClient services={serialize(services) as never} />
            </div>
        </div>
    );
}
