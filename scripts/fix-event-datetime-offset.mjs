/**
 * One-off migration: shift event date/time columns back by 6 hours.
 *
 * Before the datetime-local parsing fix, the admin form used `new Date(str)`
 * on server actions, which interpreted the naïve datetime-local string in
 * the *server's* local zone (UTC on Vercel / this dev env) instead of
 * Asia/Dhaka. That silently stored every event 6 hours later than the
 * admin intended (3 PM → 9 PM Dhaka).
 *
 * This script subtracts 6 hours from:
 *   - events.event_date
 *   - tournament_details.registration_deadline
 *   - tournament_details.weigh_in_date
 *
 * ⚠ NOT idempotent: running it twice will double-shift. Guarded by a
 *   `datetime_offset_fixed_at` marker row in a `_migrations_local` table
 *   that the script creates; a second run detects the marker and exits.
 *
 * Usage:
 *   node scripts/fix-event-datetime-offset.mjs           # dry-run (shows what would change)
 *   node scripts/fix-event-datetime-offset.mjs --apply   # actually run the update
 */

import "dotenv/config";
import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");
const OFFSET_HOURS = 6;
const MARKER = "event_datetime_offset_fix";

const pool = new Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const fmtDhaka = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
});

function shift(d) {
    if (!d) return null;
    return new Date(new Date(d).getTime() - OFFSET_HOURS * 60 * 60 * 1000);
}

function line(label, before, after) {
    const b = before ? fmtDhaka.format(new Date(before)) : "—";
    const a = after ? fmtDhaka.format(after) : "—";
    return `    ${label.padEnd(22)} ${b}  →  ${a}`;
}

const client = await pool.connect();
try {
    await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations_local (
            name TEXT PRIMARY KEY,
            ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    const already = await client.query(
        `SELECT ran_at FROM _migrations_local WHERE name = $1`,
        [MARKER],
    );
    if (already.rowCount > 0) {
        console.log(
            `Already applied on ${already.rows[0].ran_at.toISOString()}. Nothing to do.`,
        );
        process.exit(0);
    }

    const events = await client.query(`
        SELECT e.id, e.title, e.event_date,
               td.registration_deadline, td.weigh_in_date
        FROM events e
        LEFT JOIN tournament_details td ON td.event_id = e.id
        ORDER BY e.event_date ASC
    `);

    if (events.rowCount === 0) {
        console.log("No events found.");
        process.exit(0);
    }

    console.log(
        `${APPLY ? "APPLYING" : "DRY-RUN"} — shifting ${events.rowCount} event(s) by -${OFFSET_HOURS}h (Dhaka wall-clock preview):\n`,
    );

    for (const row of events.rows) {
        console.log(`  ${row.title}`);
        console.log(line("event_date", row.event_date, shift(row.event_date)));
        if (row.registration_deadline) {
            console.log(
                line(
                    "registration_deadline",
                    row.registration_deadline,
                    shift(row.registration_deadline),
                ),
            );
        }
        if (row.weigh_in_date) {
            console.log(
                line("weigh_in_date", row.weigh_in_date, shift(row.weigh_in_date)),
            );
        }
        console.log();
    }

    if (!APPLY) {
        console.log(
            "Dry-run only. Re-run with --apply to write these changes.",
        );
        process.exit(0);
    }

    await client.query("BEGIN");
    const shiftInterval = `${OFFSET_HOURS} hours`;
    const evUpdate = await client.query(
        `UPDATE events SET event_date = event_date - $1::interval`,
        [shiftInterval],
    );
    const tdUpdate = await client.query(
        `UPDATE tournament_details
         SET registration_deadline = registration_deadline - $1::interval,
             weigh_in_date         = weigh_in_date         - $1::interval`,
        [shiftInterval],
    );
    await client.query(
        `INSERT INTO _migrations_local (name) VALUES ($1)`,
        [MARKER],
    );
    await client.query("COMMIT");

    console.log(
        `✔ Shifted ${evUpdate.rowCount} events and ${tdUpdate.rowCount} tournament_details row(s).`,
    );
    console.log("  Marker recorded — re-running this script will now no-op.");
} catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Migration failed:", err);
    process.exit(1);
} finally {
    client.release();
    await pool.end();
}
