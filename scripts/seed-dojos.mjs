/**
 * Seed script — populates the dojos table with demo data.
 *
 * Usage:
 *   node scripts/seed-dojos.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Pool } = pkg;

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

// ── Common schedule templates (stored as JSON in dojos.schedule) ──────────
const DEFAULT_SCHEDULE = {
  monday:    "5:00 PM – 7:00 PM",
  wednesday: "5:00 PM – 7:00 PM",
  friday:    "5:00 PM – 7:00 PM",
  saturday:  "10:00 AM – 12:00 PM",
};

const WEEKEND_SCHEDULE = {
  friday:   "8:00 AM – 10:00 AM",
  saturday: "8:00 AM – 10:00 AM · 4:00 PM – 6:00 PM",
  sunday:   "4:00 PM – 6:00 PM",
};

// ── Dojos data ───────────────────────────────────────────────────────────
const DOJOS = [
  { name: "Al-Hidaayah International School Karate Club", city: "Dhaka",      address: "Al-Hidaayah International School, Mirpur DOHS, Dhaka", phone: "+880 1711-100001", email: "alhidaayah@jkabd.org", latitude: 23.8259, longitude: 90.3676, schedule: DEFAULT_SCHEDULE },
  { name: "April Gould",                                  city: "Dhaka",      address: "House 14, Road 7, Banani, Dhaka",                      phone: "+880 1711-100002", email: null,                   latitude: 23.7937, longitude: 90.4066, schedule: DEFAULT_SCHEDULE },
  { name: "Bangladesh Karate Combat Association - BKCA",  city: "Dhaka",      address: "Bangladesh Krira Shikkha Protishtan (BKSP), Savar",    phone: "+880 1711-100003", email: "bkca@jkabd.org",       latitude: 23.9189, longitude: 90.2520, schedule: WEEKEND_SCHEDULE },
  { name: "Bengal Tiger Karate Academy Bangladesh",       city: "Dhaka",      address: "Sector 7, Uttara, Dhaka",                              phone: "+880 1711-100004", email: null,                   latitude: 23.8759, longitude: 90.3795, schedule: DEFAULT_SCHEDULE },
  { name: "Black Belt Karate Academy",                    city: "Dhaka",      address: "Road 27, Block K, Banani, Dhaka",                      phone: "+880 1711-100005", email: null,                   latitude: 23.7956, longitude: 90.4045, schedule: DEFAULT_SCHEDULE },
  { name: "Champions Karate-Do",                          city: "Dhaka",      address: "Mohammadpur Town Hall area, Dhaka",                    phone: "+880 1711-100006", email: "champions@jkabd.org",  latitude: 23.7651, longitude: 90.3589, schedule: DEFAULT_SCHEDULE },
  { name: "CTG Branch",                                   city: "Chattogram", address: "GEC Circle, Khulshi, Chattogram",                      phone: "+880 1811-200001", email: "ctg@jkabd.org",        latitude: 22.3569, longitude: 91.8101, schedule: DEFAULT_SCHEDULE },
  { name: "DHA Branch",                                   city: "Dhaka",      address: "DOHS Baridhara, Dhaka Cantonment, Dhaka",              phone: "+880 1711-100007", email: "dha@jkabd.org",        latitude: 23.8104, longitude: 90.4286, schedule: DEFAULT_SCHEDULE },
  { name: "Friends Club Karate Academy",                  city: "Dhaka",      address: "Dhanmondi 32, Dhaka",                                  phone: "+880 1711-100008", email: null,                   latitude: 23.7461, longitude: 90.3742, schedule: DEFAULT_SCHEDULE },
  { name: "Golden Dragon Karate Club",                    city: "Dhaka",      address: "Bashundhara R/A Block C, Dhaka",                       phone: "+880 1711-100009", email: null,                   latitude: 23.8159, longitude: 90.4252, schedule: DEFAULT_SCHEDULE },
  { name: "Hathazari Shotokan Karate School",             city: "Chattogram", address: "Hathazari Bus Stand, Chattogram",                      phone: "+880 1811-200002", email: null,                   latitude: 22.5018, longitude: 91.7959, schedule: DEFAULT_SCHEDULE },
  { name: "JKA BD Gulshan (Gulshan Karate Dojo)",         city: "Dhaka",      address: "Gulshan-2 Circle, Dhaka",                              phone: "+880 1711-100010", email: "gulshan@jkabd.org",    latitude: 23.7925, longitude: 90.4078, schedule: DEFAULT_SCHEDULE },
  { name: "Karate School Fulki",                          city: "Chattogram", address: "Agrabad C/A, Chattogram",                              phone: "+880 1811-200003", email: null,                   latitude: 22.3300, longitude: 91.8200, schedule: DEFAULT_SCHEDULE },
  { name: "Khulshi Karate Club",                          city: "Chattogram", address: "South Khulshi, Chattogram",                            phone: "+880 1811-200004", email: null,                   latitude: 22.3636, longitude: 91.8055, schedule: DEFAULT_SCHEDULE },
  { name: "Maria Karate & Fitness Academy",               city: "Dhaka",      address: "Lalmatia Block B, Dhaka",                              phone: "+880 1711-100011", email: null,                   latitude: 23.7575, longitude: 90.3666, schedule: DEFAULT_SCHEDULE },
  { name: "NextGen Karate Club",                          city: "Dhaka",      address: "Mirpur 10, Dhaka",                                     phone: "+880 1711-100012", email: null,                   latitude: 23.8069, longitude: 90.3686, schedule: DEFAULT_SCHEDULE },
  { name: "PESC Karate Club",                             city: "Dhaka",      address: "Police Engineering Staff College Ground, Mirpur",      phone: "+880 1711-100013", email: null,                   latitude: 23.8224, longitude: 90.3540, schedule: DEFAULT_SCHEDULE },
  { name: "Saino Karate-Do Academy",                      city: "Sylhet",     address: "Zindabazar, Sylhet",                                   phone: "+880 1911-300001", email: "saino@jkabd.org",      latitude: 24.8949, longitude: 91.8687, schedule: DEFAULT_SCHEDULE },
  { name: "Sayma Karate Academy",                         city: "Dhaka",      address: "Niketan, Gulshan, Dhaka",                              phone: "+880 1711-100014", email: null,                   latitude: 23.7806, longitude: 90.4108, schedule: DEFAULT_SCHEDULE },
  { name: "Sobhan Karate Acedemy",                        city: "Dhaka",      address: "Mohakhali DOHS, Dhaka",                                phone: "+880 1711-100015", email: null,                   latitude: 23.7790, longitude: 90.4060, schedule: DEFAULT_SCHEDULE },
  { name: "Southern Karate-Do Association",               city: "Khulna",     address: "Shibbari Mor, Khulna",                                 phone: "+880 1911-400001", email: "southern@jkabd.org",   latitude: 22.8456, longitude: 89.5403, schedule: DEFAULT_SCHEDULE },
  { name: "Test Branch",                                  city: "Dhaka",      address: "JKA Bangladesh HQ, Dhaka",                             phone: "+880 1711-100016", email: null,                   latitude: 23.8103, longitude: 90.4125, schedule: DEFAULT_SCHEDULE },
  { name: "Ulla Gibson",                                  city: "Dhaka",      address: "Gulshan Avenue, Dhaka",                                phone: "+880 1711-100017", email: null,                   latitude: 23.7935, longitude: 90.4143, schedule: DEFAULT_SCHEDULE },
];

console.log("🥋  JKA seed — dojos...\n");

try {
  for (const d of DOJOS) {
    process.stdout.write(`  ${d.name} ... `);
    const now = new Date().toISOString();

    // dojos.name has no unique constraint, so do a find-then-insert/update.
    const existing = await pool.query("SELECT id FROM dojos WHERE name = $1 LIMIT 1", [d.name]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE dojos
            SET city = $1, address = $2, phone = $3, email = $4,
                latitude = $5, longitude = $6, schedule = $7::jsonb,
                is_active = true, updated_at = $8
          WHERE id = $9`,
        [d.city, d.address, d.phone, d.email, d.latitude, d.longitude, JSON.stringify(d.schedule), now, existing.rows[0].id]
      );
      console.log("🔄 updated");
    } else {
      await pool.query(
        `INSERT INTO dojos (name, city, address, phone, email, latitude, longitude, schedule, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true, $9, $9)`,
        [d.name, d.city, d.address, d.phone, d.email, d.latitude, d.longitude, JSON.stringify(d.schedule), now]
      );
      console.log("✅ inserted");
    }
  }
  console.log(`\n✅  ${DOJOS.length} dojos processed.\n`);
} catch (err) {
  console.error("\n❌ Error:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
