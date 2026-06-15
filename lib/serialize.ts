/**
 * Recursively converts Prisma `Decimal` instances into plain `number` values
 * so the payload can cross the Server → Client Component boundary.
 *
 * Next.js can only ship plain objects, primitives, Date, and a handful of
 * other built-ins from a Server Component as props. Anything else (e.g. a
 * `Decimal` from `@prisma/client/runtime/library`) blows up at render-time:
 *
 *   Only plain objects can be passed to Client Components from Server
 *   Components. Decimal objects are not supported.
 *
 * Use this helper as the last step before handing query results to a Client
 * Component.
 */

function isDecimalLike(v: unknown): v is { toNumber: () => number; toString: () => string } {
    if (v === null || typeof v !== "object") return false;
    const obj = v as { toNumber?: unknown; toFixed?: unknown };
    return typeof obj.toNumber === "function" && typeof obj.toFixed === "function";
}

export function serialize<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(serialize) as unknown as T;
    if (value instanceof Date) return value;
    if (isDecimalLike(value)) return Number(value.toString()) as unknown as T;
    if (typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(value as Record<string, unknown>)) {
            out[k] = serialize((value as Record<string, unknown>)[k]);
        }
        return out as T;
    }
    return value;
}
