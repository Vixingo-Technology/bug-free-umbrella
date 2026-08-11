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
