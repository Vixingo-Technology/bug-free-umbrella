/**
 * Seed script — creates one user of every role for local testing.
 *
 * Strategy: pre-insert the members row, then create the auth user.
 * The trigger's ON CONFLICT (id) DO NOTHING means the pre-inserted row
 * is preserved even if the trigger also fires.
 *
 * Usage:
 *   node scripts/seed-users.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local manually ─────────────────────────────────────────────────
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

const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Seed data ─────────────────────────────────────────────────────────────────
const USERS = [
  {
    email: "student@jka.test",
    password: "Password123!",
    fullName: "Sakura Student",
    role: "STUDENT",
    currentRank: "Yellow Belt",
    memberNumber: "JKA-S001",
  },
  {
    email: "instructor@jka.test",
    password: "Password123!",
    fullName: "Kenji Instructor",
    role: "INSTRUCTOR",
    currentRank: "Black Belt 2nd Dan",
    memberNumber: "JKA-I001",
  },
  {
    email: "admin@jka.test",
    password: "Password123!",
    fullName: "Hanshi Admin",
    role: "ADMIN",
    currentRank: "Black Belt 5th Dan",
    memberNumber: "JKA-A001",
  },
];

// ── Helper: get existing auth user by email ───────────────────────────────────
async function findAuthUser(email) {
  const { data } = await supabase.auth.admin.listUsers();
  return data?.users?.find((u) => u.email === email) ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("🥋  JKA seed — creating test users...\n");

for (const userData of USERS) {
  process.stdout.write(`  [${userData.role}] ${userData.email} ... `);

  try {
    // 1. Check if auth user already exists
    let authUser = await findAuthUser(userData.email);

    if (!authUser) {
      // 2. Create a placeholder UUID so we can pre-insert the member row
      //    before the auth user (avoids trigger failure on missing FK data)
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.fullName,
            role: userData.role,
            current_rank: userData.currentRank,
          },
        });

      if (authError) {
        // Trigger fired and failed — the user wasn't created.
        // Re-check in case it was partially created.
        authUser = await findAuthUser(userData.email);
        if (!authUser) {
          throw new Error(`Auth create failed: ${authError.message}`);
        }
      } else {
        authUser = authData.user;
      }
    } else {
      process.stdout.write("(auth exists) ");
    }

    // 3. Upsert the member row with full data
    const { error: memberError } = await supabase.from("members").upsert(
      {
        id: authUser.id,
        full_name: userData.fullName,
        email: userData.email,
        role: userData.role,
        current_rank: userData.currentRank,
        member_number: userData.memberNumber,
      },
      { onConflict: "id" }
    );

    if (memberError) throw new Error(`Member upsert failed: ${memberError.message}`);

    console.log("✅");
  } catch (err) {
    console.log("❌");
    console.error(`     ${err.message}`);
  }
}

console.log(`
─────────────────────────────────────────────
  Login credentials  (password: Password123!)
─────────────────────────────────────────────
  STUDENT    →  student@jka.test
  INSTRUCTOR →  instructor@jka.test
  ADMIN      →  admin@jka.test
─────────────────────────────────────────────
`);
