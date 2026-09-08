-- Stores the homepage carousel slides as admin-managed JSON.
-- Each element: { "image": "https://...", "headline": "...", "ctaText": "...", "ctaHref": "..." }
alter table public.admin_settings
  add column if not exists hero_slides jsonb;
