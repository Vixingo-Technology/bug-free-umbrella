-- Post-publish grading pipeline: track manager verification and dojo-head
-- submission to JKA HQ for each PASSED grading. Non-passed rows sit at
-- QUALIFIED and never advance — only passes surface in the pipeline UI.
--
-- Adds:
--   • enum GradingPipelineStage (QUALIFIED / VERIFIED / SUBMITTED)
--   • gradings.pipeline_stage        (default QUALIFIED)
--   • gradings.verified_at / verified_by_user_id
--   • gradings.submitted_at / submitted_by_user_id

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GradingPipelineStage') THEN
    CREATE TYPE "GradingPipelineStage" AS ENUM ('QUALIFIED', 'VERIFIED', 'SUBMITTED');
  END IF;
END$$;

ALTER TABLE gradings
  ADD COLUMN IF NOT EXISTS pipeline_stage "GradingPipelineStage" NOT NULL DEFAULT 'QUALIFIED',
  ADD COLUMN IF NOT EXISTS verified_at timestamp,
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp,
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gradings_pipeline_stage_idx
  ON gradings(pipeline_stage);
