import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import DojoEditForm from "@/components/portal/admin/dojo-edit-form";

export const dynamic = "force-dynamic";

export default async function EditDojoPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;

    const dojo = await prisma.dojo.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            email: true,
            latitude: true,
            longitude: true,
            isActive: true,
            lockedFeatures: true,
            studentMilestone: true,
        },
    });
    if (!dojo) notFound();

    return (
        <DojoEditForm
            dojo={{
                ...dojo,
                lockedFeatures: dojo.lockedFeatures ?? [],
            }}
        />
    );
}
