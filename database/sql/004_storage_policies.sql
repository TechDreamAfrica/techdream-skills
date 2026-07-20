-- ============================================================================
-- THE CODING PROFESSIONALS — Storage buckets & policies
-- Buckets must be created via the Supabase Dashboard (Storage → New bucket)
-- or the Management API — they can't be created with plain SQL inserts on
-- managed projects. Create these three buckets first, then run the policies
-- below in the SQL editor.
--
--   avatars      — public bucket   (profile photos)
--   assignments  — private bucket  (student submissions: pdf/zip/docx/images/code)
--   resources    — public bucket   (lesson downloads, course thumbnails)
-- ============================================================================

-- AVATARS: public read, owner can upload/update/delete their own file.
-- Convention: file path is "{user_id}/avatar.ext"
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ASSIGNMENTS: private. Student can read/write their own submissions;
-- the course instructor and admins can read all submissions for grading.
-- Convention: file path is "{assignment_id}/{student_id}/{filename}"
create policy "assignments_owner_read" on storage.objects for select
  using (
    bucket_id = 'assignments' and (
      (storage.foldername(name))[2] = auth.uid()::text
      or is_admin()
      or exists (
        select 1 from assignments a
        where a.id::text = (storage.foldername(name))[1]
        and is_instructor_of(a.course_id)
      )
    )
  );

create policy "assignments_owner_insert" on storage.objects for insert
  with check (bucket_id = 'assignments' and (storage.foldername(name))[2] = auth.uid()::text);

create policy "assignments_owner_delete" on storage.objects for delete
  using (bucket_id = 'assignments' and (storage.foldername(name))[2] = auth.uid()::text);

-- RESOURCES: public read (lesson downloads, thumbnails); only instructors/admins write.
create policy "resources_public_read" on storage.objects for select
  using (bucket_id = 'resources');

create policy "resources_instructor_insert" on storage.objects for insert
  with check (bucket_id = 'resources' and (is_admin() or exists (select 1 from profiles where id = auth.uid() and role = 'instructor')));

create policy "resources_instructor_update" on storage.objects for update
  using (bucket_id = 'resources' and (is_admin() or exists (select 1 from profiles where id = auth.uid() and role = 'instructor')));

create policy "resources_instructor_delete" on storage.objects for delete
  using (bucket_id = 'resources' and (is_admin() or exists (select 1 from profiles where id = auth.uid() and role = 'instructor')));
