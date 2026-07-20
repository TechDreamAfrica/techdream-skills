# The Coding Professionals

A Udemy-style online learning platform built with **HTML5 + Tailwind CSS (CDN) + vanilla JavaScript + Supabase**. No frameworks, no build step — open any `.html` file (served over HTTP, not `file://`) and it runs.

## ✅ Project status: All 5 phases complete

The full platform is built. Summary by phase:

**Phase 1** — foundation: full folder structure, complete SQL schema (25 tables), full RLS policy set, seed data, Supabase client + JS libraries (auth, toasts, modals, confirm dialogs, skeletons, empty states), shared header/footer, landing page, full auth flow.

**Phase 2** — browsing & enrollment: `courses.html` (search/filter/pagination), `categories.html`, `course-details.html` (curriculum, reviews, wishlist, enroll + payment-placeholder checkout), student dashboard/my-courses/wishlist/bookmarks, shared student sidebar.

**Phase 3** — learning & assessment: `course-player.html` (video, notes, resources, discussion, progress, auto-certificate), `quizzes.html`/`quiz-attempt.html` (timed, auto-scored), `exercises.html`/`exercise-workspace.html` (code editor, draft/submit, feedback), `assignments.html`/`assignment-submit.html` (file upload to Storage), storage bucket policies.

**Phase 4** — admin dashboard: `admin/dashboard.html` (Chart.js analytics), `admin/students.html`, `admin/instructors.html`, `admin/courses.html`, `admin/categories.html`, `admin/grading.html` (assignment + exercise review queue), shared admin sidebar.

**Phase 5 (final)** — everything else:
- ✅ `pages/student/live-classes.html` — upcoming (with join + countdown) and past (with replay) live classes
- ✅ `pages/student/certificates.html` — earned certificates with a printable/PDF-able certificate view (`window.print()`)
- ✅ `pages/student/notifications.html` — full notification history, per-item mark-read, mark-all-read
- ✅ `pages/student/profile.html` — edit name/phone/bio, avatar upload to Supabase Storage, change password
- ✅ `pages/student/announcements.html` — platform-wide + per-course announcements
- ✅ Review submission — "Write a review" on `course-details.html` for enrolled students (star picker + comment), inline edit of their own review
- ✅ `pages/admin/live-classes.html` — schedule classes, add replay links
- ✅ `pages/admin/announcements.html` — publish platform-wide or per-course announcements
- ✅ `pages/admin/enrollments.html` — searchable list of every enrollment with progress
- ✅ `pages/admin/payments.html` — transaction table + revenue/status stat cards
- ✅ `pages/admin/settings.html` — site name, currency, platform fee %, support email, maintenance mode (writes to the `settings` table)

Every link referenced anywhere in the app (header, sidebars, course player, dashboard) now resolves to a real page.

### ⚠️ Known limitations (by design, flagged for a production hardening pass)
- **Quiz answers**: `quiz_questions.correct_answer` is readable by enrolled students since grading happens client-side. Move grading into a Supabase Edge Function or Postgres RPC before real use.
- **User deletion**: admin "Delete" on a student/instructor only removes their `profiles` row (safe from the browser with the anon key). Full `auth.users` deletion needs the service-role key from a trusted backend (Edge Function) — intentionally not exposed to client-side code.
- **Payments**: the checkout modal is a placeholder — it records a `succeeded` payment immediately with no real payment provider involved. Swap in Stripe/Paystack/Flutterwave via their JS SDK + a webhook (Edge Function) to mark `payments.status` from server-verified events before going live.
- **Course/curriculum authoring**: admins can create a course shell (title, category, price, level) from `admin/courses.html`, but building out sections/lessons/quizzes/exercises/assignments within a course currently has to be done directly in the Supabase table editor — there's no dedicated curriculum-builder UI. That's the natural next thing to add if you keep building on this.
- **Email**: verification, password reset, and grading/announcement notifications rely on Supabase Auth's built-in email templates and the in-app `notifications` table — there's no separate transactional email service wired in.

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a project, and grab your **Project URL** and **anon public key** from *Project Settings → API*.

### 2. Run the SQL
In the Supabase SQL Editor, run these files **in order**:
1. `database/sql/001_schema.sql` — tables, enums, indexes, triggers
2. `database/sql/002_rls_policies.sql` — Row Level Security policies
3. `database/sql/003_seed_data.sql` — categories + default settings

### 3. Configure the client
Open `assets/js/supabase-client.js` and replace:
```js
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

### 4. Enable email auth
In Supabase Dashboard → Authentication → Providers, make sure **Email** is enabled. For local testing you can disable "Confirm email" so you can log in immediately after registering.

### 5. Create your first admin
Register a normal account through the app, then in the SQL Editor run:
```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

### 6. Serve the site
Any static file server works — do not open via `file://`, since `fetch`/CORS and Supabase auth redirects need a real origin.
```bash
npx serve .
# or
python3 -m http.server 8080
```

## Folder structure
```
/assets
  /css        → main.css (design tokens, components, animations)
  /js         → supabase-client.js, auth.js, ui.js, partials.js
  /images
  /icons
/pages
  register.html, login.html, forgot-password.html, reset-password.html
  /student    → (phase 2+) dashboard, courses, player, etc.
  /admin      → (phase 4+) dashboard, management screens
/database
  /sql        → 001_schema.sql, 002_rls_policies.sql, 003_seed_data.sql
/uploads      → local placeholder; real uploads go to Supabase Storage
index.html    → landing page
```

## Design system
- Accent: `#A435F0` (purple), no gradients, white background, dark gray/black text
- Fonts: **Space Grotesk** (headings) + **Inter** (body), loaded from Google Fonts
- Components live in `assets/css/main.css` as `.tcp-*` classes (`.tcp-btn-primary`, `.tcp-card`, `.tcp-input`, `.tcp-badge`) to keep markup readable
- `assets/js/ui.js` exposes `tcpToast()`, `tcpModal()`, `tcpConfirm()`, `tcpSkeletonCards()`, `tcpEmptyState()` — use these instead of writing one-off UI each time

## Security notes
- All data access is enforced by **Row Level Security** — the anon key alone can't bypass it
- Passwords are handled entirely by Supabase Auth (bcrypt-hashed, never touches your tables)
- File uploads (assignments, avatars) should go to Supabase Storage buckets with their own RLS-equivalent storage policies (added in Phase 3)
