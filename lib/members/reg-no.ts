import { prisma } from "@/lib/prisma";

const PREFIX = "JKA-BD-";

/**
 * Bangladesh division → 3-letter code used in the dojo-owner Reg No.
 * Case-insensitive lookup on the division name stored in Dojo.city /
 * DojoApplication.address.
 */
export const DIVISION_CODES: Record<string, string> = {
    barishal: "BAR",
    barisal: "BAR",
    chattogram: "CTG",
    chittagong: "CTG",
    dhaka: "DHA",
    khulna: "KHL",
    mymensingh: "MYM",
    rajshahi: "RAJ",
    rangpur: "RAN",
    sylhet: "SYL",
};

export function divisionCode(division: string | null | undefined): string | null {
    if (!division) return null;
    return DIVISION_CODES[division.trim().toLowerCase()] ?? null;
}

/**
 * Reg No format: JKA-BD-xxxxxx (6-digit sequential serial).
 * Example: JKA-BD-000001
 */
export function formatRegNo(serial: number): string {
    const xxxxxx = String(serial).padStart(6, "0");
    return `${PREFIX}${xxxxxx}`;
}

/**
 * Dojo-owner Reg No format: JKA-BD-XYZ-NNNN
 * where XYZ is the division code and NNNN is a 4-digit serial (0001–9999).
 * Example: JKA-BD-DHA-0001
 */
export function formatDojoOwnerRegNo(code: string, serial: number): string {
    const nnnn = String(serial).padStart(4, "0");
    return `${PREFIX}${code}-${nnnn}`;
}

/**
 * Admin Reg No format: JKA-BD-ADMIN-NNN
 * where NNN is a 3-digit serial (001–999).
 * Example: JKA-BD-ADMIN-001
 */
const ADMIN_PREFIX = `${PREFIX}ADMIN-`;

export function formatAdminRegNo(serial: number): string {
    const nnn = String(serial).padStart(3, "0");
    return `${ADMIN_PREFIX}${nnn}`;
}

export function isRegNo(value: string): boolean {
    return /^JKA-BD-\d{6}$/.test(value.trim().toUpperCase());
}

export function isDojoOwnerRegNo(value: string): boolean {
    return /^JKA-BD-[A-Z]{3}-\d{4}$/.test(value.trim().toUpperCase());
}

export function isAdminRegNo(value: string): boolean {
    return /^JKA-BD-ADMIN-\d{3}$/.test(value.trim().toUpperCase());
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
 * Generate the next available dojo-owner Reg No for a given division code.
 * Scans existing user.memberNumber rows matching JKA-BD-{code}-xxxx and
 * picks the next serial. Serial range is 0001–9999.
 */
export async function generateNextDojoOwnerRegNo(code: string): Promise<string> {
    const scoped = `${PREFIX}${code}-`;
    const existing = await prisma.user.findMany({
        where: { memberNumber: { startsWith: scoped } },
        select: { memberNumber: true },
    });

    let maxSerial = 0;
    for (const u of existing) {
        const raw = u.memberNumber ?? "";
        const tail = raw.slice(scoped.length);
        if (/^\d{4}$/.test(tail)) {
            const n = Number.parseInt(tail, 10);
            if (Number.isFinite(n) && n > maxSerial) {
                maxSerial = n;
            }
        }
    }

    const nextSerial = maxSerial + 1;
    if (nextSerial > 9999) {
        throw new Error(
            `Dojo-owner Reg No range exhausted for division ${code} (max 9999).`,
        );
    }
    return formatDojoOwnerRegNo(code, nextSerial);
}

/**
 * Generate the next available admin Reg No.
 * Scans existing user.memberNumber rows matching JKA-BD-ADMIN-NNN and
 * picks the next serial. Serial range is 001–999.
 */
export async function generateNextAdminRegNo(): Promise<string> {
    const existing = await prisma.user.findMany({
        where: { memberNumber: { startsWith: ADMIN_PREFIX } },
        select: { memberNumber: true },
    });

    let maxSerial = 0;
    for (const u of existing) {
        const raw = u.memberNumber ?? "";
        const tail = raw.slice(ADMIN_PREFIX.length);
        if (/^\d{3}$/.test(tail)) {
            const n = Number.parseInt(tail, 10);
            if (Number.isFinite(n) && n > maxSerial) {
                maxSerial = n;
            }
        }
    }

    const nextSerial = maxSerial + 1;
    if (nextSerial > 999) {
        throw new Error(`Admin Reg No range exhausted (max 999).`);
    }
    return formatAdminRegNo(nextSerial);
}

/**
 * Assign an admin Reg No (JKA-BD-ADMIN-NNN) to an admin user.
 * Overwrites any prior non-admin reg no so admins always carry the admin
 * format. Idempotent when the current value already matches.
 */
export async function ensureAdminRegNo(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { memberNumber: true },
    });
    if (!user) return null;

    if (user.memberNumber?.startsWith(ADMIN_PREFIX)) {
        return user.memberNumber;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const regNo = await generateNextAdminRegNo();
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

/**
 * Assign a division-scoped Reg No (JKA-BD-XYZ-NNNN) to a dojo owner.
 * Overwrites any prior generic reg no on the users row so a dojo owner
 * always carries the division-scoped format once enlistment is committed.
 * Idempotent when the current value already matches the division.
 */
export async function ensureDojoOwnerRegNo(
    userId: string,
    division: string,
): Promise<string | null> {
    const code = divisionCode(division);
    if (!code) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { memberNumber: true },
    });
    if (!user) return null;

    const scoped = `${PREFIX}${code}-`;
    if (user.memberNumber?.startsWith(scoped)) {
        return user.memberNumber;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const regNo = await generateNextDojoOwnerRegNo(code);
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
