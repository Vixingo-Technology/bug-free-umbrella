import { prisma } from "@/lib/prisma";
import { TRANSFER_REQUEST_FEE_BDT } from "@/lib/constants";
import { getFees } from "@/lib/settings/fees";

const TRANSFER_SLUG = "transfer-dojo";

/**
 * Source of truth for the transfer-dojo fee: the `transfer-dojo` row in
 * the `services` table (editable from the admin services page). Falls
 * back to the legacy `system_settings.transfer_fee_bdt` if the service
 * row is missing, and finally to the built-in default.
 *
 * Returns `{ fee, serviceId }` — callers need `serviceId` to scope
 * coupon lookups to the transfer service.
 */
export async function loadTransferService(): Promise<{
    fee: number;
    serviceId: string | null;
}> {
    const svc = await prisma.service.findUnique({
        where: { slug: TRANSFER_SLUG },
        select: { id: true, feeBDT: true, isActive: true },
    });
    if (svc && svc.isActive) {
        return { fee: Number(svc.feeBDT), serviceId: svc.id };
    }
    // Fallbacks — legacy SystemSettings then the compiled-in default.
    const { transferFeeBDT } = await getFees();
    return {
        fee: transferFeeBDT || TRANSFER_REQUEST_FEE_BDT,
        serviceId: svc?.id ?? null,
    };
}

export async function getTransferFee(): Promise<number> {
    return (await loadTransferService()).fee;
}
