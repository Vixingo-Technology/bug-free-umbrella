# JKA Bangladesh — Full System Implementation Plan

**Status as of 2026-06-15**

---

## What's Done

| Area | Status |
|---|---|
| Public website (hero, about, events, gallery, branches, CTA) | ✅ Complete |
| Supabase Auth (email sign-up/login, session middleware) | ✅ Complete |
| Prisma schema (17 tables, all relations) | ✅ Created |
| Portal shell + layout | ✅ Complete |
| Admin/Instructor/Student dashboard shells | ✅ Complete |
| Portal pages (dashboard, progress, grading, certs, events, notifications, orders, profile) | ✅ Complete |
| SSLCommerz webhook handler | ✅ Scaffolded |
| 3D BeltTracker component | ✅ Complete |

---

## Phase 1 — Database Bootstrap  ← **DO THIS NOW**

### Step 1: Push schema to Supabase
Run from your Mac terminal (in the project root):

```bash
npm run db:push
```

This creates all 17 tables on your Supabase project. Takes ~30 seconds.

### Step 2: Generate Prisma client
```bash
npm run db:generate
```

This writes the TypeScript client to `prisma/generated/client/`.

### Step 3: Seed belt ranks
After push, you'll need seed data for the `belt_ranks` table. Run (create this file first):

```bash
node scripts/seed-belt-ranks.mjs
```

Belt ranks to seed (in order):
1. White Belt — 10th Kyu — #FFFFFF
2. Yellow Belt — 9th Kyu — #FFD700
3. Orange Belt — 8th Kyu — #FF8C00
4. Green Belt — 7th Kyu — #228B22
5. Blue Belt — 6th Kyu — #0000CD
6. Brown Belt — 5th/4th/3rd Kyu — #8B4513
7. Black Belt 1st Dan — Shodan — #1a1a1a
8. Black Belt 2nd Dan — Nidan — #1a1a1a
9. Black Belt 3rd Dan — Sandan — #1a1a1a
10. Black Belt 4th Dan — Yondan — #1a1a1a
11. Black Belt 5th Dan — Godan — #1a1a1a

### Step 4: Seed test users
```bash
node scripts/seed-users.mjs
```

Creates: `student@jka.test`, `instructor@jka.test`, `admin@jka.test` (all password: `Password123!`)

### Step 5: Supabase auth trigger
Create this SQL trigger in Supabase SQL Editor so new sign-ups auto-create a `members` row:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.members (id, full_name, email, role, current_rank)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    COALESCE(NEW.raw_user_meta_data->>'current_rank', 'White Belt')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## Phase 2 — Member Portal (Weeks 1–2)

These pages exist as shells — they need real data wired in and actions completed.

### 2.1 Profile page
- [ ] `app/portal/profile/page.tsx` — fetch member + all dojos for dropdown
- [ ] `updateProfileAction` — already written, needs `phone` + `dojoId` fields on Member form
- [ ] Avatar upload → Cloudinary, save `avatarUrl` on Member

### 2.2 Progress page
- [ ] Already reads `allBeltRanks` and `gradings` — works once DB is live
- [ ] Add `ProgressClient` belt tracker visualization (uses 3D or CSS fallback)

### 2.3 Grading page
- [ ] `applyForGradingAction` and `withdrawApplicationAction` — already written
- [ ] Admin must create GradingEvents first (Phase 4)

### 2.4 Certificates page
- [ ] Reads `gradings` where `result = PASSED` and `certificateUrl != null`
- [ ] Requires certificate generation pipeline (Phase 3.3)

### 2.5 Events page
- [ ] `registerForEventAction` and `cancelEventRegistrationAction` — already written
- [ ] Events must be created in admin panel (Phase 4)

### 2.6 Membership renewal
- [ ] `app/portal/renew/page.tsx` — create this page
- [ ] Show current expiry, payment options (SSLCommerz / bKash / Nagad / Stripe)
- [ ] On payment success, update `member.expiryDate`

### 2.7 Notifications
- [ ] `markNotificationReadAction` and `markAllReadAction` — already written
- [ ] Trigger notifications from n8n or server actions when events occur

