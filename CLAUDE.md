# JKA Bangladesh — Project Guide

Production-grade membership management platform for JKA Bangladesh (~700 members). Combines a cinematic public website, a secure member portal, an admin back-office, and an automated background workflow engine.

Live domain target: **jkabangladesh.com**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| i18n | next-intl — English (`en`) + Bangla (`bn`) |
| Auth | Supabase Auth (email + phone OTP) |
| Database | Supabase PostgreSQL via Prisma ORM |
| ORM | Prisma 7 |
| 3D / WebGL | Three.js + @react-three/fiber + @react-three/drei |
| Animation | Motion (Framer Motion v12) |
| CMS | Payload CMS (connected to Supabase Postgres) |
| Media | Cloudinary (images, videos, PDF certificates) |
| Payments | SSLCommerz, bKash, Nagad (local) · Stripe (international) |
| Automation | n8n on Hetzner VPS |
| AI | Google Gemini (`@google/genai`) |
| PDF / QR | Puppeteer + QR code lib (certificate generation) |
| Forms | react-hook-form + @hookform/resolvers + zod |
| Icons | lucide-react |
| Deployment | Vercel (frontend) · Hetzner VPS (n8n automation) |

---

## Key Folders

```
app/                    Next.js App Router pages and API routes
  [locale]/             All public and portal pages, locale-prefixed (en/bn)
    dojos/              Dojo locator (Mapbox GL JS, GPS detection)
    portal/             Authenticated member area (/portal/*)
  dashboard/            Admin/staff back-office
  login/ signup/        Auth pages (Supabase email + phone)
  api/
    webhooks/
      sslcommerz/       SSLCommerz payment webhook handler

components/
  3d/                   Three.js/R3F components (hero, belt tracker, brackets)
  dashboard/            Admin, Instructor, and Student dashboard views
  ui/                   Reusable shadcn-style primitives
  layout/               Shared layout wrappers (navbar, footer)
  *.tsx                 Public-site section components (hero, about, events…)

lib/
  supabase/             Supabase client (browser), server, and middleware helpers
  i18n/                 next-intl config and site content helpers
  prisma.ts             Singleton Prisma client

prisma/
  schema.prisma         Full DB schema — see Database Schema section

supabase/
  migrations/           SQL migration files applied to Supabase

assets/                 Static brand assets (fonts, logo, bg video)
public/assets/          Publicly served static files
hooks/                  Custom React hooks
styles/                 Global / utility CSS
```

---

## Database Schema

Tables managed via Prisma (PostgreSQL on Supabase). Identity is normalized to 3NF — every authenticated user has exactly one row in `users` and one row in the matching role-specific table. All tables have Row Level Security (RLS) policies enforced at the database level.

**Identity (3NF split)**
- `users` — shared profile (id, email, phone, full_name, avatar_url, role_id, is_active); mirrors `auth.users` by id
- `students` — student-specific profile (member_number, current_rank, dojo_id, membership_status, expiry_date, parent names, emergency contact, etc.); id is FK to `users.id`
- `instructors` — instructor profile (dojo_id, joined_date, bio); id is FK to `users.id`
- `dojo_managers` — manager profile (dojo_id); id is FK to `users.id`
- `dojo_owners` — owner profile (dojo_id UNIQUE, signature_url); id is FK to `users.id`
- `admins` — admin profile (scope); id is FK to `users.id`

**RBAC**
- `roles` — role catalog (slug-PK): `STUDENT`, `INSTRUCTOR`, `DOJO_MANAGER`, `DOJO_OWNER`, `ADMIN`; replaces the old `MemberRole` enum
- `permissions` — permission catalog (e.g. `members.read.own_dojo`, `gradings.approve`)
- `role_permissions` — many-to-many grants

**Infrastructure**
- `dojos` — branch locations with GPS coordinates and schedule JSON
- `attendance` — per-session records (FK to `students.id`)

**Ranking**
- `belt_ranks` — bilingual rank definitions with color hex
- `gradings` — individual grading results (FK to `students.id`)
- `grading_events` — exam sessions
- `grading_applications` — student applications for upcoming exams (FK to `students.id`)
- `certificate_requests` — printed-certificate orders (FK to `students.id`)

**Competition**
- `tournaments` — tournament metadata
- `tournament_participants` — registered competitors (FK to `students.id`)
- `tournament_matches` — bracket matches with winner tracking

**Content**
- `events` — public events (`posted_by_id` → `users.id`)
- `announcements` — short text posts (`posted_by_id` → `users.id`)
- `event_registrations` — event sign-ups (`user_id` → `users.id`; nullable for guests, with `checked_in_by_user_id` → `users.id`)
- `notifications` — in-app notification log (`user_id` → `users.id`)
- `achievements` — achievement catalog
- `student_achievements` — earned achievement rows (FK to `students.id`, `awarded_by_user_id` → `users.id`)

