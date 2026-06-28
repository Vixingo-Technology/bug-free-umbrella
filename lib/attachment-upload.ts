import "server-only";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import type { AttachmentType } from "@/prisma/generated/client";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — covers brochures + flyers comfortably
const IMAGE_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/avif",
]);

export type UploadedAttachment = {
    url: string;
    type: AttachmentType;
};

/**
 * Upload an optional File from a FormData entry. Returns null when no file
 * is attached (so callers can leave the attachment fields untouched).
 * Throws with a human-readable message on validation failure.
 */
export async function uploadAttachmentIfPresent(
    value: FormDataEntryValue | null,
): Promise<UploadedAttachment | null> {
    if (!(value instanceof File) || value.size === 0) return null;

    if (value.size > MAX_BYTES) {
        throw new Error("Attachment is larger than 15 MB.");
    }

    const mime = value.type;
    let resourceType: "image" | "raw";
    let attachmentType: AttachmentType;

    if (mime === "application/pdf") {
        resourceType = "raw";
        attachmentType = "PDF";
    } else if (IMAGE_MIME.has(mime)) {
        resourceType = "image";
        attachmentType = "IMAGE";
    } else {
        throw new Error("Attachment must be a PDF or an image (JPG, PNG, WebP).");
    }

    const buffer = Buffer.from(await value.arrayBuffer());
    const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;

    const { url } = await uploadToCloudinary(dataUri, {
        folder: CLOUDINARY_FOLDERS.events,
        resourceType,
    });

    return { url, type: attachmentType };
}
