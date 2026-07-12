-- Add Dojo Head date of birth to enlistment applications.
--
-- contact_dob: birth date of the Head Instructor / Dojo Owner enlisting the
-- dojo. Collected in step 2 of the enlistment wizard. Nullable so existing
-- rows keep working; the client and server both enforce min-age 18 on new
-- submissions.

ALTER TABLE public.dojo_applications
    ADD COLUMN IF NOT EXISTS contact_dob DATE;
