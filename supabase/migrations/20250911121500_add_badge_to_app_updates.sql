-- Add optional badge fields to app_updates so UI can show labels like "New" or "Huge Update"
alter table public.app_updates
  add column if not exists badge_label text,
  add column if not exists badge_variant text;

-- Backfill initial seed with a default badge
update public.app_updates
set badge_label = coalesce(badge_label, 'New'),
    badge_variant = coalesce(badge_variant, 'default')
where version = '1.0.0';


