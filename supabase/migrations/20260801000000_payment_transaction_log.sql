-- Payment transaction log: one row per gateway attempt so admins can audit
-- pending / successful / failed / cancelled attempts across every payment
-- surface (membership, past-belt, certificates, dojo renewal, transfer,
-- event ticket, shop).
--
-- Rows are inserted at initiate-time (PENDING) and updated on the webhook
-- callback (SUCCESS / FAILED / CANCELLED). Dev bypass writes SUCCESS
-- directly.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentTransactionStatus') THEN
    CREATE TYPE "PaymentTransactionStatus" AS ENUM (
      'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentTransactionKind') THEN
    CREATE TYPE "PaymentTransactionKind" AS ENUM (
      'MEMBERSHIP', 'PAST_BELT_FEE', 'CERTIFICATES', 'DOJO_RENEWAL',
      'TRANSFER', 'EVENT_TICKET', 'SHOP', 'OTHER'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentProvider') THEN
    CREATE TYPE "PaymentProvider" AS ENUM ('SSLCOMMERZ', 'DEV_BYPASS', 'MANUAL');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid REFERENCES shop_orders(id) ON DELETE SET NULL,
  event_registration_id uuid REFERENCES event_registrations(id) ON DELETE SET NULL,
  user_id               uuid REFERENCES users(id) ON DELETE SET NULL,
  provider              "PaymentProvider" NOT NULL DEFAULT 'SSLCOMMERZ',
  kind                  "PaymentTransactionKind" NOT NULL,
  status                "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
  amount                numeric(10, 2) NOT NULL,
  currency              text NOT NULL DEFAULT 'BDT',
  gateway_txn_id        text,
  reason                text,
  buyer_name            text,
  buyer_email           text,
  buyer_phone           text,
  created_at            timestamp NOT NULL DEFAULT now(),
  updated_at            timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_transactions_order_id_idx        ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS payment_transactions_event_reg_id_idx    ON payment_transactions(event_registration_id);
CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx         ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx          ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS payment_transactions_kind_idx            ON payment_transactions(kind);
CREATE INDEX IF NOT EXISTS payment_transactions_created_at_idx      ON payment_transactions(created_at DESC);

-- RLS: only ADMINs read this table. Webhooks + server actions bypass RLS
-- via the service-role connection, so nothing else needs a policy.
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_transactions_admin_read ON payment_transactions;
CREATE POLICY payment_transactions_admin_read ON payment_transactions
  FOR SELECT
  USING ((SELECT role_id FROM users WHERE id = auth.uid()) = 'ADMIN');
