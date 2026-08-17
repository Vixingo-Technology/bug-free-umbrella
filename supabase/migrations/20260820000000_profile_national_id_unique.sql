-- Birth Certificate No. (stored in profiles.national_id) must be unique
-- across all members. Multiple NULLs remain allowed so members who have
-- not yet filled it in do not collide with each other.
--
-- Defensive: normalise any legacy empty strings to NULL first, otherwise
-- the unique constraint would consider them duplicates.

UPDATE profiles SET national_id = NULL WHERE national_id = '';

ALTER TABLE profiles
    ADD CONSTRAINT profiles_national_id_key UNIQUE (national_id);
