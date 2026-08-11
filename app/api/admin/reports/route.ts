import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { generateReport } from "@/lib/reports/generate";
import { toCsv, csvResponse } from "@/lib/reports/csv";
import { REPORT_DEFINITIONS, type ReportKey } from "@/lib/reports/report-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPORT_KEYS = new Set(REPORT_DEFINITIONS.map((r) => r.key));

function parseDate(v: string | null, endOfDay = false): Date | undefined {
    if (!v) return undefined;
    const d = new Date(v);
    if (isNaN(d.getTime())) return undefined;
    if (endOfDay) d.setHours(23, 59, 59, 999);
    return d;
}

export async function GET(req: NextRequest) {
    await requireAdmin();

    const url = new URL(req.url);
    const report = url.searchParams.get("report") ?? "";

    if (!REPORT_KEYS.has(report as ReportKey)) {
        return new Response("Unknown report type", { status: 400 });
    }

    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"), true);
    const dojoId = url.searchParams.get("dojoId") ?? undefined;
    const userId = url.searchParams.get("userId") ?? undefined;
    const eventId = url.searchParams.get("eventId") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;

    const rows = await generateReport(report as ReportKey, { from, to, dojoId, userId, eventId, category });
    const csv = toCsv(rows);

    const stamp = new Date().toISOString().slice(0, 10);
    const parts = [
        report,
        eventId ? `event-${eventId.slice(0, 8)}` : null,
        dojoId ? `dojo-${dojoId.slice(0, 8)}` : null,
        userId ? `user-${userId.slice(0, 8)}` : null,
        category ? `cat-${category.replace(/[^a-z0-9]+/gi, "-").slice(0, 20)}` : null,
        from ? `from-${url.searchParams.get("from")}` : null,
        to ? `to-${url.searchParams.get("to")}` : null,
        `generated-${stamp}`,
    ].filter(Boolean);
    const filename = `${parts.join("_")}.csv`;

    return csvResponse(csv, filename);
}
