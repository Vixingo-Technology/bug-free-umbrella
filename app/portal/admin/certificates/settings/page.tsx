import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import AdminCertificateSettingsClient from "@/components/portal/admin/certificate-settings-client";

export const dynamic = "force-dynamic";

export default async function AdminCertificateSettingsPage() {
    await requireAdmin();

    const [settings, ranksRaw] = await Promise.all([
        prisma.systemSettings.upsert({
            where: { id: "default" },
            update: {},
            create: { id: "default" },
        }),
        prisma.beltRank.findMany({
            orderBy: { orderIndex: "asc" },
            select: {
                id: true,
                name: true,
                kyuDan: true,
                colorHex: true,
                orderIndex: true,
                certificatePrice: true,
            },
        }),
    ]);

    return (
        <AdminCertificateSettingsClient
            settings={serialize(settings) as never}
            ranks={serialize(ranksRaw) as never}
        />
    );
}
