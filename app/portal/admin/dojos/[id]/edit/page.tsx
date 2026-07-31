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
            owner: {
                select: {
                    id: true,
                    user: { select: { fullName: true, email: true } },
                },
            },
        },
    });
    if (!dojo) notFound();

    return (
        <DojoEditForm
            dojo={{
                id: dojo.id,
                name: dojo.name,
                address: dojo.address,
                city: dojo.city,
                phone: dojo.phone,
                email: dojo.email,
                latitude: dojo.latitude,
                longitude: dojo.longitude,
                isActive: dojo.isActive,
                lockedFeatures: dojo.lockedFeatures ?? [],
                studentMilestone: dojo.studentMilestone,
                owner: dojo.owner
                    ? {
                          id: dojo.owner.id,
                          fullName: dojo.owner.user.fullName,
                          email: dojo.owner.user.email,
                      }
                    : null,
            }}
        />
    );
}
