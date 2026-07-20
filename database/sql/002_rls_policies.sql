-- ============================================================================
-- THE CODING PROFESSIONALS — Row Level Security
-- Run after 001_schema.sql
-- ============================================================================

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function is_instructor_of(course uuid)
returns boolean as $$
  select exists (
    select 1 from courses where id = course and instructor_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function is_enrolled(course uuid)
returns boolean as $$
  select exists (
    select 1 from enrollments where course_id = course and student_id = auth.uid()
  );
$$ language sql security definer stable;

-- Enable RLS everywhere
alter table profiles enable row level security;
alter table categories enable row level security;
alter table courses enable row level security;
alter table course_sections enable row level security;
alter table lessons enable row level security;
alter table enrollments enable row level security;
alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;
alter table coding_exercises enable row level security;
alter table exercise_submissions enable row level security;
alter table live_classes enable row level security;
alter table live_class_attendance enable row level security;
alter table course_discussions enable row level security;
alter table discussion_replies enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;
alter table certificates enable row level security;
alter table reviews enable row level security;
alter table wishlists enable row level security;
alter table bookmarks enable row level security;
alter table payments enable row level security;
alter table activity_logs enable row level security;
alter table settings enable row level security;

-- PROFILES
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_select_public_instructor" on profiles for select
  using (role = 'instructor');
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid() or is_admin());
create policy "profiles_admin_delete" on profiles for delete
  using (is_admin());

-- CATEGORIES (public read, admin write)
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for insert with check (is_admin());
create policy "categories_admin_update" on categories for update using (is_admin());
create policy "categories_admin_delete" on categories for delete using (is_admin());

-- COURSES
create policy "courses_public_read_published" on courses for select
  using (status = 'published' or instructor_id = auth.uid() or is_admin());
create policy "courses_instructor_insert" on courses for insert
  with check (instructor_id = auth.uid() or is_admin());
create policy "courses_owner_update" on courses for update
  using (instructor_id = auth.uid() or is_admin());
create policy "courses_owner_delete" on courses for delete
  using (instructor_id = auth.uid() or is_admin());

-- COURSE SECTIONS
create policy "sections_read" on course_sections for select
  using (
    exists (select 1 from courses c where c.id = course_id and
      (c.status = 'published' or c.instructor_id = auth.uid() or is_admin()))
  );
create policy "sections_write" on course_sections for insert
  with check (is_instructor_of(course_id) or is_admin());
create policy "sections_update" on course_sections for update
  using (is_instructor_of(course_id) or is_admin());
create policy "sections_delete" on course_sections for delete
  using (is_instructor_of(course_id) or is_admin());

-- LESSONS (preview lessons public, rest require enrollment)
create policy "lessons_read" on lessons for select
  using (
    is_preview = true
    or is_enrolled(course_id)
    or is_instructor_of(course_id)
    or is_admin()
  );
create policy "lessons_write" on lessons for insert
  with check (is_instructor_of(course_id) or is_admin());
create policy "lessons_update" on lessons for update
  using (is_instructor_of(course_id) or is_admin());
create policy "lessons_delete" on lessons for delete
  using (is_instructor_of(course_id) or is_admin());

-- ENROLLMENTS
create policy "enrollments_read_own" on enrollments for select
  using (student_id = auth.uid() or is_instructor_of(course_id) or is_admin());
create policy "enrollments_insert_own" on enrollments for insert
  with check (student_id = auth.uid() or is_admin());
create policy "enrollments_update_own" on enrollments for update
  using (student_id = auth.uid() or is_admin());
create policy "enrollments_admin_delete" on enrollments for delete
  using (is_admin());

-- ASSIGNMENTS
create policy "assignments_read" on assignments for select
  using (is_enrolled(course_id) or is_instructor_of(course_id) or is_admin());
create policy "assignments_write" on assignments for insert
  with check (is_instructor_of(course_id) or is_admin());
create policy "assignments_update" on assignments for update
  using (is_instructor_of(course_id) or is_admin());
create policy "assignments_delete" on assignments for delete
  using (is_instructor_of(course_id) or is_admin());

-- ASSIGNMENT SUBMISSIONS
create policy "submissions_read_own_or_grader" on assignment_submissions for select
  using (
    student_id = auth.uid()
    or is_admin()
    or exists (select 1 from assignments a where a.id = assignment_id and is_instructor_of(a.course_id))
  );
create policy "submissions_insert_own" on assignment_submissions for insert
  with check (student_id = auth.uid());
create policy "submissions_update_own_or_grader" on assignment_submissions for update
  using (
    student_id = auth.uid()
    or is_admin()
    or exists (select 1 from assignments a where a.id = assignment_id and is_instructor_of(a.course_id))
  );

-- QUIZZES / QUESTIONS
create policy "quizzes_read" on quizzes for select
  using (is_enrolled(course_id) or is_instructor_of(course_id) or is_admin());
create policy "quizzes_write" on quizzes for insert with check (is_instructor_of(course_id) or is_admin());
create policy "quizzes_update" on quizzes for update using (is_instructor_of(course_id) or is_admin());
create policy "quizzes_delete" on quizzes for delete using (is_instructor_of(course_id) or is_admin());

create policy "quiz_questions_read" on quiz_questions for select
  using (
    exists (select 1 from quizzes q where q.id = quiz_id and
      (is_enrolled(q.course_id) or is_instructor_of(q.course_id) or is_admin()))
  );
create policy "quiz_questions_write" on quiz_questions for insert
  with check (exists (select 1 from quizzes q where q.id = quiz_id and (is_instructor_of(q.course_id) or is_admin())));
create policy "quiz_questions_update" on quiz_questions for update
  using (exists (select 1 from quizzes q where q.id = quiz_id and (is_instructor_of(q.course_id) or is_admin())));
