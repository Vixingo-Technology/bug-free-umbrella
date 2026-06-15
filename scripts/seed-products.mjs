/**
 * Seed script — populates shop_products with karate gear for onboarding.
 *
 * Usage:
 *   node scripts/seed-products.mjs
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

const PRODUCTS = [
  {
    name: "JKA Karate Gi (Uniform)",
    description: "Official JKA Bangladesh cotton karate uniform. Available in all sizes. Includes JKA Bangladesh patch.",
    price: 3500,
    stock: 50,
    category: "gear",
    image_url: null,
  },
  {
    name: "JKA White Belt",
    description: "Standard JKA white cotton belt for beginners.",
    price: 200,
    stock: 100,
    category: "gear",
    image_url: null,
  },
  {
    name: "Karate Hand Gloves",
    description: "Foam-padded open-finger karate gloves for kumite training. WKF approved.",
    price: 850,
    stock: 40,
    category: "equipment",
    image_url: null,
  },
  {
    name: "Shin & Instep Guards",
    description: "Lightweight shin and instep protectors for safe sparring practice.",
    price: 650,
    stock: 40,
    category: "equipment",
    image_url: null,
  },
  {
    name: "JKA Bangladesh T-Shirt",
    description: "Official JKA Bangladesh branded t-shirt. 100% cotton. Available in S, M, L, XL.",
    price: 550,
    stock: 60,
    category: "apparel",
    image_url: null,
  },
  {
    name: "Karate Training Bag",
    description: "Durable nylon carry bag with JKA Bangladesh logo. Fits full gi and gear.",
    price: 1200,
    stock: 30,
    category: "apparel",
    image_url: null,
  },
  {
    name: "Mouth Guard",
    description: "Boil-and-bite mouth guard for contact sparring and competition.",
    price: 300,
    stock: 80,
    category: "equipment",
    image_url: null,
  },
  {
    name: "Foam Nunchaku (Training)",
    description: "Foam-padded nunchaku safe for beginners and weapons kata practice.",
    price: 450,
    stock: 25,
    category: "equipment",
    image_url: null,
  },
];

console.log("🛍️  JKA seed — shop products...\n");

try {
  for (const p of PRODUCTS) {
    process.stdout.write(`  ${p.name} (৳${p.price}) ... `);
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO shop_products (name, description, price, stock, category, image_url, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)
       ON CONFLICT DO NOTHING`,
      [p.name, p.description, p.price, p.stock, p.category, p.image_url, now]
    );
    console.log("✅");
  }
  console.log(`\n✅  ${PRODUCTS.length} products seeded.\n`);
} catch (err) {
  console.error("\n❌ Error:", err.message);
} finally {
  await pool.end();
}