**E-commerce**
- `shop_products` — merchandise catalog
- `shop_orders` — orders (`user_id` → `users.id`)
- `dojo_inventory_items` / `dojo_sales` / `dojo_sale_items` — per-dojo stock and member receipts (`buyer_user_id`, `sold_by_user_id` → `users.id`)

---

## Routing Architecture

All user-facing routes are under `app/[locale]/` and inherit the `en`/`bn` locale from next-intl. The middleware (`middleware.ts`) handles:
1. Session refresh via Supabase SSR cookies
2. Route protection — unauthenticated users are redirected to `/login`
3. Locale redirects (bare `/en` or `/bn` paths → `/`)

**Public routes** (no auth): `/`, `/about`, `/belts`, `/news`, `/instructors`, `/resources`, `/contact`, `/dojos`

**Member portal** (auth required): `/[locale]/portal/dashboard`, `/portal/progress`, `/portal/certificates`, `/portal/grading`, `/portal/events`, `/portal/renew`

**Admin** (ADMIN role required): `/dashboard/*` — members, dojos, gradings, tournaments, shop, notifications

---

## Architectural Rules

1. **Server Components by default.** Use `"use client"` only for components that need browser APIs, user interaction, or Three.js canvas. Keep data-fetching in Server Components.

2. **Supabase RLS is the security boundary.** Never skip RLS. Students must only read their own rows. Dojo Heads/Instructors see only their assigned students. All Prisma queries run through the Supabase connection — RLS is enforced at the DB level. RLS predicates read `users.role_id` (e.g. `(SELECT role_id FROM users WHERE id = auth.uid()) = 'ADMIN'`); dojo-scoped checks join through `instructors`/`dojo_managers`/`dojo_owners`.

3. **Prisma for all DB mutations; Supabase client for auth and realtime.** Do not mix raw SQL with Prisma models except in migration files.

4. **Every page must support both locales.** Use `next-intl`'s `useTranslations` / `getTranslations` hooks. Never hardcode user-facing strings — add them to `messages/en.json` and `messages/bn.json`.

5. **3D canvases must have static fallbacks.** All Three.js/R3F components check for low-end device signals (via `navigator.hardwareConcurrency` or a feature flag) and render a static image or CSS alternative instead.

6. **Payments flow through server-side actions/API routes only.** Never expose payment API keys to the client. Webhook signature verification is mandatory for SSLCommerz.

7. **Certificate generation is async and queued.** Puppeteer runs server-side (Vercel serverless or a separate service), saves the PDF to Cloudinary, then updates `gradings.certificate_url` in the DB. Never block the request.

8. **Automation workflows (n8n) are event-driven.** The Next.js app emits webhook events to the n8n instance on Hetzner; it does not call WhatsApp/email APIs directly. Keep automation logic out of the app codebase.

9. **Role-based access is enforced at two layers:** middleware (Next.js) checks the Supabase session role claim, and Prisma queries apply role-scoped `where` clauses as a second guard.

10. **Identity is 3NF — never write to `users` without writing the matching role-table row.** Every authenticated user has exactly one row in `users` and one row in the matching role table (`students` / `instructors` / `dojo_managers` / `dojo_owners` / `admins`). To change a user's role, use `assignRole(userId, newRoleId)` from `lib/auth/assign-role.ts`; it removes the prior role-table row, inserts the new one, and updates `users.role_id` in one transaction. To load the current viewer's role + dojo in one call, use `loadCurrentUser(userId)` from `lib/auth/load-current-user.ts`. To fan-out notifications by role, use `findUserIdsByRoles([...roles], { dojoId })` from `lib/notify/recipients.ts`.

11. **Standalone output mode is enabled.** `next.config.ts` uses `output: 'standalone'` for Docker-compatible Vercel deploys.

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```
DATABASE_URL          Supabase pooled connection string (for Prisma)
DIRECT_URL            Supabase direct connection string (for migrations)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   (server-only, never expose to client)
CLOUDINARY_URL
GOOGLE_AI_API_KEY
SSLCOMMERZ_STORE_ID
SSLCOMMERZ_STORE_PASSWORD
STRIPE_SECRET_KEY
N8N_WEBHOOK_SECRET
```

---

## Development Commands

```bash
npm run dev       # Start Next.js dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check
npx prisma studio # Browse the database locally
npx prisma migrate dev --name <name>   # Create and apply a new migration
npx prisma generate                    # Regenerate Prisma client after schema changes
```

---

## Automation Workflows (n8n on Hetzner)

| Workflow | Trigger | Action |
|---|---|---|
| Welcome | New member created | WhatsApp + email with digital membership card |
| Grading Reminder | Daily cron, 30 days before exam | Personalized bilingual WhatsApp + email |
| Renewal Reminder | 60 / 30 / 7 days before expiry | WhatsApp + email with payment link |
| AI Assistant | Incoming WhatsApp message | GPT-4o / Gemini bilingual reply (dojos, ranks, eligibility) |
