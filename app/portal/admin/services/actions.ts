"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

function slugify(input: string) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

export async function createServiceAction(input: {
    name: string;
    description?: string;
    feeBDT: number;
    handler?: string;
}): Promise<{ error?: string } | void> {
    await requireAdmin();

    const name = input.name.trim();
    if (!name) return { error: "Service name is required." };
    const fee = Math.max(0, Math.round(input.feeBDT || 0));

    let slug = slugify(name);
    if (!slug) slug = `service-${Date.now()}`;

    // Ensure the slug is unique.
    for (let attempt = 0; attempt < 6; attempt++) {
        const existing = await prisma.service.findUnique({ where: { slug } });
        if (!existing) break;
        slug = `${slugify(name)}-${attempt + 2}`;
    }

    await prisma.service.create({
        data: {
            slug,
            name,
            description: input.description?.trim() || null,
            feeBDT: fee,
            handler: input.handler?.trim() || "generic",
        },
    });

    revalidatePath("/portal/admin/services");
    revalidatePath("/portal/services");
    revalidatePath("/portal/transfer");
    revalidatePath("/portal/dojo/coupons");
}

export async function updateServiceAction(input: {
    id: string;
    name: string;
    description?: string;
    feeBDT: number;
    isActive: boolean;
}): Promise<{ error?: string } | void> {
    await requireAdmin();

    const name = input.name.trim();
    if (!name) return { error: "Service name is required." };
    const fee = Math.max(0, Math.round(input.feeBDT || 0));

    await prisma.service.update({
        where: { id: input.id },
        data: {
            name,
            description: input.description?.trim() || null,
            feeBDT: fee,
            isActive: input.isActive,
        },
    });

    revalidatePath("/portal/admin/services");
    revalidatePath("/portal/services");
    revalidatePath("/portal/transfer");
    revalidatePath("/portal/dojo/coupons");
}

// Built-in services that ship with the platform. Admins can edit them
// (name, description, fee) and toggle isActive, but they can never be
// hard-deleted — other flows (transfer, kyu/dan) depend on the slug.
const PROTECTED_SERVICE_SLUGS = new Set(["transfer-dojo", "kyu-dan-conversion"]);

export async function deleteServiceAction(id: string): Promise<{ error?: string } | void> {
    await requireAdmin();

    const svc = await prisma.service.findUnique({
        where: { id },
        select: { slug: true },
    });
    if (!svc) return { error: "Service not found." };
    if (PROTECTED_SERVICE_SLUGS.has(svc.slug)) {
        return { error: "This is a built-in service and can't be deleted. Use the Active toggle to hide it." };
    }

    // Deactivate rather than hard-delete when requests exist, to preserve history.
    const count = await prisma.serviceRequest.count({ where: { serviceId: id } });
    if (count > 0) {
        await prisma.service.update({ where: { id }, data: { isActive: false } });
    } else {
        await prisma.service.delete({ where: { id } });
    }
    revalidatePath("/portal/admin/services");
    revalidatePath("/portal/services");
    revalidatePath("/portal/transfer");
    revalidatePath("/portal/dojo/coupons");
}
