-- TeacherNotes schema. Run once in Supabase Dashboard -> SQL Editor (or `supabase db push`) on a fresh project.
-- Every table is owned by a user and protected by Row Level Security: a user can only touch their own rows.

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- One profile per user. The class list ("Matematika 8B", ...) is small, so it lives on the profile.
create table public.profiles (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name       text   not null default 'Guru' check (char_length(name) <= 100),
  tz         text   not null default 'Asia/Jakarta',
  classes    text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journals (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date,
  title      text not null default '' check (char_length(title) <= 200),
  content    text not null default '' check (char_length(content) <= 20000),
  class_name text not null default '' check (char_length(class_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lessons, tests (ulangan), assignments (tugas) and other one-off items. `done` only matters for assignments.
create table public.plans (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 200),
  date       date,
  time       text not null default '',
  class_name text not null default '' check (char_length(class_name) <= 100),
  notes      text not null default '' check (char_length(notes) <= 20000),
  kind       text not null default 'pelajaran' check (kind in ('pelajaran', 'ulangan', 'tugas', 'lainnya')),
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Teaching materials: handouts, ideas, links and activities.
create table public.resources (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null default '' check (char_length(title) <= 200),
  type        text not null default 'Materi' check (type in ('Materi', 'Ide', 'Link', 'Aktivitas')),
  class_name  text not null default '' check (char_length(class_name) <= 100),
  description text not null default '' check (char_length(description) <= 20000),
  url         text not null default '' check (char_length(url) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Weekly recurring lessons. day: 0 = Sunday ... 6 = Saturday.
create table public.schedules (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_name text not null default '' check (char_length(class_name) <= 100),
  day        smallint not null default 1 check (day between 0 and 6),
  start_time text not null default '',
  end_time   text not null default '',
  room       text not null default '' check (char_length(room) <= 100),
  until      date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journals_user_date  on public.journals  (user_id, date desc);
create index plans_user_date     on public.plans     (user_id, date);
create index resources_user      on public.resources (user_id);
create index schedules_user_day  on public.schedules (user_id, day);

-- updated_at triggers + RLS (owner-only access) for every table.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'journals', 'plans', 'resources', 'schedules'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_owner', t);
  end loop;
end $$;

-- Lets a signed-in user permanently delete their own account (the "Hapus akun" button in Pengaturan).
-- All their rows go with it: every table references auth.users with ON DELETE CASCADE.
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

-- Private storage for images inserted into journal notes.
-- * Bucket is private; every file lives in a folder named after its owner's user id (<user_id>/<image_id>).
-- * Each user can only read, add and delete files in their own folder.
-- * At most 100 MB per user, files up to 2 MB, only webp / jpeg / png. (The app compresses to ~300 KB.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.note_image_quota_ok() returns boolean
language sql security definer stable
set search_path = public, storage
as $$
  select coalesce(sum((metadata ->> 'size')::bigint), 0) < 100 * 1024 * 1024
  from storage.objects
  where bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text
$$;
revoke all on function public.note_image_quota_ok() from public, anon;
grant execute on function public.note_image_quota_ok() to authenticated;

create policy note_images_select on storage.objects for select to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy note_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text and public.note_image_quota_ok());

create policy note_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
