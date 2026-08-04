-- Optional profile image participants can upload when registering for an
-- event. Rendered on the participation card.

ALTER TABLE public.event_registrations
    ADD COLUMN IF NOT EXISTS profile_image_url text;
