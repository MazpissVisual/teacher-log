-- Hardening for push subscriptions (run after 0005). Found in the pre-test audit.
-- 1. Only https endpoints: the Edge Function POSTs to these URLs, so they must not point anywhere else.
--    (The function also checks the host against the known browser push services.)
-- 2. At most 10 devices per user, so one account cannot create unbounded rows for the function to loop over.

delete from public.push_subscriptions where endpoint not like 'https://%';
alter table public.push_subscriptions
  add constraint push_endpoint_https check (endpoint like 'https://%');

create or replace function public.limit_push_subscriptions() returns trigger
language plpgsql as $$
begin
  -- re-registering a device that already exists is an upsert, not a new row, so it is never blocked
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id and endpoint = new.endpoint)
     and (select count(*) from public.push_subscriptions where user_id = new.user_id) >= 10 then
    raise exception 'too many push subscriptions';
  end if;
  return new;
end $$;

create trigger push_subscriptions_limit before insert on public.push_subscriptions
  for each row execute function public.limit_push_subscriptions();
