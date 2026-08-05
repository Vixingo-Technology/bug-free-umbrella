-- Snapshot of the opt-in fees the participant picked for THIS division row
-- (as [{ id, label, amountBdt }]). Snapshotting the labels/amounts avoids
-- historical drift if the admin later renames or reprices a fee.

ALTER TABLE public.event_registrations
    ADD COLUMN IF NOT EXISTS selected_optional_fees jsonb;
