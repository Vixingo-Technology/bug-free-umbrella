-- Add a short free-text bio to every user (admins, dojo staff, students).
-- Displayed on the account page and available for future public profile use.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "bio" TEXT;
