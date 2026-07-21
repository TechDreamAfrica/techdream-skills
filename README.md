# The Coding Professionals

A Udemy-style online learning platform built with **HTML5 + Tailwind CSS (CDN) + vanilla JavaScript + Supabase**. No frameworks, no build step — open any `.html` file (served over HTTP, not `file://`) and it runs.

## ✅ Project status: All 5 phases complete + polish pass

### Polish pass (latest)
- ✅ **Wallet top-up:** students can top up a Hubtel-backed wallet (`pages/student/wallet.html`) and pay for courses instantly from their balance instead of redirecting to Hubtel every time — see "Wallet top-up" below.
- ✅ **Full-scale course management:** replaced the old quick-create modal with a proper editor (`pages/admin/course-edit.html`) covering every course field — thumbnail image, teaser/overview video, description, category, instructor, level, language, duration, prerequisites, requirements, price, discount price, and status. Creating a new course now redirects straight into the curriculum builder.
- ✅ **Curriculum builder:** `pages/admin/course-curriculum.html` — add/edit/delete/reorder sections and lessons for a course, with per-lesson video upload, downloadable resources, free-preview toggle, and duration.
- ✅ **Course thumbnail + teaser video everywhere:** course cards (home, browse) show a "▶ Preview" badge when a teaser video exists; the course details page has a play button over the thumbnail that opens the teaser in a modal.
- ✅ **Cloudinary file uploads:** course thumbnails, teaser videos, lesson videos, and lesson resources now upload via Cloudinary's unsigned upload API (`assets/js/cloudinary.js`) instead of Supabase Storage — see "Cloudinary setup" below. (Avatars and assignment submissions are unchanged and still use Supabase Storage.)
- ✅ Currency display standardized to **GHS** everywhere (course cards, checkout, admin payments/dashboard) to match what's actually charged through Hubtel.
- ✅ **Fixed a real bug, not just the symptom:** the shared header (`assets/js/partials.js`) was computing links to Log in / Sign up / Dashboard / Wishlist / Notifications / Profile using the wrong relative depth — they're all under `/pages/`, but the header treated them like root-level pages (`courses.html`, `about.html`, etc). Switched those specific links to absolute root paths (`/pages/login.html`, `/pages/student/dashboard.html`, …) so they resolve correctly no matter which page the header is rendered on.
- ✅ **Fixed the same class of bug in stored notification links:** a notification's `link` column was being written as a path relative to the *page that created it* (e.g. `course-details.html` at root), but read back from pages at a different depth (`pages/student/dashboard.html`), so clicking a notification could 404. Notification links are now written as absolute root paths (`/pages/student/...`) everywhere they're created, and read back as-is.
- ✅ Ran a full static link audit — every `href` in every page was resolved against the actual file tree; 0 broken links remain.
- ✅ Added `privacy-policy.html` and `terms.html`, linked from the footer (new "Legal" column) and from the register page's agreement checkbox.
- ✅ Added the pages the footer always linked to but didn't exist yet: `about.html`, `pricing.html`, `contact.html` (form logs to `activity_logs` — see note below), `faq.html`, `blog.html` (static placeholder posts — see note below).
- ✅ `courses.html` now supports `?price=free` / `?price=paid` in the URL so the pricing page can deep-link into the filter.

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
- **Quiz/exercise/assignment authoring**: `pages/admin/course-curriculum.html` covers sections and lessons (with video/resources) end-to-end, but creating quizzes, quiz questions, coding exercises, and assignments still has to be done directly in the Supabase table editor — there's no dedicated authoring UI for those yet. That's the natural next thing to add if you keep building on this.
- **Email**: verification, password reset, and grading/announcement notifications rely on Supabase Auth's built-in email templates and the in-app `notifications` table — there's no separate transactional email service wired in.
- **Contact form**: there's no dedicated `messages`/`contact_submissions` table yet, so `contact.html` logs submissions into `activity_logs` (readable by admins via the Supabase table editor). Ask for a proper inbox + `admin/contact-submissions.html` page if you want one.
- **Blog**: `blog.html` ships with hardcoded placeholder posts in a JS array at the top of the file — there's no `blog_posts` table or admin editor. Ask for one if you want a real CMS-backed blog.
- **Absolute-path links**: the header, footer, and stored notification links now use root-absolute paths (e.g. `/pages/login.html`) so they resolve correctly regardless of how deep the current page is nested. This assumes the site is served from the domain root (true for `npx serve .`, `python3 -m http.server`, or a normal Vercel/Netlify/Supabase Hosting deploy). If you ever deploy this under a subpath (e.g. `https://example.com/my-app/`), those specific links will need a configurable prefix — flag it if that's your setup.

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a project, and grab your **Project URL** and **anon public key** from *Project Settings → API*.

