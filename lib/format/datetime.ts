// Bangladesh-first date/time formatting.
//
// Every timestamp in the DB is stored in UTC (Postgres timestamptz). Any
// server-rendered string that showed a wall-clock time used to come out in
// UTC — the Vercel runtime's local zone. Use these helpers instead of
// `Date#toLocale*` anywhere the value is a real timestamp.
//
// Default zone is Asia/Dhaka. Pass a different `zone` per call when a
// specific viewer's zone is known (e.g. later, from a users.time_zone
// column). Locale follows next-intl: "en" → "en-GB", "bn" → "bn-BD".

export const DEFAULT_TIME_ZONE = "Asia/Dhaka";

export type SupportedLocale = "en" | "bn";

type Input = Date | string | number | null | undefined;

type FormatOpts = {
    zone?: string;
    locale?: SupportedLocale | string;
};

function resolveLocale(locale: FormatOpts["locale"]): string {
    if (!locale) return "en-GB";
    if (locale === "en") return "en-GB";
    if (locale === "bn") return "bn-BD";
    return locale;
}

function toDate(input: Input): Date | null {
    if (input == null) return null;
    const d = input instanceof Date ? input : new Date(input);
    return Number.isFinite(d.getTime()) ? d : null;
}

// "12 Aug 2026"
export function formatDate(input: Input, opts: FormatOpts = {}): string {
    const d = toDate(input);
    if (!d) return "";
    return new Intl.DateTimeFormat(resolveLocale(opts.locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: opts.zone ?? DEFAULT_TIME_ZONE,
    }).format(d);
}

// "12 August 2026"
export function formatDateLong(input: Input, opts: FormatOpts = {}): string {
    const d = toDate(input);
    if (!d) return "";
    return new Intl.DateTimeFormat(resolveLocale(opts.locale), {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: opts.zone ?? DEFAULT_TIME_ZONE,
    }).format(d);
}

// "12/08/2026"
export function formatDateShort(input: Input, opts: FormatOpts = {}): string {
    const d = toDate(input);
    if (!d) return "";
    return new Intl.DateTimeFormat(resolveLocale(opts.locale), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: opts.zone ?? DEFAULT_TIME_ZONE,
    }).format(d);
}

// "14:30"
export function formatTime(input: Input, opts: FormatOpts = {}): string {
    const d = toDate(input);
    if (!d) return "";
    return new Intl.DateTimeFormat(resolveLocale(opts.locale), {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: opts.zone ?? DEFAULT_TIME_ZONE,
    }).format(d);
}

// "12 Aug 2026, 14:30"
export function formatDateTime(input: Input, opts: FormatOpts = {}): string {
    const d = toDate(input);
    if (!d) return "";
    return new Intl.DateTimeFormat(resolveLocale(opts.locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: opts.zone ?? DEFAULT_TIME_ZONE,
    }).format(d);
}

// Numeric parts (e.g. day-of-month for calendar tiles) that need to reflect
// the same Dhaka wall-clock day the rest of the UI shows.
export function getDatePart(
    input: Input,
    part: "day" | "month" | "year" | "monthShort" | "monthLong" | "weekdayShort",
    opts: FormatOpts = {}
): string {
    const d = toDate(input);
    if (!d) return "";
    const zone = opts.zone ?? DEFAULT_TIME_ZONE;
    const locale = resolveLocale(opts.locale);
    switch (part) {
        case "day":
            return new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: zone }).format(d);
        case "month":
            return new Intl.DateTimeFormat(locale, { month: "2-digit", timeZone: zone }).format(d);
        case "year":
            return new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: zone }).format(d);
        case "monthShort":
            return new Intl.DateTimeFormat(locale, { month: "short", timeZone: zone }).format(d);
        case "monthLong":
            return new Intl.DateTimeFormat(locale, { month: "long", timeZone: zone }).format(d);
        case "weekdayShort":
            return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: zone }).format(d);
    }
}

// "yyyy-mm-dd" for HTML <input type="date"> defaults. Uses the target zone
// so the picker shows the same date the user reads elsewhere.
export function toDateInputValue(input: Input, opts: FormatOpts = {}): string {
    const d = toDate(input);
    if (!d) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: opts.zone ?? DEFAULT_TIME_ZONE,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}

// The offset (in ms) between the given instant's UTC time and the wall-clock
// time in the target zone. Positive for zones ahead of UTC (Asia/Dhaka → +6h).
function getZoneOffsetMs(date: Date, zone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
    const hour = Number(get("hour")) % 24;
    return (
        Date.UTC(
            Number(get("year")),
            Number(get("month")) - 1,
            Number(get("day")),
            hour,
            Number(get("minute")),
            Number(get("second")),
        ) - date.getTime()
    );
}

// "yyyy-mm-ddThh:mm" for HTML <input type="datetime-local"> defaults, shown
// in the target zone so the picker matches what the viewer reads elsewhere.
export function toDateTimeInputValue(input: Input, opts: FormatOpts = {}): string {
    const d = toDate(input);
    if (!d) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: opts.zone ?? DEFAULT_TIME_ZONE,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    // Some ICU builds emit "24" for midnight in hour12:false; normalise.
    const hour = get("hour") === "24" ? "00" : get("hour");
    return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

// Parse an <input type="datetime-local"> value ("yyyy-mm-ddThh:mm[:ss]") as
// wall-clock time in the target zone, returning the correct UTC Date. Without
// this, `new Date(str)` interprets the string in the server's local zone —
// which is UTC on Vercel — silently shifting Dhaka events by 6 hours.
export function parseDateTimeInput(
    str: string | null | undefined,
    opts: FormatOpts = {},
): Date | null {
    if (!str) return null;
    // Accept "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS".
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
        str.trim(),
    );
    if (!match) return null;
    const [, y, mo, d, h, mi, s] = match;
    // Anchor at UTC first — the wall-clock parts become UTC parts — then
    // subtract the zone's offset at that instant to recover the real UTC time.
    const asUtc = new Date(
        Date.UTC(
            Number(y),
            Number(mo) - 1,
            Number(d),
            Number(h),
            Number(mi),
            s ? Number(s) : 0,
        ),
    );
    if (!Number.isFinite(asUtc.getTime())) return null;
    const offsetMs = getZoneOffsetMs(asUtc, opts.zone ?? DEFAULT_TIME_ZONE);
    return new Date(asUtc.getTime() - offsetMs);
}
