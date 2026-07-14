-- Add the student dojo-transfer request fee to SystemSettings.
-- NULL means "fall back to TRANSFER_REQUEST_FEE_BDT in lib/constants".

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS transfer_fee_bdt numeric(10, 2);
