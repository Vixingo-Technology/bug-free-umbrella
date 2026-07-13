-- Add editable subscription / affiliation fees to the SystemSettings singleton.
-- NULL means "fall back to the built-in default from lib/constants".

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS dojo_enlistment_fee_bdt numeric(10, 2),
  ADD COLUMN IF NOT EXISTS dojo_renewal_fee_bdt    numeric(10, 2),
  ADD COLUMN IF NOT EXISTS membership_fee_bdt      numeric(10, 2);
