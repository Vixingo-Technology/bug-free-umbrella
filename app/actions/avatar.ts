"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

/**
 * Upload a member avatar to Cloudinary and persist the URL on the member row.
 * Returns the new public URL. The same `publicId` is reused per member so each
 * upload replaces the prior image in Cloudinary.
 */
export async function uploadAvatarAction(
    formData: FormData
): Promise<{ url?: string; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
        return { error: "Please choose an image to upload." };
    }
    if (file.size > MAX_BYTES) {
        return { error: "Image is larger than 5 MB. Please choose a smaller file." };
    }
    if (file.type && !ALLOWED.has(file.type)) {
        return { error: "Only JPG, PNG, WebP or HEIC images are accepted." };
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const dataUri = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;

        const { url } = await uploadToCloudinary(dataUri, {
            folder: CLOUDINARY_FOLDERS.avatars,
            publicId: user.id,
            resourceType: "image",
        });

        await prisma.member.update({
            where: { id: user.id },
            data: { avatarUrl: url },
        });

        revalidatePath("/portal");
        revalidatePath("/portal/profile");
        return { url };
    } catch (err: any) {
        return { error: err?.message ?? "Upload failed." };
    }
}
