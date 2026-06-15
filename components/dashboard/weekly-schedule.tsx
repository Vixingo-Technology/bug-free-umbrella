"use client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

const DAY_ALIASES: Record<string, Day> = {
    monday: "Mon", mon: "Mon",
    tuesday: "Tue", tue: "Tue", tues: "Tue",
    wednesday: "Wed", wed: "Wed",
    thursday: "Thu", thu: "Thu", thur: "Thu", thurs: "Thu",
    friday: "Fri", fri: "Fri",
    saturday: "Sat", sat: "Sat",
    sunday: "Sun", sun: "Sun",
};

const DEFAULT_TIME_SLOTS = [
    "06:00", "08:00", "10:00", "12:00",
    "14:00", "16:00", "18:00", "20:00",
];

interface Entry {
    /** "HH:mm" — slot bucket the entry belongs to. */
    slot: string;
    label?: string;
    /** Full time range to show inside the cell (e.g. "18:00 – 19:30"). */
    rangeLabel?: string;
}

interface NormalizedSchedule {
    /** Map of day → entries to render in cells. */
    cells: Partial<Record<Day, Entry[]>>;
    /** Time-slot rows (ordered top→bottom). */
    timeSlots: string[];
}

/** Round any "HH:mm" to the nearest standard 2-hour slot used in the grid. */
function bucketTime(time: string): string {
    const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
    if (!m) return time;
    const hour = Number(m[1]);
    if (Number.isNaN(hour)) return time;
    // Bucket to the closest slot in DEFAULT_TIME_SLOTS by hour.
    let best = DEFAULT_TIME_SLOTS[0];
    let bestDiff = Infinity;
    for (const slot of DEFAULT_TIME_SLOTS) {
        const slotHour = Number(slot.split(":")[0]);
        const diff = Math.abs(slotHour - hour);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = slot;
        }
    }
    return best;
}

function normalizeDayKey(key: string): Day | null {
    const k = key.trim().toLowerCase();
    return DAY_ALIASES[k] ?? (DAYS.includes(k as Day) ? (k as Day) : null);
}

/**
 * Normalize a free-form `dojo.schedule` JSON into a day→entries map. Accepts:
 *   - { Mon: ["18:00-19:30"], ... }
 *   - { monday: [{ start: "18:00", end: "19:30", label: "Kihon" }], ... }
 *   - [{ day: "Tuesday", start: "18:00", end: "19:30", class: "Kata" }]
 */
function normalize(schedule: unknown): NormalizedSchedule {
    const cells: Partial<Record<Day, Entry[]>> = {};

    function push(day: Day, entry: Entry) {
        (cells[day] ??= []).push(entry);
    }

    function pushFromTimeString(day: Day, raw: string, label?: string) {
        const m = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/.exec(raw);
        if (m) {
            push(day, {
                slot: bucketTime(m[1]),
                rangeLabel: `${m[1]} – ${m[2]}`,
                label,
            });
        } else {
            push(day, { slot: bucketTime(raw), rangeLabel: raw, label });
        }
    }

    function pushFromObject(day: Day, obj: any) {
        const start = obj.start ?? obj.from ?? obj.startTime ?? obj.time;
        const end = obj.end ?? obj.to ?? obj.endTime;
        const label = obj.label ?? obj.class ?? obj.title ?? obj.name;
        if (typeof start === "string") {
            push(day, {
                slot: bucketTime(start),
                rangeLabel: end ? `${start} – ${end}` : start,
                label,
            });
        }
    }

    if (Array.isArray(schedule)) {
        for (const item of schedule) {
            if (!item || typeof item !== "object") continue;
            const day = normalizeDayKey(String((item as any).day ?? ""));
            if (!day) continue;
            pushFromObject(day, item);
        }
    } else if (schedule && typeof schedule === "object") {
        for (const [key, value] of Object.entries(schedule)) {
            const day = normalizeDayKey(key);
            if (!day) continue;
            if (Array.isArray(value)) {
                for (const v of value) {
                    if (typeof v === "string") pushFromTimeString(day, v);
                    else if (v && typeof v === "object") pushFromObject(day, v);
                }
            } else if (typeof value === "string") {
                pushFromTimeString(day, value);
            } else if (value && typeof value === "object") {
                pushFromObject(day, value);
            }
        }
    }

    return { cells, timeSlots: DEFAULT_TIME_SLOTS };
}

export default function WeeklySchedule({ schedule }: { schedule?: unknown }) {
    const { cells, timeSlots } = normalize(schedule);
    const hasAny = Object.values(cells).some((arr) => arr && arr.length > 0);

    return (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[640px] text-sm border-separate border-spacing-0">
                <thead>
                    <tr>
                        <th className="sticky left-0 z-10 bg-white text-left text-[10px] tracking-widest uppercase text-zinc-400 font-bold pb-3 pr-3 w-20">
                            Time
                        </th>
                        {DAYS.map((d) => (
                            <th
                                key={d}
                                className="text-center text-[10px] tracking-widest uppercase text-zinc-400 font-bold pb-3 px-2"
                            >
                                {d}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {timeSlots.map((slot) => (
                        <tr key={slot}>
                            <td className="sticky left-0 z-10 bg-white text-[11px] font-semibold text-zinc-500 pr-3 py-2 align-top w-20">
                                {slot}
                            </td>
                            {DAYS.map((day) => {
                                const matches = (cells[day] ?? []).filter((e) => e.slot === slot);
                                return (
                                    <td
                                        key={day + slot}
                                        className="border border-zinc-100 align-top p-1 h-14"
                                    >
                                        {matches.length === 0 ? (
                                            <span className="block w-full h-full" />
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                {matches.map((e, i) => (
                                                    <div
                                                        key={i}
                                                        className="rounded-md bg-accent-red/10 border border-accent-red/20 px-1.5 py-1"
                                                    >
                                                        <p className="text-[10px] font-bold text-accent-red leading-tight">
                                                            {e.rangeLabel ?? slot}
                                                        </p>
                                                        {e.label && (
                                                            <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight truncate">
                                                                {e.label}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {!hasAny && (
                <p className="text-center text-xs text-zinc-400 mt-3">
                    No schedule has been set for this dojo yet.
                </p>
            )}
        </div>
    );
}
