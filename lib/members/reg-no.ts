import { prisma } from "@/lib/prisma";

const PREFIX = "JKA-BD-";
const MIN_SERIAL = 101;
const MAX_SERIAL = 999;

/**
 * Reg No format: JKA-BD-YYMMxxx (year, month, serial 101-999).
 * Example: JKA-BD-2607101 → registered in July 2026, serial 101.
 */
export function formatRegNo(year: number, month: number, serial: number): string {
    const yy = String(year % 100).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const nnn = String(serial).padStart(3, "0");
    return `${PREFIX}${yy}${mm}${nnn}`;
}

export function isRegNo(value: string): boolean {
    return /^JKA-BD-\d{7}$/.test(value.trim().toUpperCase());
}

/**
 * Generate the next available Reg No for the given date.
 * Scans existing user.memberNumber rows for the same YYMM cycle and
 * picks the next serial. Falls back to serial 101 when no rows exist yet.
 */
export async function generateNextRegNo(now: Date = new Date()): Promise<string> {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const yy = String(year % 100).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const cyclePrefix = `${PREFIX}${yy}${mm}`;

    const existing = await prisma.user.findMany({
        where: { memberNumber: { startsWith: cyclePrefix } },
        select: { memberNumber: true },
    });

    let maxSerial = MIN_SERIAL - 1;
    for (const u of existing) {
        const raw = u.memberNumber ?? "";
        const tail = raw.slice(cyclePrefix.length);
        const n = Number.parseInt(tail, 10);
        if (Number.isFinite(n) && n > maxSerial) maxSerial = n;
    }

    const nextSerial = Math.max(MIN_SERIAL, maxSerial + 1);
    if (nextSerial > MAX_SERIAL) {
        throw new Error(
            `Reg No range exhausted for ${cyclePrefix} (max ${MAX_SERIAL}).`,
        );
    }
    return formatRegNo(year, month, nextSerial);
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
