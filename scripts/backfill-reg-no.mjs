/**
 * Backfill JKA-BD-YYMMxxx Reg Numbers on all users (any role).
 *
 * Reg No format: JKA-BD-YYMMxxx
 *   YY  — last two digits of the join year
 *   MM  — 2-digit month of joining
 *   xxx — sequential serial per YYMM cycle, starting at 101
 *
 * Existing user.member_number values are preserved. Only rows with
 * a NULL / empty value are filled. Ordering is stable (by createdAt asc)
 * so re-runs are idempotent.
 *
 * Usage:  node scripts/backfill-reg-no.mjs
 */

import "dotenv/config";
import { Pool } from "pg";

const PREFIX = "JKA-BD-";
const MIN_SERIAL = 101;
const MAX_SERIAL = 999;

function fmt(year, month, serial) {
    const yy = String(year % 100).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const nnn = String(serial).padStart(3, "0");
    return `${PREFIX}${yy}${mm}${nnn}`;
}

const pool = new Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const cycleMax = new Map();

const existing = await pool.query(`
    select member_number
      from public.users
     where member_number ~ '^JKA-BD-[0-9]{7}$'
`);
for (const r of existing.rows) {
    const s = r.member_number;
    const cycle = s.slice(PREFIX.length, PREFIX.length + 4);
    const serial = Number.parseInt(s.slice(PREFIX.length + 4), 10);
    if (!Number.isFinite(serial)) continue;
    const cur = cycleMax.get(cycle) ?? MIN_SERIAL - 1;
    if (serial > cur) cycleMax.set(cycle, serial);
}

// Users missing a reg no, oldest-first (student join_date takes precedence
// when available; otherwise the user's created_at).
const missing = await pool.query(`
    select u.id,
           coalesce(s.join_date, u.created_at) as ts
      from public.users u
 left join public.students s on s.id = u.id
     where u.member_number is null or u.member_number = ''
     order by coalesce(s.join_date, u.created_at) asc, u.id asc
`);

console.log(`Missing reg-no rows: ${missing.rows.length}`);
let assigned = 0;

for (const row of missing.rows) {
    const ts = new Date(row.ts);
    const year = ts.getFullYear();
    const month = ts.getMonth() + 1;
    const yy = String(year % 100).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const cycle = `${yy}${mm}`;

    const cur = cycleMax.get(cycle) ?? MIN_SERIAL - 1;
    const nextSerial = Math.max(MIN_SERIAL, cur + 1);
    if (nextSerial > MAX_SERIAL) {
        console.warn(`Cycle ${cycle} exhausted, skipping ${row.id}`);
        continue;
    }
    const regNo = fmt(year, month, nextSerial);

    await pool.query(
        `update public.users set member_number = $1 where id = $2`,
        [regNo, row.id],
    );
    cycleMax.set(cycle, nextSerial);
    assigned += 1;
    console.log(`  ${row.id} → ${regNo}`);
}

console.log(`Assigned ${assigned} reg numbers.`);
await pool.end();
