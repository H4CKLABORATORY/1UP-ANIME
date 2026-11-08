-- 1UP ANIME: Supabase Storage buckets for community uploads.
-- Run in the Supabase SQL Editor (dashboard > Storage creates the buckets
-- too, but this file keeps the policies in version control).
-- Buckets are PUBLIC for reads (avatars and post media are shown to everyone).
-- Uploads are restricted to the file owner, one file per path, with the same
-- extensions and sizes the old backend enforced (checked client-side too).
-- NOTE: what the old server check did and this file cannot: verify the file
-- exists and its MIME/size server-side before the post is created. That check
-- is replaced by (1) the Storage policy below (owner-only path + extension),
-- (2) client-side type/size validation, and (3) media posts staying
-- `pending` until a moderator approves them (see oneup_community.sql).
-- PHASE 5 enforcement map (comment/post media): the bucket ceiling is
-- 25 MB because the same bucket holds MP4 clips; the 5 MB cap for images
-- and GIF (JPEG/PNG/WebP/GIF) is enforced at the layer the code controls:
-- social-backend.js uploadCommunityFile() and the comunidad.html composer
-- (preview blocker + publish-time check). The bucket enforces the MIME
-- allowlist (JPEG/PNG/WebP/GIF/MP4) and the 25 MB ceiling server-side for
-- every upload, including direct API uploads that bypass the browser.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-uploads', 'post-uploads', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object names keep the site's prefix convention (avatars/... and
-- postUploads/... INSIDE the bucket), so the owner folder is
-- (storage.foldername(name))[2], not [1]: foldername('avatars/<uid>/x.jpg')
-- is {avatars,<uid>} and [1] is the literal prefix. Phase 5 verified the
-- old [1] check could never pass (every upload violated RLS); fixed to [2].

-- Avatars: avatars/<uid>/<random>.<jpg|png|webp>, owner only.
drop policy if exists "1up avatars are public" on storage.objects;
create policy "1up avatars are public" on storage.objects
for select to anon, authenticated using (bucket_id = 'avatars');

drop policy if exists "1up upload own avatar" on storage.objects;
create policy "1up upload own avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~ '^avatars/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,90}\.(jpg|png|webp)$'
);

-- Post media: post-uploads/<uid>/<draft>/media.<jpg|png|webp|gif|mp4>, owner only.
drop policy if exists "1up post media is public" on storage.objects;
create policy "1up post media is public" on storage.objects
for select to anon, authenticated using (bucket_id = 'post-uploads');

drop policy if exists "1up upload own post media" on storage.objects;
create policy "1up upload own post media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'post-uploads'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~ '^postUploads/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,90}/media\.(jpg|png|webp|gif|mp4)$'
);

-- No updates or deletes from the browser on either bucket.
