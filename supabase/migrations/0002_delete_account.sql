-- Lets a signed-in user permanently delete their own account.
-- All their rows (profiles, journals, plans, resources, tasks) go with it: every table references
-- auth.users with ON DELETE CASCADE (see 0001_init.sql).
--
-- Run in Supabase Dashboard → SQL Editor.

create or replace function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Only signed-in users may call it, and it can only ever delete the caller (auth.uid()).
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
