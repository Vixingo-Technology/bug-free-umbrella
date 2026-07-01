"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";
import {
    uploadToCloudinary,
    CLOUDINARY_FOLDERS,
} from "@/lib/cloudinary";

const annualFeeSchema = z.object({
  annualFee: z
    .number()
    .nonnegative("Annual fee cannot be negative.")
    .max(1_000_000, "Annual fee is unreasonably high.")
    .nullable(),
});

export async function saveDojoAnnualFeeAction(input: {
  annualFee: number | null;
}): Promise<{ success: true } | { error: string }> {
  const session = await requireDojoRole("DOJO_MANAGER");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  const parsed = annualFeeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await prisma.dojo.update({
      where: { id: session.dojo.id },
      data: { annualFee: parsed.data.annualFee },
    });
  } catch (e) {
    console.error("[saveDojoAnnualFee] update failed", e);
    return { error: "Could not save annual fee. Try again." };
  }

  revalidatePath("/portal/dojo/settings");
  return { success: true };
}

/**
 * Persist the dojo owner's signature image. Accepts a data-URL (image upload)
 * or null (to remove the existing signature). Returns the Cloudinary URL so
 * the client can swap its preview.
 */
export async function saveDojoSignatureAction(input: {
    dataUrl: string | null;
}): Promise<{ success: true; url: string | null } | { error: string }> {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) return { error: "Your dojo is not set up yet." };

    let nextUrl: string | null = null;

    if (input.dataUrl) {
        try {
            const uploaded = await uploadToCloudinary(input.dataUrl, {
                folder: `${CLOUDINARY_FOLDERS.certificates}/signatures`,
                publicId: `dojo-${session.dojo.id}-owner`,
                resourceType: "image",
            });
            nextUrl = uploaded.url;
        } catch (e) {
            console.error("[saveDojoSignature] upload failed", e);
            return { error: "Could not upload signature. Try again." };
        }
    }

    try {
        await prisma.dojo.update({
            where: { id: session.dojo.id },
            data: { ownerSignatureUrl: nextUrl },
        });
    } catch (e) {
        console.error("[saveDojoSignature] db update failed", e);
        return { error: "Could not save signature. Try again." };
    }

    revalidatePath("/portal/dojo/settings");
    return { success: true, url: nextUrl };
}

/**
 * Persist the dojo logo. Accepts a data-URL (PNG or SVG) or null to remove.
 * SVGs are uploaded with `format: "svg"` so Cloudinary keeps the vector
 * format instead of rasterising it.
 */
export async function saveDojoLogoAction(input: {
    dataUrl: string | null;
    mimeType: string | null;
}): Promise<{ success: true; url: string | null } | { error: string }> {
    const session = await requireDojoRole("DOJO_MANAGER");
    if (!session.dojo) return { error: "Your dojo is not set up yet." };

    let nextUrl: string | null = null;

    if (input.dataUrl) {
        const isSvg = input.mimeType === "image/svg+xml";
        const isPng = input.mimeType === "image/png";
        if (!isSvg && !isPng) {
            return { error: "Logo must be a PNG or SVG file." };
        }

        try {
            const uploaded = await uploadToCloudinary(input.dataUrl, {
                folder: `${CLOUDINARY_FOLDERS.avatars}/dojo-logos`,
                publicId: `dojo-${session.dojo.id}-logo`,
                resourceType: "image",
                ...(isSvg ? { format: "svg" } : {}),
            });
            nextUrl = uploaded.url;
        } catch (e) {
            console.error("[saveDojoLogo] upload failed", e);
            return { error: "Could not upload logo. Try again." };
        }
    }

    try {
        await prisma.dojo.update({
            where: { id: session.dojo.id },
            data: { logoUrl: nextUrl },
        });
    } catch (e) {
        console.error("[saveDojoLogo] db update failed", e);
        return { error: "Could not save logo. Try again." };
    }

    revalidatePath("/portal/dojo/settings");
    return { success: true, url: nextUrl };
}

/**
 * Create a renewal ShopOrder for this dojo and redirect to checkout.
 * Mirrors createRenewalOrderAction in app/portal/renew — the SSLCommerz
 * webhook flips paymentStatus to PAID and extends dojo.expiryDate.
 *
 * The order is recorded under the DOJO_OWNER's memberId so the existing
 * RLS-protected payment + receipt flow keeps working unchanged.
 */
export async function createDojoRenewalOrderAction(): Promise<
  { error: string } | never
> {
  const session = await requireDojoRole("DOJO_MANAGER");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  const dojoId = session.dojo.id;

  const owner = await prisma.dojoOwner.findUnique({
    where: { dojoId },
    select: { id: true },
  });
  if (!owner) {
    return {
      error:
        "Assign a Dojo Owner before renewing — the federation fee is billed to the owner.",
    };
  }

  const dojo = await prisma.dojo.findUnique({
    where: { id: dojoId },
    select: { annualFee: true, name: true },
  });
  const fee =
    dojo?.annualFee != null ? Number(dojo.annualFee) : MEMBERSHIP_FEE_BDT;

  try {
    await prisma.shopOrder.deleteMany({
      where: {
        dojoId,
        includesDojoRenewal: true,
        paymentStatus: "PENDING",
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: owner.id,
        dojoId,
        total: fee,
        membershipFee: fee,
        includesDojoRenewal: true,
        paymentStatus: "PENDING",
        notes: `Dojo renewal — ${dojo?.name ?? "Dojo"}`,
      },
    });

    redirect(`/portal/checkout?orderId=${order.id}`);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      ((err as { digest: string }).digest as string).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("[createDojoRenewalOrder] failed", err);
    return { error: "Could not start renewal. Try again." };
  }
}
