-- Convert every timestamp column in Prisma-managed tables to timestamptz.
-- All existing rows are interpreted as UTC wall-clock (which they are —
-- Prisma writes UTC by convention). Also converts the two hand-written
-- tables that used bare `timestamp`: payment_transactions and tournaments.

BEGIN;

SET TIME ZONE 'UTC';

ALTER TABLE achievements
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE admins
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE announcements
    ALTER COLUMN published_at TYPE timestamptz(6) USING published_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE belt_ranks
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE certificate_requests
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE division_presets
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE dojo_applications
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE dojo_inventory_items
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE dojo_managers
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE dojo_owner_invites
    ALTER COLUMN invited_at TYPE timestamptz(6) USING invited_at AT TIME ZONE 'UTC',
    ALTER COLUMN accepted_at TYPE timestamptz(6) USING accepted_at AT TIME ZONE 'UTC';

ALTER TABLE dojo_owners
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE dojo_sales
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE dojos
    ALTER COLUMN expiry_date TYPE timestamptz(6) USING expiry_date AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE event_registrations
    ALTER COLUMN paid_at TYPE timestamptz(6) USING paid_at AT TIME ZONE 'UTC',
    ALTER COLUMN checked_in_at TYPE timestamptz(6) USING checked_in_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE events
    ALTER COLUMN event_date TYPE timestamptz(6) USING event_date AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE grading_applications
    ALTER COLUMN applied_at TYPE timestamptz(6) USING applied_at AT TIME ZONE 'UTC';

ALTER TABLE grading_events
    ALTER COLUMN event_date TYPE timestamptz(6) USING event_date AT TIME ZONE 'UTC',
    ALTER COLUMN cancelled_at TYPE timestamptz(6) USING cancelled_at AT TIME ZONE 'UTC',
    ALTER COLUMN results_published_at TYPE timestamptz(6) USING results_published_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE gradings
    ALTER COLUMN verified_at TYPE timestamptz(6) USING verified_at AT TIME ZONE 'UTC',
    ALTER COLUMN submitted_at TYPE timestamptz(6) USING submitted_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE instructors
    ALTER COLUMN joined_date TYPE timestamptz(6) USING joined_date AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE notifications
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE payment_transactions
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE permissions
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE profiles
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE role_permissions
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE roles
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE service_coupons
    ALTER COLUMN expires_at TYPE timestamptz(6) USING expires_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE service_requests
    ALTER COLUMN paid_at TYPE timestamptz(6) USING paid_at AT TIME ZONE 'UTC',
    ALTER COLUMN dojo_acted_at TYPE timestamptz(6) USING dojo_acted_at AT TIME ZONE 'UTC',
    ALTER COLUMN admin_acted_at TYPE timestamptz(6) USING admin_acted_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE services
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE shop_orders
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE shop_products
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE student_achievements
    ALTER COLUMN unlocked_at TYPE timestamptz(6) USING unlocked_at AT TIME ZONE 'UTC';

ALTER TABLE student_dojo_history
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE student_transfer_requests
    ALTER COLUMN paid_at TYPE timestamptz(6) USING paid_at AT TIME ZONE 'UTC',
    ALTER COLUMN dojo_acted_at TYPE timestamptz(6) USING dojo_acted_at AT TIME ZONE 'UTC',
    ALTER COLUMN admin_acted_at TYPE timestamptz(6) USING admin_acted_at AT TIME ZONE 'UTC',
    ALTER COLUMN new_dojo_acted_at TYPE timestamptz(6) USING new_dojo_acted_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE students
    ALTER COLUMN join_date TYPE timestamptz(6) USING join_date AT TIME ZONE 'UTC',
    ALTER COLUMN expiry_date TYPE timestamptz(6) USING expiry_date AT TIME ZONE 'UTC',
    ALTER COLUMN joined_at TYPE timestamptz(6) USING joined_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE system_settings
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE tournament_details
    ALTER COLUMN registration_deadline TYPE timestamptz(6) USING registration_deadline AT TIME ZONE 'UTC',
    ALTER COLUMN weigh_in_date TYPE timestamptz(6) USING weigh_in_date AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE tournament_matches
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE tournament_participants
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC';

ALTER TABLE tournaments
    ALTER COLUMN date TYPE timestamptz(6) USING date AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE users
    ALTER COLUMN created_at TYPE timestamptz(6) USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz(6) USING updated_at AT TIME ZONE 'UTC';

COMMIT;