import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const r = await pool.query("select order_index, name, kyu_dan, color_hex from public.belt_ranks order by order_index");
console.table(r.rows);
console.log("count:", r.rows.length);
await pool.end();
