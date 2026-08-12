-- Real contact email for notifications, distinct from the Supabase auth
-- email in `users.email`. Non-unique so a parent's inbox can be reused
-- across multiple children's accounts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email text;
