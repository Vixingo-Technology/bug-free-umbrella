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
  { name: "White Belt", kyuDan: "10th Kyu", colorHex: "#FFFFFF", orderIndex: 0 },
  { name: "Stripe Yellow Belt", kyuDan: "9th Kyu", colorHex: "#FFD700", orderIndex: 1 },
  { name: "Yellow Belt", kyuDan: "8th Kyu", colorHex: "#FFD700", orderIndex: 2 },
  { name: "Orange Belt", kyuDan: "7th Kyu", colorHex: "#FF8C00", orderIndex: 3 },
  { name: "Green Belt", kyuDan: "6th Kyu", colorHex: "#228B22", orderIndex: 4 },
  { name: "Blue Belt", kyuDan: "5th Kyu", colorHex: "#0000CD", orderIndex: 5 },
  { name: "Purple Belt", kyuDan: "4th Kyu", colorHex: "#7C3AED", orderIndex: 6 },
  { name: "Brown Belt 3rd Kyu", kyuDan: "3rd Kyu", colorHex: "#8B4513", orderIndex: 7 },
  { name: "Brown Belt 2nd Kyu", kyuDan: "2nd Kyu", colorHex: "#8B4513", orderIndex: 8 },
  { name: "Brown Belt 1st Kyu", kyuDan: "1st Kyu", colorHex: "#8B4513", orderIndex: 9 },
  { name: "Black Belt 1st Dan", kyuDan: "Shodan", colorHex: "#1a1a1a", orderIndex: 10 },
];

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("🥋  JKA seed — belt ranks...\n");

try {
  for (const rank of BELT_RANKS) {
    process.stdout.write(`  ${rank.name} (${rank.kyuDan}) ... `);
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO belt_ranks (name, kyu_dan, color_hex, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name) DO UPDATE
         SET kyu_dan = EXCLUDED.kyu_dan,
             color_hex = EXCLUDED.color_hex,
             order_index = EXCLUDED.order_index,
             updated_at = EXCLUDED.updated_at`,
      [rank.name, rank.kyuDan, rank.colorHex, rank.orderIndex, now, now]
    );
    console.log("✅");
  }

  console.log(`\n✅  ${BELT_RANKS.length} belt ranks seeded.\n`);
} catch (err) {
  console.error("\n❌ Error:", err.message);
} finally {
  await pool.end();
}
