import { PrismaClient } from "./prisma/generated/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
config({ path: "./.env.local" });

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const [enumType] = await prisma.$queryRawUnsafe(
  `SELECT array_agg(enumlabel ORDER BY enumsortorder) AS labels
   FROM pg_enum
   WHERE enumtypid = 'public."ActivitySeverity"'::regtype`
);
const [colType] = await prisma.$queryRawUnsafe(
  `SELECT udt_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='activity_logs' AND column_name='severity'`
);
const count = await prisma.activityLog.count();
console.log(JSON.stringify({
  enum_labels: enumType?.labels,
  severity_column_type: colType?.udt_name,
  rows: count,
}, null, 2));
await prisma.$disconnect();