---

## Phase 3 — Background Services (Weeks 2–3)

### 3.1 n8n Automation Workflows (on Hetzner VPS)

| Workflow | Trigger | Action |
|---|---|---|
| Welcome | `member.created` webhook from Next.js | WhatsApp + email with digital membership card |
| Grading Reminder | Daily cron, 30 days pre-exam | Bilingual WhatsApp + email |
| Renewal Reminder | Daily cron, 60/30/7 days pre-expiry | WhatsApp + email with payment link |
| AI Assistant | Incoming WhatsApp message | Gemini bilingual reply |

Emit webhooks from Next.js server actions using:
```typescript
// lib/n8n.ts
export async function emitWebhook(event: string, payload: object) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const url = `${process.env.N8N_BASE_URL}/webhook/${event}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': secret! },
    body: JSON.stringify(payload),
  });
}
```

### 3.2 Payment Flow

**SSLCommerz (local):**
- [ ] `app/api/payments/initiate/route.ts` — create order, redirect to SSLCommerz
- [ ] `app/api/webhooks/sslcommerz/route.ts` — already scaffolded, needs order lookup by `transactionId`
- [ ] On PAID: update `ShopOrder.paymentStatus`, emit n8n webhook, update `member.expiryDate` (for renewals)

**Stripe (international):**
- [ ] `app/api/payments/stripe/route.ts` — Stripe Checkout session
- [ ] `app/api/webhooks/stripe/route.ts` — handle `checkout.session.completed`

### 3.3 Certificate Generation
- [ ] `app/api/certificates/generate/route.ts`
- [ ] Use Puppeteer to render a certificate HTML template
- [ ] Include unique QR code linking to verification URL
- [ ] Upload PDF to Cloudinary, save URL to `gradings.certificateUrl`
- [ ] Call async (queue via n8n or Vercel background job)

---

## Phase 4 — Admin Back-Office (Weeks 3–4)

All under `app/dashboard/` — role-gated to ADMIN.

### 4.1 Members management
- [ ] `app/dashboard/members/page.tsx` — list, search, filter by role/dojo/rank
- [ ] `app/dashboard/members/[id]/page.tsx` — view/edit member, assign dojo, change rank
- [ ] Bulk import CSV

### 4.2 Dojo management
- [ ] `app/dashboard/dojos/page.tsx` — create/edit dojos
- [ ] Assign head instructor, set schedule JSON, GPS coordinates

### 4.3 Grading management
- [ ] `app/dashboard/gradings/page.tsx` — create GradingEvents
- [ ] Review applications (approve/reject)
- [ ] Record results, trigger certificate generation

### 4.4 Tournament management
- [ ] `app/dashboard/tournaments/page.tsx` — create tournaments
- [ ] Register participants, generate brackets
- [ ] Record match results

### 4.5 Event management
- [ ] `app/dashboard/events/page.tsx` — create/edit events
- [ ] Manage registrations, attendance

### 4.6 Shop management
- [ ] `app/dashboard/shop/page.tsx` — manage products (stock, price, image)
- [ ] View orders, update payment status

### 4.7 Notifications broadcast
- [ ] `app/dashboard/notifications/page.tsx` — send bulk notification to members filtered by role/dojo/rank

---

## Phase 5 — Public Website Enhancements (Week 4)

### 5.1 Dojo locator
- [ ] `app/[locale]/dojos/page.tsx` — Mapbox GL JS map
- [ ] GPS detection, nearest dojo highlight
- [ ] Click dojo → schedule popup

### 5.2 i18n (next-intl)
- [ ] Move all routes under `app/[locale]/`
- [ ] Create `messages/en.json` and `messages/bn.json`
- [ ] Wire `useTranslations` in every component

### 5.3 News / Blog
- [ ] `app/[locale]/news/page.tsx` — connect Payload CMS
- [ ] Individual post pages

### 5.4 Instructors page
- [ ] `app/[locale]/instructors/page.tsx` — read from `instructors` + `members` tables

### 5.5 Belt ranks page
- [ ] `app/[locale]/belts/page.tsx` — read from `belt_ranks` table
- [ ] 3D belt visualizer component

---

## Phase 6 — AI & WhatsApp (Week 5)

### 6.1 WhatsApp webhook receiver
- [ ] `app/api/webhooks/whatsapp/route.ts` — Meta webhook verification + message handler
- [ ] Route to n8n for AI processing

### 6.2 Gemini AI assistant
- [ ] Handle dojo queries, rank eligibility, exam dates
- [ ] Bilingual (English + Bangla) response generation

### 6.3 AI membership card
- [ ] Generate personalized digital card with member photo, rank, QR code
- [ ] Send via WhatsApp on member creation

---

## Phase 7 — Deployment (Week 6)

### 7.1 Vercel
- [ ] Set all environment variables in Vercel dashboard
- [ ] Enable `output: 'standalone'` (already in `next.config.ts`)
- [ ] Configure custom domain: `jkabangladesh.com`
- [ ] Set up Vercel Cron Jobs for daily reminder triggers

### 7.2 Hetzner VPS (n8n)
- [ ] Install n8n via Docker
- [ ] Configure all 4 automation workflows
- [ ] Set up SSL cert (Let's Encrypt)
- [ ] Point subdomain: `n8n.jkabangladesh.com`

### 7.3 Supabase RLS policies
Apply RLS for every table. Key policies:

```sql
-- Members: only see your own row (students)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_self" ON members FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admin_all" ON members FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid())
);

