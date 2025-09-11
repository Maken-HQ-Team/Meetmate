-- Create app_updates table to store product updates/changelogs
create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  published boolean not null default true
);

-- Enable RLS and allow read for authenticated users
alter table public.app_updates enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'app_updates' and policyname = 'Allow read to authenticated'
  ) then
    create policy "Allow read to authenticated" on public.app_updates
      for select using ( auth.role() = 'authenticated' or auth.role() = 'anon' );
  end if;
end $$;

-- Seed initial v1.0 post
insert into public.app_updates (version, title, content)
values (
  '1.0.0',
  'Version 1.0 – First public release',
  $upd$
Highlights
- Dashboard with performance health and metrics
- WhatsApp-style conversations with real-time indicators
- Availability calendar with sharing
- Manage Shared Access with per-user visibility
- Profile settings with avatar upload/crop and timezone support

Improvements
- Mobile responsive layouts across dashboard, conversations, shared access, and settings
- Better touch targets and safe-area handling

Fixes
- Various Supabase RLS and trigger reliability fixes
$upd$
) on conflict do nothing;


