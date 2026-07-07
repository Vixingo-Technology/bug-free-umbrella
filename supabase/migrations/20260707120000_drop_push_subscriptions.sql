-- Push notification feature removed (desktop + mobile Web Push).
-- Drops the push_subscriptions table added by
-- 20260707000000_push_subscriptions.sql.

DROP TABLE IF EXISTS public.push_subscriptions;
