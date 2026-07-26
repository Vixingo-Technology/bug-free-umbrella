import { prisma } from "@/lib/prisma";

const PREFIX = "JKA-BD-";

/**
 * Reg No format: JKA-BD-xxxxxx (6-digit sequential serial).
 * Example: JKA-BD-000001
 */
export function formatRegNo(serial: number): string {
    const xxxxxx = String(serial).padStart(6, "0");
    return `${PREFIX}${xxxxxx}`;
}

export function isRegNo(value: string): boolean {
    return /^JKA-BD-\d{6}$/.test(value.trim().toUpperCase());
}

/**
 * Generate the next available Reg No.
 * Scans existing user.memberNumber rows and picks the next serial.
 * Falls back to serial 1 when no rows exist yet.
 * Keep the `now` parameter signature for backward compatibility.
 */
export async function generateNextRegNo(now: Date = new Date()): Promise<string> {
    const existing = await prisma.user.findMany({
        where: { memberNumber: { startsWith: PREFIX } },
        select: { memberNumber: true },
    });

    let maxSerial = 0;
    for (const u of existing) {
        const raw = u.memberNumber ?? "";
        const tail = raw.slice(PREFIX.length);
        if (/^\d{6}$/.test(tail)) {
            const n = Number.parseInt(tail, 10);
            if (Number.isFinite(n) && n > maxSerial) {
                maxSerial = n;
            }
        }
    }

    const nextSerial = maxSerial + 1;
    if (nextSerial > 999999) {
        throw new Error(
            `Reg No range exhausted (max 999999).`,
        );
    }
    return formatRegNo(nextSerial);
}

/**
 * Assign a Reg No to a user if they don't already have one.
 * Works for every role (student, instructor, dojo manager/owner, admin).
 * Idempotent — returns the existing value if present.
 */
export async function ensureRegNo(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { memberNumber: true, createdAt: true },
    });
    if (!user) return null;
    if (user.memberNumber) return user.memberNumber;

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const regNo = await generateNextRegNo(user.createdAt);
            await prisma.user.update({
                where: { id: userId },
                data: { memberNumber: regNo },
            });
            return regNo;
        } catch (err: any) {
            if (err?.code !== "P2002") throw err;
        }
    }
    return null;
}
