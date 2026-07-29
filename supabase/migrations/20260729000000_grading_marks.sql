-- Add marks column to gradings so belt tests are scored 0-100.
-- Grade + recommendation are derived in application code from marks.
-- Null marks are allowed: legacy rows + ABSENT results have no numeric score.
ALTER TABLE gradings
  ADD COLUMN IF NOT EXISTS marks smallint;

ALTER TABLE gradings
  ADD CONSTRAINT gradings_marks_range
  CHECK (marks IS NULL OR (marks >= 0 AND marks <= 100));