-- Gradings: student sees own, instructor sees dojo members
CREATE POLICY "grading_self" ON gradings FOR SELECT USING (member_id = auth.uid());

-- Notifications: own only
CREATE POLICY "notification_self" ON notifications FOR ALL USING (member_id = auth.uid());

-- Events: published only for members
CREATE POLICY "event_published" ON events FOR SELECT USING (is_published = true);
```

---

## Immediate Next Steps (Today)

1. **Terminal:** `npm run db:push` → creates all tables
2. **Terminal:** `npm run db:generate` → generates Prisma client
3. **Supabase SQL Editor:** Paste the auth trigger SQL above
4. **Terminal:** `node scripts/seed-belt-ranks.mjs` (create this script)
5. **Terminal:** `node scripts/seed-users.mjs` → test users
6. **Browser:** Visit `http://localhost:3000/portal` → login as `student@jka.test`
7. Verify portal dashboard loads member data from DB

---

## Architecture Decisions (Locked)

- **No direct DB access from client** — all mutations go through Server Actions or API Routes
- **Supabase Auth as identity provider** — `auth.users.id` is the PK for `members`
- **Prisma for all CRUD** — no raw SQL in app code except migrations
- **n8n for all side effects** — email/WhatsApp sent via n8n, never directly from Next.js
- **Cloudinary for all media** — images, videos, PDFs stored there, never in the repo
- **RLS as secondary guard** — Prisma where-clauses are first line; RLS prevents any bypass

---

## Files Still Needed

| File | Purpose |
|---|---|
| `scripts/seed-belt-ranks.mjs` | Seed belt rank reference data |
| `app/portal/renew/page.tsx` | Membership renewal flow |
| `lib/n8n.ts` | Webhook emitter utility |
| `lib/cloudinary.ts` | Upload helper |
| `app/api/payments/initiate/route.ts` | SSLCommerz payment initiation |
| `app/api/payments/stripe/route.ts` | Stripe checkout |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `app/api/certificates/generate/route.ts` | PDF certificate generator |
| `app/api/webhooks/whatsapp/route.ts` | WhatsApp webhook |
| `app/dashboard/members/page.tsx` | Admin: members list |
| `app/dashboard/dojos/page.tsx` | Admin: dojos |
| `app/dashboard/gradings/page.tsx` | Admin: grading management |
| `app/dashboard/events/page.tsx` | Admin: events |
| `app/dashboard/shop/page.tsx` | Admin: shop |
| `app/dashboard/tournaments/page.tsx` | Admin: tournaments |
| `messages/en.json` | English i18n strings |
| `messages/bn.json` | Bangla i18n strings |
