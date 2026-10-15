-- GuruLog initial schema. Run in Supabase Dashboard → SQL Editor (or `supabase db push`).
-- Every table is owned by a user and protected by Row Level Security.

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- One profile per user (classes / subjects are small lists, kept on the profile).
create table public.profiles (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name       text   not null default 'Guru' check (char_length(name) <= 100),
  tz         text   not null default 'Asia/Jakarta',
  classes    text[] not null default '{}',
  subjects   text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journals (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date,
  type       text not null default 'quick' check (type in ('quick', 'detailed')),
  title      text not null default '' check (char_length(title) <= 200),
  content    text not null default '' check (char_length(content) <= 20000),
  class_name text not null default '',
  subject    text not null default '',
  mood       text not null default 'good' check (mood in ('great', 'good', 'neutral', 'challenging')),
  topic      text not null default '',
  worked     text not null default '' check (char_length(worked) <= 20000),
  improve    text not null default '' check (char_length(improve) <= 20000),
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 200),
  date       date,
  time       text not null default '',
  class_name text not null default '',
  subject    text not null default '',
  objective  text not null default '' check (char_length(objective) <= 20000),
  activities text not null default '' check (char_length(activities) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null default '' check (char_length(title) <= 200),
  type        text not null default 'Materi' check (type in ('Materi', 'Ide', 'Link', 'Aktivitas')),
  description text not null default '' check (char_length(description) <= 20000),
  url         text not null default '' check (char_length(url) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.tasks (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 200),
  date       date,
  priority   text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journals_user_date  on public.journals  (user_id, date desc);
create index plans_user_date     on public.plans     (user_id, date);
create index resources_user      on public.resources (user_id);
create index tasks_user_date     on public.tasks     (user_id, date);

-- updated_at triggers + RLS (owner-only access) for every table.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'journals', 'plans', 'resources', 'tasks'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_owner', t);
  end loop;
end $$;
