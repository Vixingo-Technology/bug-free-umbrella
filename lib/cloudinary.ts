/**
 * Cloudinary Upload Helper
 *
 * All media (avatars, certificates, event images) is stored on Cloudinary.
 * Never store files in the repo or Next.js public folder.
 *
 * Uses the unsigned upload preset for client-side uploads (avatars),
 * and the signed API for server-side uploads (certificates, PDFs).
 */

/** Upload a file buffer or base64 string to Cloudinary (server-side). */
export async function uploadToCloudinary(
    file: Buffer | string,
    options: {
        folder: string;
        publicId?: string;
        resourceType?: "image" | "video" | "raw" | "auto";
        format?: string;
    }
): Promise<{ url: string; publicId: string }> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Cloudinary environment variables are not configured.");
    }

    const resourceType = options.resourceType ?? "auto";
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    // Convert buffer to base64 data URI if needed
    const fileData =
        typeof file === "string"
            ? file
            : `data:application/octet-stream;base64,${file.toString("base64")}`;

    // Build form data
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign: Record<string, string> = {
        folder: options.folder,
        timestamp,
        ...(options.publicId ? { public_id: options.publicId } : {}),
        ...(options.format ? { format: options.format } : {}),
    };

    // Generate SHA-1 signature
    const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

    const formData = new FormData();
    formData.append("file", fileData);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", options.folder);
    if (options.publicId) formData.append("public_id", options.publicId);
    if (options.format) formData.append("format", options.format);

    const res = await fetch(uploadUrl, { method: "POST", body: formData });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Cloudinary upload failed: ${err.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return { url: data.secure_url, publicId: data.public_id };
}

/** Upload from a URL (e.g. re-host an external avatar). */
export async function uploadUrlToCloudinary(
    sourceUrl: string,
    options: { folder: string; publicId?: string }
): Promise<{ url: string; publicId: string }> {
    return uploadToCloudinary(sourceUrl, options);
}

/** Generate Cloudinary API signature using Web Crypto (Edge-compatible). */
async function generateCloudinarySignature(
    params: Record<string, string>,
    secret: string
): Promise<string> {
    // Sort params alphabetically and concatenate as key=value pairs
    const str =
        Object.keys(params)
            .sort()
            .map((k) => `${k}=${params[k]}`)
            .join("&") + secret;

    // SHA-1 via Web Crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cloudinary folder constants — keeps paths consistent across the app. */
export const CLOUDINARY_FOLDERS = {
    avatars: "jka/avatars",
    certificates: "jka/certificates",
    events: "jka/events",
    products: "jka/products",
} as const;
