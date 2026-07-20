-- ============================================================================
-- THE CODING PROFESSIONALS — Core Schema
-- Run in Supabase SQL Editor. Requires pgcrypto/uuid-ossp (enabled by default
-- on Supabase projects).
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
create type user_role as enum ('student', 'instructor', 'admin');
create type course_status as enum ('draft', 'published', 'archived');
create type course_level as enum ('beginner', 'intermediate', 'advanced');
create type submission_status as enum ('pending', 'approved', 'rejected', 'needs_revision');
create type question_type as enum ('single_choice', 'multi_select', 'true_false', 'short_answer');
create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type notification_type as enum (
  'assignment_graded', 'new_lesson', 'course_purchased',
  'live_class_reminder', 'announcement', 'discussion_reply', 'certificate_ready'
);

-- ----------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  fullname text not null,
  email text not null unique,
  phone text,
  avatar text,
  bio text,
  role user_role not null default 'student',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);

-- ----------------------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------------------
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- COURSES
-- ----------------------------------------------------------------------------
create table courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  description text,
  thumbnail text,
  category_id uuid references categories(id) on delete set null,
  instructor_id uuid not null references profiles(id) on delete cascade,
  price numeric(10,2) not null default 0 check (price >= 0),
  discount_price numeric(10,2) check (discount_price >= 0 and discount_price <= price),
  language text default 'English',
  duration_minutes integer default 0,
  level course_level default 'beginner',
  prerequisites text,
  requirements text,
  status course_status not null default 'draft',
  rating_avg numeric(2,1) default 0,
  rating_count integer default 0,
  students_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_courses_category on courses(category_id);
create index idx_courses_instructor on courses(instructor_id);
create index idx_courses_status on courses(status);
create index idx_courses_title_trgm on courses using gin (to_tsvector('english', title));

-- ----------------------------------------------------------------------------
-- COURSE SECTIONS
-- ----------------------------------------------------------------------------
create table course_sections (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_sections_course on course_sections(course_id);

-- ----------------------------------------------------------------------------
-- LESSONS
-- ----------------------------------------------------------------------------
create table lessons (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references course_sections(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  video_url text,
  duration_seconds integer default 0,
  content text,
  resources jsonb default '[]',
  is_preview boolean default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_lessons_section on lessons(section_id);
create index idx_lessons_course on lessons(course_id);

-- ----------------------------------------------------------------------------
-- ENROLLMENTS
-- ----------------------------------------------------------------------------
create table enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  progress_percent numeric(5,2) not null default 0,
  completed_lesson_ids uuid[] not null default '{}',
  last_lesson_id uuid references lessons(id) on delete set null,
  completed_at timestamptz,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);
create index idx_enrollments_student on enrollments(student_id);
create index idx_enrollments_course on enrollments(course_id);

-- ----------------------------------------------------------------------------
-- ASSIGNMENTS + SUBMISSIONS
-- ----------------------------------------------------------------------------
create table assignments (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  section_id uuid references course_sections(id) on delete set null,
  title text not null,
  instructions text,
  max_score integer default 100,
  due_date timestamptz,
  created_at timestamptz not null default now()
);
create index idx_assignments_course on assignments(course_id);

create table assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  file_url text,
  file_type text,
  comment text,
  status submission_status not null default 'pending',
  score integer,
  feedback text,
  graded_by uuid references profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (assignment_id, student_id)
);
create index idx_submissions_assignment on assignment_submissions(assignment_id);
create index idx_submissions_student on assignment_submissions(student_id);

-- ----------------------------------------------------------------------------
-- QUIZZES
-- ----------------------------------------------------------------------------
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  section_id uuid references course_sections(id) on delete set null,
  title text not null,
  time_limit_minutes integer default 0,
  passing_score integer default 70,
  created_at timestamptz not null default now()
);
create index idx_quizzes_course on quizzes(course_id);

create table quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question text not null,
  type question_type not null default 'single_choice',
  options jsonb default '[]',
  correct_answer jsonb not null,
  points integer default 1,
  position integer default 0
);
create index idx_quiz_questions_quiz on quiz_questions(quiz_id);

create table quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  answers jsonb not null default '{}',
  score integer,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index idx_quiz_attempts_quiz on quiz_attempts(quiz_id);
create index idx_quiz_attempts_student on quiz_attempts(student_id);

-- ----------------------------------------------------------------------------
-- CODING EXERCISES
-- ----------------------------------------------------------------------------
create table coding_exercises (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  section_id uuid references course_sections(id) on delete set null,
  title text not null,
  problem_statement text not null,
  instructions text,
  starter_code text default '',
  language text default 'javascript',
  created_at timestamptz not null default now()
);
create index idx_exercises_course on coding_exercises(course_id);

create table exercise_submissions (
  id uuid primary key default uuid_generate_v4(),
  exercise_id uuid not null references coding_exercises(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  is_draft boolean default false,
  feedback text,
  submitted_at timestamptz not null default now()
);
create index idx_exercise_submissions_exercise on exercise_submissions(exercise_id);
create index idx_exercise_submissions_student on exercise_submissions(student_id);

-- ----------------------------------------------------------------------------
-- LIVE CLASSES
-- ----------------------------------------------------------------------------
create table live_classes (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  meeting_link text,
  scheduled_at timestamptz not null,
  duration_minutes integer default 60,
  replay_url text,
  created_at timestamptz not null default now()
);
create index idx_live_classes_course on live_classes(course_id);

create table live_class_attendance (
  id uuid primary key default uuid_generate_v4(),
  live_class_id uuid not null references live_classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (live_class_id, student_id)
);

-- ----------------------------------------------------------------------------
-- DISCUSSIONS
-- ----------------------------------------------------------------------------
create table course_discussions (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  student_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_discussions_course on course_discussions(course_id);

create table discussion_replies (
  id uuid primary key default uuid_generate_v4(),
  discussion_id uuid not null references course_discussions(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_replies_discussion on discussion_replies(discussion_id);

-- ----------------------------------------------------------------------------
-- ANNOUNCEMENTS + NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table announcements (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index idx_announcements_course on announcements(course_id);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id);
create index idx_notifications_unread on notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- CERTIFICATES
-- ----------------------------------------------------------------------------
create table certificates (
  id uuid primary key default uuid_generate_v4(),
  certificate_code text not null unique,
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ----------------------------------------------------------------------------
-- REVIEWS
-- ----------------------------------------------------------------------------
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (course_id, student_id)
);
create index idx_reviews_course on reviews(course_id);

-- ----------------------------------------------------------------------------
-- WISHLIST / BOOKMARKS
-- ----------------------------------------------------------------------------
create table wishlists (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create table bookmarks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

-- ----------------------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------------------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status payment_status not null default 'pending',
  provider_reference text,
  created_at timestamptz not null default now()
);
create index idx_payments_student on payments(student_id);
create index idx_payments_status on payments(status);

-- ----------------------------------------------------------------------------
-- ACTIVITY LOGS + SETTINGS
-- ----------------------------------------------------------------------------
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  meta jsonb default '{}',
  created_at timestamptz not null default now()
);
create index idx_activity_logs_user on activity_logs(user_id);

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_courses_updated_at before update on courses
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- auto-create profile on signup
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, fullname, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'fullname', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
