-- Add Dojo Head belt rank + link application to real Dojo record.
--
-- contact_rank: the Head Instructor's belt rank (e.g. "3rd Dan"), collected
-- during enlistment step 2. Free-form text — belt rank names are not
-- FK-enforced elsewhere either.
--
-- dojo_id: pre-created Dojo row (inactive) so trainer invites can point at
-- a real dojo id from step 5 onwards. Flipped to isActive=true once the
-- one-time enlistment fee is paid.

ALTER TABLE public.dojo_applications
    ADD COLUMN IF NOT EXISTS contact_rank TEXT,
    ADD COLUMN IF NOT EXISTS dojo_id UUID REFERENCES public.dojos (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dojo_applications_dojo_id_key
    ON public.dojo_applications (dojo_id)
    WHERE dojo_id IS NOT NULL;
