-- Generic Services catalog, per-service ServiceRequest workflow, and
-- dojo-issued ServiceCoupons. Transfer Dojo keeps its own dedicated
-- request table (student_transfer_requests) — the new tables handle
-- Kyu/Dan Conversion and any custom services JKA admin adds later.

-- ── Enums ────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE public."ServiceRequestStatus" AS ENUM (
        'PENDING_PAYMENT',
        'AWAITING_DOJO',
        'AWAITING_ADMIN',
        'APPROVED',
        'DENIED',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public."ServiceRequestDojoDecision" AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE public."NotificationType" ADD VALUE IF NOT EXISTS 'SERVICE';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE public."PaymentTransactionKind" ADD VALUE IF NOT EXISTS 'SERVICE_REQUEST';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ── ShopOrder discriminator ──────────────────────────────────────────────

ALTER TABLE public.shop_orders
    ADD COLUMN IF NOT EXISTS includes_service_request BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Extend student_transfer_requests with coupon fields ──────────────────

ALTER TABLE public.student_transfer_requests
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- ── services (catalog) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.services (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    fee_bdt     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    handler     TEXT NOT NULL DEFAULT 'generic',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the service kinds visible in the portal today. transfer-dojo lives
-- in the catalog only so admins can edit its fee and dojos can issue coupons
-- against it — the actual request/queue/webhook flow still uses the
-- dedicated student_transfer_requests table.
INSERT INTO public.services (slug, name, description, fee_bdt, handler)
VALUES
    ('kyu-dan-conversion',
     'Kyu / Dan Conversion',
     'Officially convert your rank record to the JKA Kyu or Dan grade you already hold. Requires dojo verification then JKA HQ approval.',
     1500,
     'kyu-dan-conversion'),
    ('transfer-dojo',
     'Transfer Dojo',
     'Move your JKA membership from your current dojo to another. Requires clearance from your current dojo and JKA HQ approval.',
     500,
     'transfer-dojo')
ON CONFLICT (slug) DO NOTHING;

-- ── service_coupons (dojo-issued) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_coupons (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT NOT NULL UNIQUE,
    dojo_id           UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
    created_by_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    discount_percent  INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    service_id        UUID REFERENCES public.services(id) ON DELETE SET NULL,
    usage_limit       INTEGER NOT NULL DEFAULT 1,
    used_count        INTEGER NOT NULL DEFAULT 0,
    expires_at        TIMESTAMPTZ,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_coupons_dojo ON public.service_coupons (dojo_id);
CREATE INDEX IF NOT EXISTS idx_service_coupons_service ON public.service_coupons (service_id);

-- ── service_requests ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    service_id        UUID NOT NULL REFERENCES public.services(id),
    dojo_id           UUID NOT NULL REFERENCES public.dojos(id),

    status            public."ServiceRequestStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    dojo_decision     public."ServiceRequestDojoDecision" NOT NULL DEFAULT 'PENDING',

    payload           JSONB NOT NULL DEFAULT '{}'::jsonb,

    reason            TEXT,
    dojo_note         TEXT,
    admin_note        TEXT,

    fee               NUMERIC(10, 2) NOT NULL,
    discount_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
    final_amount      NUMERIC(10, 2) NOT NULL,
    coupon_id         UUID REFERENCES public.service_coupons(id) ON DELETE SET NULL,
    coupon_code       TEXT,

    order_id          UUID UNIQUE REFERENCES public.shop_orders(id) ON DELETE SET NULL,

    paid_at           TIMESTAMPTZ,
    dojo_acted_at     TIMESTAMPTZ,
    dojo_acted_by_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    admin_acted_at    TIMESTAMPTZ,
    admin_acted_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_req_student ON public.service_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_service_req_dojo    ON public.service_requests (dojo_id, status);
CREATE INDEX IF NOT EXISTS idx_service_req_service ON public.service_requests (service_id, status);
CREATE INDEX IF NOT EXISTS idx_service_req_status  ON public.service_requests (status);

-- ── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_coupons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Services catalog: anyone signed in can read active services; only admins mutate.
DROP POLICY IF EXISTS services_read ON public.services;
CREATE POLICY services_read ON public.services
    FOR SELECT USING (
        is_active = TRUE
        OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );

DROP POLICY IF EXISTS services_admin_write ON public.services;
CREATE POLICY services_admin_write ON public.services
    FOR ALL USING (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    ) WITH CHECK (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );

-- Service coupons: the issuing dojo and admins can manage; students can read
-- a coupon just enough to look it up by code at checkout (handled server-side
-- with a specific query, but keep read open to authenticated users for MVP).
DROP POLICY IF EXISTS service_coupons_dojo_read ON public.service_coupons;
CREATE POLICY service_coupons_dojo_read ON public.service_coupons
    FOR SELECT USING (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.dojo_owners
            WHERE id = auth.uid() AND dojo_id = service_coupons.dojo_id
        )
        OR EXISTS (
            SELECT 1 FROM public.dojo_managers
            WHERE id = auth.uid() AND dojo_id = service_coupons.dojo_id
        )
        OR auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS service_coupons_dojo_write ON public.service_coupons;
CREATE POLICY service_coupons_dojo_write ON public.service_coupons
    FOR ALL USING (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.dojo_owners
            WHERE id = auth.uid() AND dojo_id = service_coupons.dojo_id
        )
        OR EXISTS (
            SELECT 1 FROM public.dojo_managers
            WHERE id = auth.uid() AND dojo_id = service_coupons.dojo_id
        )
    ) WITH CHECK (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.dojo_owners
            WHERE id = auth.uid() AND dojo_id = service_coupons.dojo_id
        )
        OR EXISTS (
            SELECT 1 FROM public.dojo_managers
            WHERE id = auth.uid() AND dojo_id = service_coupons.dojo_id
        )
    );

-- Service requests: student owns their rows; dojo staff sees their dojo's; admins see all.
DROP POLICY IF EXISTS service_requests_read ON public.service_requests;
CREATE POLICY service_requests_read ON public.service_requests
    FOR SELECT USING (
        student_id = auth.uid()
        OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.dojo_owners
            WHERE id = auth.uid() AND dojo_id = service_requests.dojo_id
        )
        OR EXISTS (
            SELECT 1 FROM public.dojo_managers
            WHERE id = auth.uid() AND dojo_id = service_requests.dojo_id
        )
    );

DROP POLICY IF EXISTS service_requests_write ON public.service_requests;
CREATE POLICY service_requests_write ON public.service_requests
    FOR ALL USING (
        student_id = auth.uid()
        OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.dojo_owners
            WHERE id = auth.uid() AND dojo_id = service_requests.dojo_id
        )
        OR EXISTS (
            SELECT 1 FROM public.dojo_managers
            WHERE id = auth.uid() AND dojo_id = service_requests.dojo_id
        )
    ) WITH CHECK (
        student_id = auth.uid()
        OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.dojo_owners
            WHERE id = auth.uid() AND dojo_id = service_requests.dojo_id
        )
        OR EXISTS (
            SELECT 1 FROM public.dojo_managers
            WHERE id = auth.uid() AND dojo_id = service_requests.dojo_id
        )
    );
