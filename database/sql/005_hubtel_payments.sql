-- ============================================================================
-- THE CODING PROFESSIONALS — Hubtel payment integration support
-- Run after 001-004. Adds the columns the Hubtel Edge Functions need, an
-- auto-increment trigger for students_count, and tightens two RLS policies
-- now that enrollment can be triggered by real money moving.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Track Hubtel's reference on each payment so the callback (webhook) can
-- match an incoming notification back to the payment that created it.
-- ----------------------------------------------------------------------------
alter table payments add column if not exists client_reference text unique;
create index if not exists idx_payments_client_reference on payments(client_reference);

-- ----------------------------------------------------------------------------
-- Auto-increment courses.students_count whenever a new enrollment lands,
-- instead of relying on application code to do it (and possibly forget).
-- ----------------------------------------------------------------------------
create or replace function increment_course_students_count()
returns trigger as $$
begin
  update courses set students_count = students_count + 1 where id = new.course_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enrollment_increment_students on enrollments;
create trigger trg_enrollment_increment_students
  after insert on enrollments
  for each row execute function increment_course_students_count();

-- ----------------------------------------------------------------------------
-- SECURITY HARDENING — now that a real payment provider is wired up, close
-- two loopholes that were fine for the placeholder flow but aren't once real
-- money (or a real webhook) is involved:
--
-- 1. A student could previously insert an `enrollments` row for ANY course
--    directly from the browser, bypassing payment entirely.
-- 2. A student could previously insert a `payments` row with status
--    'succeeded' directly from the browser.
--
-- Paid-course enrollment now only happens two ways: the Hubtel webhook
-- (Edge Function, runs with the service-role key and bypasses RLS
-- entirely), or an admin. Students can still self-enroll directly in FREE
-- courses (price and discount_price both 0), which needs no payment.
-- ----------------------------------------------------------------------------
drop policy if exists "enrollments_insert_own" on enrollments;
create policy "enrollments_insert_own" on enrollments for insert
  with check (
    is_admin()
    or (
      student_id = auth.uid()
      and exists (
        select 1 from courses c
        where c.id = course_id
        and coalesce(c.discount_price, c.price) = 0
      )
    )
  );

drop policy if exists "payments_insert_own" on payments;
create policy "payments_insert_own" on payments for insert
  with check (student_id = auth.uid() and status = 'pending');
