import "server-only";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import type { AttachmentType } from "@/prisma/generated/client";

const MAX_PROFILE_BYTES = 5 * 1024 * 1024; // 5 MB — plenty for a headshot

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — covers full-res event posters
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
 *
 * `imagesOnly` restricts the accepted types to images (used by the event
 * form, which shows the attachment as a poster above the description).
 */
export async function uploadAttachmentIfPresent(
    value: FormDataEntryValue | null,
    options: { imagesOnly?: boolean } = {},
): Promise<UploadedAttachment | null> {
    if (!(value instanceof File) || value.size === 0) return null;

    if (value.size > MAX_BYTES) {
        throw new Error("Attachment is larger than 15 MB.");
    }

    const mime = value.type;
    let resourceType: "image" | "raw";
    let attachmentType: AttachmentType;

    if (mime === "application/pdf") {
        if (options.imagesOnly) {
            throw new Error("Attachment must be an image (JPG, PNG, WebP).");
        }
        resourceType = "raw";
        attachmentType = "PDF";
    } else if (IMAGE_MIME.has(mime)) {
        resourceType = "image";
        attachmentType = "IMAGE";
    } else {
        throw new Error(
            options.imagesOnly
                ? "Attachment must be an image (JPG, PNG, WebP)."
                : "Attachment must be a PDF or an image (JPG, PNG, WebP).",
        );
    }

    const buffer = Buffer.from(await value.arrayBuffer());
    const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;

    const { url } = await uploadToCloudinary(dataUri, {
        folder: CLOUDINARY_FOLDERS.events,
        resourceType,
    });

    return { url, type: attachmentType };
}

/**
 * Upload an optional image-only File — used for participant profile photos
 * on event registrations. Returns just the URL (no attachment type needed).
 */
export async function uploadImageIfPresent(
    value: FormDataEntryValue | null,
): Promise<string | null> {
    if (!(value instanceof File) || value.size === 0) return null;

    if (value.size > MAX_PROFILE_BYTES) {
        throw new Error("Profile image must be 5 MB or smaller.");
    }
    if (!IMAGE_MIME.has(value.type)) {
        throw new Error("Profile image must be a JPG, PNG, or WebP.");
    }

    const buffer = Buffer.from(await value.arrayBuffer());
    const dataUri = `data:${value.type};base64,${buffer.toString("base64")}`;
    const { url } = await uploadToCloudinary(dataUri, {
        folder: CLOUDINARY_FOLDERS.avatars,
        resourceType: "image",
    });
    return url;
}