### 2. Run the SQL
In the Supabase SQL Editor, run these files **in order**:
1. `database/sql/001_schema.sql` — tables, enums, indexes, triggers
2. `database/sql/002_rls_policies.sql` — Row Level Security policies
3. `database/sql/003_seed_data.sql` — categories + default settings
4. `database/sql/004_storage_policies.sql` — storage bucket policies (after creating the buckets — see its comments)
5. `database/sql/005_hubtel_payments.sql` — payment tracking columns + tightened enrollment/payment RLS (needed for the Hubtel integration below)
6. `database/sql/006_wallet_and_media.sql` — wallet + wallet_transactions tables, course teaser video column, `pay_course_with_wallet()` function

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

## Hubtel payment setup

Paid-course checkout runs on [Hubtel's Online Checkout (Collection) API](https://developers.hubtel.com/) — the hosted redirect flow that supports Mobile Money (MTN, Telecel, AirtelTigo), cards, and bank payments. Free courses skip this entirely and enroll instantly.

**Why Edge Functions, not client-side JS:** Hubtel's API is authenticated with a `ClientId`/`ClientSecret` pair that must never be exposed in browser code — anyone could read it from the page source and drain your merchant account. Since this project intentionally has no separate Node/PHP/Django backend, the secrets live in **Supabase Edge Functions** instead (`supabase/functions/`) — small serverless TypeScript functions that are part of Supabase itself, deployed with the Supabase CLI. This is the standard pattern for "static frontend + Supabase" apps that need to call an API with a secret.

### How it works
1. Student clicks **Pay & enroll** (or **Top up** on the Wallet page) → browser calls the `hubtel-initiate` Edge Function (their Supabase session is forwarded automatically).
2. `hubtel-initiate` looks up the course price **server-side** (never trusts a price from the browser), records a `pending` row in `payments`, calls Hubtel's `/items/initiate` endpoint, and returns a `checkoutUrl`.
3. Browser does a full-page redirect to that Hubtel-hosted checkout page — the student pays there.
4. Hubtel calls `hubtel-callback` (a public webhook) server-to-server with the payment result. That function marks the payment `succeeded`/`failed` and, on success:
   - for a **course purchase**, creates the `enrollments` row and a notification;
   - for a **wallet top-up**, credits the student's `wallets.balance` and logs a `wallet_transactions` row —
   all with the service-role key, bypassing RLS.
5. Hubtel also redirects the student's browser back to `pages/student/payment-status.html`, which polls the `payments` table (readable by the student via normal RLS) until it sees `succeeded`/`failed`, then shows the result (with different copy for a top-up vs. a course).

The enrollment/credit is granted by the **webhook**, not the redirect — so it's correct even if the student closes the tab right after paying.

### Wallet top-up
Students can add money to an in-app wallet (`pages/student/wallet.html`) via the same Hubtel checkout flow (`hubtel-initiate` accepts `{ topupAmount }` instead of `{ courseId }`). Once the balance covers a course's price, the checkout modal on `course-details.html` offers **Pay from wallet** — this calls the `pay_course_with_wallet(p_course_id)` Postgres function (added in `006_wallet_and_media.sql`), which is `SECURITY DEFINER` so it can safely verify the balance, debit it, record the transaction, create the payment record, and enroll the student — all atomically, in one round trip, with **no Hubtel redirect needed**. Wallet balances can only ever be credited by the webhook or debited by that function; there's no RLS path for a student to write to `wallets` directly.

### 1. Get Hubtel credentials
Sign up for a Hubtel merchant account at [hubtel.com](https://hubtel.com) (requires business registration docs; approval typically takes a few business days) and create API credentials at [unity.hubtel.com](https://unity.hubtel.com/account/api-accounts-add). You'll need:
- `ClientId` and `ClientSecret` (API credentials)
- Your **Merchant Account Number** (from the Hubtel dashboard)

### 2. Install the Supabase CLI and link your project
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set the required secrets
```bash
supabase secrets set HUBTEL_CLIENT_ID=your_client_id
supabase secrets set HUBTEL_CLIENT_SECRET=your_client_secret
supabase secrets set HUBTEL_MERCHANT_ACCOUNT_NUMBER=your_merchant_account_number
supabase secrets set SITE_URL=https://your-deployed-site.com   # no trailing slash
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available automatically inside every Edge Function — you don't set those yourself.

### 4. Deploy the two functions
```bash
supabase functions deploy hubtel-initiate
supabase functions deploy hubtel-callback --no-verify-jwt
```
The `--no-verify-jwt` flag is required for `hubtel-callback` — Hubtel calls it directly and doesn't send a Supabase session token. (`supabase/config.toml` in this project also documents this in case your CLI version reads it from there instead of the flag.)

### 5. Run the migration
Run `database/sql/005_hubtel_payments.sql` in the SQL Editor if you haven't already (see the SQL run order above) — it adds the `client_reference` column the webhook uses to match a callback back to a payment, and tightens two RLS policies now that real money is involved.

### Testing notes
- **Hubtel has no sandbox environment for Online Checkout** — testing means using real (small) amounts against your live merchant account. Start with a GHS 1–5 test purchase.
- Course prices are treated as **Ghana Cedis (GHS)** when sent to Hubtel — the `payments.currency` column is set to `"GHS"` for every Hubtel transaction regardless of the platform's `settings.site_currency` value. Price your courses in GHS.
- Hubtel does **not** publish a signature-verification scheme for these webhooks (confirmed against their public docs at the time this was built). `hubtel-callback` protects itself instead by only ever acting on a `clientReference` that matches a `pending` payment row it created, and by being idempotent — replaying the same callback twice never double-enrolls anyone. If Hubtel adds webhook signatures later, add verification to `hubtel-callback`.
- Watch the function logs while testing: `supabase functions logs hubtel-callback` — the raw callback payload is logged, which is useful since Hubtel's exact field casing for the callback body isn't pinned down as a strict contract in their docs (the function reads it defensively across a few casings/shapes).

## Cloudinary setup

Course thumbnails, teaser videos, lesson videos, and lesson resources upload directly from the browser to Cloudinary using an **unsigned upload preset** — the same reasoning as the Hubtel Edge Functions applies here in reverse: Cloudinary's unsigned uploads are specifically designed to be safe to call from client-side code with no backend, because they use a preset (not your API secret) to authorize the upload.

### 1. Create a Cloudinary account and an unsigned upload preset
1. Sign up at [cloudinary.com](https://cloudinary.com) — note your **Cloud Name** from the dashboard.
2. Go to **Settings → Upload → Upload presets → Add upload preset**.
3. Set **Signing Mode** to **Unsigned**. Give it a name (e.g. `tcp_unsigned`).
4. Recommended: set a folder, restrict allowed formats, and cap max file size for the resource types you'll accept (images for thumbnails, video for teasers/lessons, raw for PDFs/ZIPs/DOCX resources).

### 2. Configure the client
Open `assets/js/cloudinary.js` and replace:
```js
const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUDINARY_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UNSIGNED_UPLOAD_PRESET";
```
That's the only setup required — no secrets, no Edge Function, since unsigned uploads don't need one.

### What uses Cloudinary vs. Supabase Storage
- **Cloudinary**: course thumbnails, teaser videos, lesson videos, lesson resources (`pages/admin/course-edit.html`, `pages/admin/course-curriculum.html`)
- **Supabase Storage** (unchanged): profile avatars, assignment submissions — these stay where they were since they're either private-by-default (assignments, gated by storage RLS policies) or small enough that Cloudinary wasn't worth the switch.

## Folder structure
```
/assets
  /css        → main.css (design tokens, components, animations)
  /js         → supabase-client.js, auth.js, ui.js, partials.js, student-nav.js,
                admin-nav.js, cloudinary.js
  /images
  /icons
/pages
  register.html, login.html, forgot-password.html, reset-password.html
  /student    → dashboard, courses, player, quizzes, exercises, assignments, live classes,
                certificates, notifications, profile, announcements, wallet,
                payment-status, etc.
  /admin      → dashboard, students, instructors, courses, course-edit, course-curriculum,
                categories, grading, live classes, announcements, enrollments, payments,
                settings
/database
  /sql        → 001_schema.sql, 002_rls_policies.sql, 003_seed_data.sql,
                004_storage_policies.sql, 005_hubtel_payments.sql, 006_wallet_and_media.sql
/supabase
  /functions
    /hubtel-initiate  → starts a Hubtel checkout session (course purchase or wallet top-up)
    /hubtel-callback  → public webhook that confirms payment, grants enrollment or credits wallet
  config.toml         → marks hubtel-callback as not requiring a Supabase JWT
/uploads      → local placeholder; real uploads go to Supabase Storage or Cloudinary
index.html, courses.html, categories.html, course-details.html,
about.html, pricing.html, contact.html, faq.html, blog.html,
privacy-policy.html, terms.html  → root-level marketing/browsing pages
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
- **Payments**: Hubtel's `ClientId`/`ClientSecret` live only as Supabase Edge Function secrets, never in browser-reachable code. Paid-course enrollment can only be granted by the `hubtel-callback` webhook (running with the service-role key) or an admin — `005_hubtel_payments.sql` removes the browser's ability to self-insert an `enrollments` row for anything but a free course, and removes its ability to insert a `payments` row with any status other than `pending`.
