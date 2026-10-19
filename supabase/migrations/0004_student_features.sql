-- Student features: exam/deadline kinds on plans, subject on tasks and resources, weekly class schedule, thesis tracker.
-- Run in Supabase Dashboard → SQL Editor, after 0001-0003 and BEFORE deploying the matching app version.

alter table public.plans add column if not exists kind text not null default 'kuliah'
  check (kind in ('kuliah', 'kuis', 'uts', 'uas', 'deadline'));
alter table public.resources add column if not exists subject text not null default '' check (char_length(subject) <= 200);
alter table public.tasks add column if not exists subject text not null default '' check (char_length(subject) <= 200);

create table public.schedules (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject    text not null default '' check (char_length(subject) <= 200),
  class_name text not null default '' check (char_length(class_name) <= 200),
  day        smallint not null default 1 check (day between 0 and 6),
  start_time text not null default '' check (char_length(start_time) <= 5),
  end_time   text not null default '' check (char_length(end_time) <= 5),
  room       text not null default '' check (char_length(room) <= 200),
  until      date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.thesis_stages (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 200),
  status     text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  date       date,
  note       text not null default '' check (char_length(note) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.thesis_guidance (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date          date,
  lecturer      text not null default '' check (char_length(lecturer) <= 200),
  notes         text not null default '' check (char_length(notes) <= 20000),
  followup      text not null default '' check (char_length(followup) <= 20000),
  followup_done boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index schedules_user       on public.schedules       (user_id);
create index thesis_stages_user   on public.thesis_stages   (user_id, date);
create index thesis_guidance_user on public.thesis_guidance (user_id, date desc);

do $$
declare t text;
begin
  foreach t in array array['schedules', 'thesis_stages', 'thesis_guidance'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_owner', t);
  end loop;
end $$;
