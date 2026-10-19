-- Web Push: one row per subscribed device, plus a log so each reminder is sent once per device per day.
-- Run in Supabase Dashboard → SQL Editor. The schedule that triggers sending is in supabase/push-setup.md.

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null check (char_length(endpoint) <= 2000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  prefs      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_owner on public.push_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Written only by the Edge Function (service role bypasses RLS); no policies, so clients cannot read or write it.
create table public.push_sent (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  key             text not null,
  sent_on         date not null,
  primary key (subscription_id, key)
);
alter table public.push_sent enable row level security;
