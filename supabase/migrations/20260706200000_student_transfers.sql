-- Student dojo transfer requests.
-- Students pay a small fee to request a move to another dojo. The current
-- dojo's owner must give clearance (or reject — either way it escalates to
-- JKA admin, who can override a rejection). Approved transfers reassign the
-- student and write a permanent audit row to student_dojo_history so the
-- admin member page can render a "Profile history" timeline.

-- ── Enums ────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE public."StudentTransferStatus" AS ENUM (
        'PENDING_PAYMENT',
        'AWAITING_DOJO',
        'AWAITING_ADMIN',
        'APPROVED',
        'DENIED',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public."StudentTransferDojoDecision" AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend the existing NotificationType enum.
DO $$ BEGIN
    ALTER TYPE public."NotificationType" ADD VALUE IF NOT EXISTS 'TRANSFER';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ── ShopOrder discriminator ──────────────────────────────────────────────

ALTER TABLE public.shop_orders
    ADD COLUMN IF NOT EXISTS includes_transfer_request BOOLEAN NOT NULL DEFAULT FALSE;

-- ── student_transfer_requests ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_transfer_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_dojo_id      UUID NOT NULL REFERENCES public.dojos(id),
    to_dojo_id        UUID NOT NULL REFERENCES public.dojos(id),

    status            public."StudentTransferStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    dojo_decision     public."StudentTransferDojoDecision" NOT NULL DEFAULT 'PENDING',

    reason            TEXT,
    dojo_note         TEXT,
    admin_note        TEXT,

    fee               NUMERIC(10, 2) NOT NULL,
    order_id          UUID UNIQUE REFERENCES public.shop_orders(id) ON DELETE SET NULL,

    paid_at           TIMESTAMPTZ,
    dojo_acted_at     TIMESTAMPTZ,
    dojo_acted_by_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    admin_acted_at    TIMESTAMPTZ,
    admin_acted_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_student   ON public.student_transfer_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_transfer_from_stat ON public.student_transfer_requests (from_dojo_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_to_stat   ON public.student_transfer_requests (to_dojo_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_status    ON public.student_transfer_requests (status);

-- ── student_dojo_history ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_dojo_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id            UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_dojo_id          UUID REFERENCES public.dojos(id),
    to_dojo_id            UUID REFERENCES public.dojos(id),
    transfer_request_id   UUID REFERENCES public.student_transfer_requests(id) ON DELETE SET NULL,
    changed_by_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reason                TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dojo_history_student ON public.student_dojo_history (student_id);
