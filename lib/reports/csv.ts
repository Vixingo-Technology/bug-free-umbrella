function toCell(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "object") {
        try {
            return JSON.stringify(v);
        } catch {
            return String(v);
        }
    }
    return String(v);
}

function escapeCell(raw: string): string {
    if (/[",\n\r]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
    if (!rows.length && !columns) return "";
    const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const header = cols.map((c) => escapeCell(c)).join(",");
    const body = rows
        .map((r) => cols.map((c) => escapeCell(toCell(r[c]))).join(","))
        .join("\n");
    return `${header}\n${body}`;
}

export function csvResponse(csv: string, filename: string): Response {
    // Prepend BOM so Excel opens UTF-8 (Bangla names) correctly.
    const body = "﻿" + csv;
    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
