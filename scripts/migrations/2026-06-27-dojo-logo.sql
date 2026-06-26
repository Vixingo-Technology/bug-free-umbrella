-- Dojo logo URL.
-- Cloudinary URL pointing to a PNG or SVG (transparent background).
-- Used on the public dojo page, certificates, and the member portal header.

alter table public.dojos
  add column if not exists logo_url text;
