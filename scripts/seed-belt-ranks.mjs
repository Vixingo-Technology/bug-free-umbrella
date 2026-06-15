/**
 * Seed script — populates the belt_ranks reference table.
 *
 * Usage:
 *   node scripts/seed-belt-ranks.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Pool } = pkg;

// ── Load .env.local ───────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

const envVars = {};
const raw = readFileSync(envPath, "utf-8");
for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
  envVars[key] = val;
}

const pool = new Pool({ connectionString: envVars["DIRECT_URL"] || envVars["DATABASE_URL"] });

// ── Belt ranks data ───────────────────────────────────────────────────────────
const BELT_RANKS = [
  { nameEn: "White Belt",         nameBn: "সাদা বেল্ট",      kyuDan: "10th Kyu",  colorHex: "#FFFFFF", orderIndex: 1 },
  { nameEn: "Yellow Belt",        nameBn: "হলুদ বেল্ট",     kyuDan: "9th Kyu",   colorHex: "#FFD700", orderIndex: 2 },
  { nameEn: "Orange Belt",        nameBn: "কমলা বেল্ট",     kyuDan: "8th Kyu",   colorHex: "#FF8C00", orderIndex: 3 },
  { nameEn: "Green Belt",         nameBn: "সবুজ বেল্ট",     kyuDan: "7th Kyu",   colorHex: "#228B22", orderIndex: 4 },
  { nameEn: "Blue Belt",          nameBn: "নীল বেল্ট",      kyuDan: "6th Kyu",   colorHex: "#0000CD", orderIndex: 5 },
  { nameEn: "Brown Belt",         nameBn: "বাদামি বেল্ট",   kyuDan: "3rd–5th Kyu", colorHex: "#8B4513", orderIndex: 6 },
  { nameEn: "Black Belt 1st Dan", nameBn: "কালো বেল্ট ১ম ড্যান", kyuDan: "Shodan",  colorHex: "#1a1a1a", orderIndex: 7 },
  { nameEn: "Black Belt 2nd Dan", nameBn: "কালো বেল্ট ২য় ড্যান", kyuDan: "Nidan",   colorHex: "#1a1a1a", orderIndex: 8 },
  { nameEn: "Black Belt 3rd Dan", nameBn: "কালো বেল্ট ৩য় ড্যান", kyuDan: "Sandan",  colorHex: "#1a1a1a", orderIndex: 9 },
  { nameEn: "Black Belt 4th Dan", nameBn: "কালো বেল্ট ৪র্থ ড্যান", kyuDan: "Yondan",  colorHex: "#1a1a1a", orderIndex: 10 },
  { nameEn: "Black Belt 5th Dan", nameBn: "কালো বেল্ট ৫ম ড্যান", kyuDan: "Godan",   colorHex: "#1a1a1a", orderIndex: 11 },
];

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("🥋  JKA seed — belt ranks...\n");

try {
  for (const rank of BELT_RANKS) {
    process.stdout.write(`  ${rank.nameEn} (${rank.kyuDan}) ... `);
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO belt_ranks (name_en, name_bn, kyu_dan, color_hex, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (name_en) DO UPDATE
         SET name_bn = EXCLUDED.name_bn,
             kyu_dan = EXCLUDED.kyu_dan,
             color_hex = EXCLUDED.color_hex,
             order_index = EXCLUDED.order_index,
             updated_at = EXCLUDED.updated_at`,
      [rank.nameEn, rank.nameBn, rank.kyuDan, rank.colorHex, rank.orderIndex, now, now]
    );
    console.log("✅");
  }

  console.log(`\n✅  ${BELT_RANKS.length} belt ranks seeded.\n`);
} catch (err) {
  console.error("\n❌ Error:", err.message);
} finally {
  await pool.end();
}
