-- Secure function to look up user_id by email (bypasses RLS safely)
create or replace function public.get_user_id_by_email(email_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select user_id into uid
  from public.profiles
  where lower(email) = lower(email_input)
  limit 1;
  return uid; -- returns null if not found
end;
$$;

-- Grant execute to clients
grant execute on function public.get_user_id_by_email(text) to anon, authenticated;