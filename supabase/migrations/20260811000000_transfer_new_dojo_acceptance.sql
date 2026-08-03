-- Adds a two-stage transfer flow: admin approval sends the request to the
-- *new* dojo owner, who then reviews the student, sets a rank, and completes
-- the transfer. Student is only moved into the new dojo on that final accept.

ALTER TYPE "StudentTransferStatus" ADD VALUE IF NOT EXISTS 'AWAITING_NEW_DOJO';

ALTER TABLE "student_transfer_requests"
  ADD COLUMN IF NOT EXISTS "new_dojo_acted_at"    timestamp,
  ADD COLUMN IF NOT EXISTS "new_dojo_acted_by_id" uuid,
  ADD COLUMN IF NOT EXISTS "assigned_rank"        text;

ALTER TABLE "student_transfer_requests"
  DROP CONSTRAINT IF EXISTS "student_transfer_requests_new_dojo_acted_by_id_fkey";

ALTER TABLE "student_transfer_requests"
  ADD CONSTRAINT "student_transfer_requests_new_dojo_acted_by_id_fkey"
  FOREIGN KEY ("new_dojo_acted_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
