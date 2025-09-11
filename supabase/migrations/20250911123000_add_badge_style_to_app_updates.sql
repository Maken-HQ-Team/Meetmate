-- Add a style field to pick richer ribbon styles on the frontend
alter table public.app_updates
  add column if not exists badge_style text; -- e.g., primary, success, warning, danger, info, purple


