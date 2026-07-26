/**
 * Backfill JKA-BD-xxxxxx Reg Numbers on all users (any role).
 *
 * Reg No format: JKA-BD-xxxxxx
 *   xxxxxx — 6-digit sequential serial, starting at 000001
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

function fmt(serial) {
    const xxxxxx = String(serial).padStart(6, "0");
    return `${PREFIX}${xxxxxx}`;
}

const pool = new Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

let maxSerial = 0;

const existing = await pool.query(`
    select member_number
      from public.users
     where member_number ~ '^JKA-BD-[0-9]{6}$'
`);
for (const r of existing.rows) {
    const s = r.member_number;
    const serial = Number.parseInt(s.slice(PREFIX.length), 10);
    if (!Number.isFinite(serial)) continue;
    if (serial > maxSerial) maxSerial = serial;
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
    const nextSerial = maxSerial + 1;
    if (nextSerial > 999999) {
        console.warn(`Range exhausted, skipping ${row.id}`);
        continue;
    }
    const regNo = fmt(nextSerial);

    await pool.query(
        `update public.users set member_number = $1 where id = $2`,
        [regNo, row.id],
    );
    maxSerial = nextSerial;
    assigned += 1;
    console.log(`  ${row.id} → ${regNo}`);
}

console.log(`Assigned ${assigned} reg numbers.`);
await pool.end();
