import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import AdminTransfersClient from "@/components/portal/admin/transfers-client";

export const metadata: Metadata = { title: "Transfer requests — Admin" };

export const dynamic = "force-dynamic";

export default async function AdminTransfersPage() {
    await requireAdmin();

    const requests = await prisma.studentTransferRequest.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
            student: { include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } } },
            fromDojo: { select: { id: true, name: true, city: true } },
            toDojo:   { select: { id: true, name: true, city: true } },
            dojoActedBy:  { select: { id: true, fullName: true } },
            adminActedBy: { select: { id: true, fullName: true } },
        },
    });

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900">Transfer requests</h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        Approve or deny student dojo transfers. Requests reach you only after
                        the current dojo has acted (or rejected — you can still approve).
                    </p>
                </div>
                <AdminTransfersClient requests={serialize(requests) as never} />
            </div>
        </div>
    );
}