create policy "quiz_questions_delete" on quiz_questions for delete
  using (exists (select 1 from quizzes q where q.id = quiz_id and (is_instructor_of(q.course_id) or is_admin())));

-- QUIZ ATTEMPTS
create policy "quiz_attempts_read_own" on quiz_attempts for select
  using (student_id = auth.uid() or is_admin());
create policy "quiz_attempts_insert_own" on quiz_attempts for insert
  with check (student_id = auth.uid());
create policy "quiz_attempts_update_own" on quiz_attempts for update
  using (student_id = auth.uid());

-- CODING EXERCISES
create policy "exercises_read" on coding_exercises for select
  using (is_enrolled(course_id) or is_instructor_of(course_id) or is_admin());
create policy "exercises_write" on coding_exercises for insert with check (is_instructor_of(course_id) or is_admin());
create policy "exercises_update" on coding_exercises for update using (is_instructor_of(course_id) or is_admin());
create policy "exercises_delete" on coding_exercises for delete using (is_instructor_of(course_id) or is_admin());

-- EXERCISE SUBMISSIONS
create policy "exercise_submissions_read_own" on exercise_submissions for select
  using (
    student_id = auth.uid()
    or is_admin()
    or exists (select 1 from coding_exercises e where e.id = exercise_id and is_instructor_of(e.course_id))
  );
create policy "exercise_submissions_insert_own" on exercise_submissions for insert
  with check (student_id = auth.uid());
create policy "exercise_submissions_update_own" on exercise_submissions for update
  using (student_id = auth.uid());

-- LIVE CLASSES
create policy "live_classes_read" on live_classes for select
  using (is_enrolled(course_id) or is_instructor_of(course_id) or is_admin());
create policy "live_classes_write" on live_classes for insert with check (is_instructor_of(course_id) or is_admin());
create policy "live_classes_update" on live_classes for update using (is_instructor_of(course_id) or is_admin());
create policy "live_classes_delete" on live_classes for delete using (is_instructor_of(course_id) or is_admin());

create policy "attendance_read_own" on live_class_attendance for select
  using (student_id = auth.uid() or is_admin());
create policy "attendance_insert_own" on live_class_attendance for insert
  with check (student_id = auth.uid());

-- DISCUSSIONS
create policy "discussions_read" on course_discussions for select
  using (is_enrolled(course_id) or is_instructor_of(course_id) or is_admin());
create policy "discussions_insert_enrolled" on course_discussions for insert
  with check (student_id = auth.uid() and is_enrolled(course_id));
create policy "discussions_delete_own_or_admin" on course_discussions for delete
  using (student_id = auth.uid() or is_admin());

create policy "replies_read" on discussion_replies for select
  using (
    exists (select 1 from course_discussions d where d.id = discussion_id and
      (is_enrolled(d.course_id) or is_instructor_of(d.course_id) or is_admin()))
  );
create policy "replies_insert" on discussion_replies for insert
  with check (author_id = auth.uid());
create policy "replies_delete_own_or_admin" on discussion_replies for delete
  using (author_id = auth.uid() or is_admin());

-- ANNOUNCEMENTS
create policy "announcements_read" on announcements for select
  using (
    course_id is null
    or is_enrolled(course_id)
    or is_instructor_of(course_id)
    or is_admin()
  );
create policy "announcements_write" on announcements for insert
  with check (is_admin() or (course_id is not null and is_instructor_of(course_id)));
create policy "announcements_delete" on announcements for delete
  using (is_admin() or created_by = auth.uid());

-- NOTIFICATIONS
create policy "notifications_read_own" on notifications for select
  using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update
  using (user_id = auth.uid());
create policy "notifications_insert_system" on notifications for insert
  with check (true);

-- CERTIFICATES
create policy "certificates_read_own_or_admin" on certificates for select
  using (student_id = auth.uid() or is_admin());
create policy "certificates_insert_system" on certificates for insert
  with check (student_id = auth.uid() or is_admin());

-- REVIEWS
create policy "reviews_public_read" on reviews for select using (true);
create policy "reviews_insert_enrolled" on reviews for insert
  with check (student_id = auth.uid() and is_enrolled(course_id));
create policy "reviews_update_own" on reviews for update using (student_id = auth.uid());
create policy "reviews_delete_own_or_admin" on reviews for delete
  using (student_id = auth.uid() or is_admin());

-- WISHLISTS / BOOKMARKS
create policy "wishlists_own" on wishlists for select using (student_id = auth.uid());
create policy "wishlists_insert_own" on wishlists for insert with check (student_id = auth.uid());
create policy "wishlists_delete_own" on wishlists for delete using (student_id = auth.uid());

create policy "bookmarks_own" on bookmarks for select using (student_id = auth.uid());
create policy "bookmarks_insert_own" on bookmarks for insert with check (student_id = auth.uid());
create policy "bookmarks_delete_own" on bookmarks for delete using (student_id = auth.uid());

-- PAYMENTS
create policy "payments_read_own_or_admin" on payments for select
  using (student_id = auth.uid() or is_admin());
create policy "payments_insert_own" on payments for insert
  with check (student_id = auth.uid());
create policy "payments_admin_update" on payments for update using (is_admin());

-- ACTIVITY LOGS (admin only read, system insert)
create policy "activity_logs_admin_read" on activity_logs for select using (is_admin());
create policy "activity_logs_insert" on activity_logs for insert with check (true);

-- SETTINGS (public read, admin write)
create policy "settings_public_read" on settings for select using (true);
create policy "settings_admin_write" on settings for insert with check (is_admin());
create policy "settings_admin_update" on settings for update using (is_admin());
