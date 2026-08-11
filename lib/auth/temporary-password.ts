import { randomBytes } from "node:crypto";

/**
 * URL-safe 12-char temporary password (base64url-ish alphabet, no ambiguous
 * chars like 0/O/1/l/I). The receiving user is forced to replace it on next
 * login via the `mustChangePassword` flag.
 */
export function generateTemporaryPassword(): string {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const bytes = randomBytes(12);
    let out = "";
    for (let i = 0; i < 12; i++) {
        out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
}
