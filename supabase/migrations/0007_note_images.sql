-- Private storage for images inserted into journal notes.
-- Run in Supabase Dashboard → SQL Editor (after 0001-0006) BEFORE deploying the matching app version.
--
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
