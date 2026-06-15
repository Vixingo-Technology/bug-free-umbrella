/**
 * Seed script — creates test users in Supabase Auth + members table.
 *
 * Creates:
 *   student@jka.test    / Password123!  (STUDENT, White Belt)
 *   instructor@jka.test / Password123!  (INSTRUCTOR, Black Belt 1st Dan)
 *   admin@jka.test      / Password123!  (ADMIN, Black Belt 3rd Dan)
 *
 * Usage:
 *   node scripts/seed-users.mjs
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY  (admin API — never expose to browser)
 *   - DIRECT_URL or DATABASE_URL (for direct Postgres inserts)
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
try {
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
} catch {
  // Fallback to process.env if .env.local not present
}

const SUPABASE_URL  = envVars["NEXT_PUBLIC_SUPABASE_URL"]  || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = envVars["SUPABASE_SERVICE_ROLE_KEY"] || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL        = envVars["DIRECT_URL"] || envVars["DATABASE_URL"]
                   || process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const pool = new Pool({ connectionString: DB_URL });

const TEST_USERS = [
  {
    email: "student@jka.test",
    password: "Password123!",
    meta: { full_name: "Test Student", role: "STUDENT", current_rank: "White Belt" },
    member: { role: "STUDENT", currentRank: "White Belt", onboardingComplete: true, membershipStatus: "ACTIVE" },
  },
  {
    email: "instructor@jka.test",
    password: "Password123!",
    meta: { full_name: "Test Instructor", role: "INSTRUCTOR", current_rank: "Black Belt 1st Dan" },
    member: { role: "INSTRUCTOR", currentRank: "Black Belt 1st Dan", onboardingComplete: true, membershipStatus: "ACTIVE" },
  },
  {
    email: "admin@jka.test",
    password: "Password123!",
    meta: { full_name: "Test Admin", role: "ADMIN", current_rank: "Black Belt 3rd Dan" },
    member: { role: "ADMIN", currentRank: "Black Belt 3rd Dan", onboardingComplete: true, membershipStatus: "ACTIVE" },
  },
];

// ── Supabase Admin API helpers ────────────────────────────────────────────────

async function supabaseAdminRequest(path, method = "GET", body = null) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: body ? JSON.stringify(body) : null,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

async function createOrGetUser(email, password, meta) {
  // Try to create; if email already exists, look it up
  try {
    const user = await supabaseAdminRequest("/users", "POST", {
      email,
      password,
      email_confirm: true, // skip email confirmation for test users
      user_metadata: meta,
    });
    return user;
  } catch (err) {
    if (err.message?.includes("already been registered") || err.message?.includes("already exists")) {
      // Fetch existing user by email
      const { users } = await supabaseAdminRequest(`/users?email=${encodeURIComponent(email)}`);
      return users?.[0];
    }
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("🥋  JKA seed — test users...\n");

const expiry = new Date();
expiry.setFullYear(expiry.getFullYear() + 1);
const now = new Date().toISOString();

try {
  for (const u of TEST_USERS) {
    process.stdout.write(`  ${u.email} ... `);

    const authUser = await createOrGetUser(u.email, u.password, u.meta);
    if (!authUser?.id) throw new Error("Failed to get user ID");

    const userId = authUser.id;

    // Upsert into members table
    await pool.query(
      `INSERT INTO members (
        id, full_name, email, role, current_rank,
        onboarding_complete, membership_status,
        expiry_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            current_rank = EXCLUDED.current_rank,
            onboarding_complete = EXCLUDED.onboarding_complete,
            membership_status = EXCLUDED.membership_status,
            expiry_date = EXCLUDED.expiry_date,
            updated_at = EXCLUDED.updated_at`,
      [
        userId,
        u.meta.full_name,
        u.email,
        u.member.role,
        u.member.currentRank,
        u.member.onboardingComplete,
        u.member.membershipStatus,
        expiry.toISOString(),
        now,
        now,
      ]
    );

    console.log(`✅  (id: ${userId})`);
  }

  console.log(`\n✅  ${TEST_USERS.length} test users seeded.\n`);
  console.log("Credentials:");
  for (const u of TEST_USERS) {
    console.log(`  ${u.email.padEnd(28)} Password123!  [${u.member.role}]`);
  }
  console.log();
} catch (err) {
  console.error("\n❌ Error:", err.message);
} finally {
  await pool.end();
}
