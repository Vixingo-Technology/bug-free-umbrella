import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { serialize } from "@/lib/serialize";
import DojoServiceRequestsClient from "@/components/dojo/service-requests-client";

export const metadata = { title: "Service requests — Dojo" };
export const dynamic = "force-dynamic";

export default async function DojoServiceRequestsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const current = await loadCurrentUser(user.id);
    if (
        !current ||
        (current.role !== "DOJO_OWNER" && current.role !== "DOJO_MANAGER") ||
        !current.dojoId
    ) {
        redirect("/portal");
    }

    const requests = await prisma.serviceRequest.findMany({
        where: { dojoId: current.dojoId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
            service: { select: { name: true, slug: true, handler: true } },
            student: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
        },
    });

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900">Service requests</h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        Review your students' service requests. Once you approve or reject, the request moves to JKA HQ for final action.
                    </p>
                </div>
                <DojoServiceRequestsClient requests={serialize(requests) as never} />
            </div>
        </div>
    );
}
