# Prisma Configuration — Do Not Modify

## Current Setup (Prisma 7)

The Prisma configuration was migrated to comply with **Prisma ORM v7** breaking changes. Do not alter this setup without understanding the constraints below.

### `prisma.config.ts`

- `datasource.url` uses `DIRECT_URL` (falls back to `DATABASE_URL`) via `process.env` — **not** the `env()` helper, intentionally, so `prisma generate` works in CI without a live DB connection.
- `migrate.adapter` does **not** exist in Prisma 7 — do not add it back.
- `datasource.directUrl` does **not** exist in Prisma 7 — do not add it back.

### `prisma/schema.prisma`

- The `datasource db` block must **not** have a `url` or `directUrl` field — these were removed in Prisma 7 and will cause a validation error if present.
- `previewFeatures = ["driverAdapters"]` in the generator block can be safely removed (it's now GA), but leaving it in only produces a deprecation warning, not an error.

### `lib/prisma.ts`

- The runtime `PrismaClient` is instantiated with a `PrismaPg` adapter using `DATABASE_URL` (pooled, pgBouncer). This is correct for serverless/edge runtime.
- Do **not** remove the adapter — `PrismaClient` without an adapter will fail at runtime in this project because the schema uses `driverAdapters`.

## Why Two URLs?

| Variable | URL type | Used by |
|---|---|---|
| `DATABASE_URL` | Pooled (pgBouncer, port 6543) | `lib/prisma.ts` at runtime |
| `DIRECT_URL` | Direct (port 5432) | `prisma.config.ts` for CLI commands (`db push`, `migrate`) |

pgBouncer does not support DDL statements, so all Prisma CLI commands that modify the schema **must** use `DIRECT_URL`.
