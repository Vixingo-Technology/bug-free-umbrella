import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use DIRECT_URL for CLI commands (db push, migrate) — bypasses pgBouncer
    // which doesn't support DDL statements required for schema changes.
    // The pooled DATABASE_URL is used at runtime by lib/prisma.ts instead.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
