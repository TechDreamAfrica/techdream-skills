-- ============================================================================
-- THE CODING PROFESSIONALS — Wallet top-up + course media
-- Run after 001-005.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Course teaser video (thumbnail image already existed as `courses.thumbnail`)
-- ----------------------------------------------------------------------------
alter table courses add column if not exists teaser_video_url text;

-- ----------------------------------------------------------------------------
-- Payments: distinguish a course purchase from a wallet top-up, and allow
-- course_id to be null for top-ups (a top-up isn't tied to any course).
-- ----------------------------------------------------------------------------
alter table payments alter column course_id drop not null;
alter table payments add column if not exists payment_type text not null default 'course'
  check (payment_type in ('course', 'wallet_topup'));

-- ----------------------------------------------------------------------------
-- WALLETS — one row per student. Balance is only ever changed by:
--   1. the `hubtel-callback` Edge Function (service role, on a confirmed
--      top-up), or
--   2. the `pay_course_with_wallet` function below (SECURITY DEFINER, so it
--      can safely debit a balance and grant enrollment atomically even
--      though it's called directly from the student's browser session).
-- There is deliberately no RLS insert/update policy for plain authenticated
-- users — only SELECT, so a student can see their own balance but never
-- write to it directly.
-- ----------------------------------------------------------------------------
create table if not exists wallets (
  student_id uuid primary key references profiles(id) on delete cascade,
  balance numeric(10,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

alter table wallets enable row level security;

drop policy if exists "wallets_select_own" on wallets;
create policy "wallets_select_own" on wallets for select
  using (student_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- WALLET TRANSACTIONS — an append-only ledger for top-ups, course purchases
-- paid from the wallet, and any future refunds.
-- ----------------------------------------------------------------------------
create type wallet_transaction_type as enum ('topup', 'course_payment', 'refund');

create table if not exists wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  type wallet_transaction_type not null,
  amount numeric(10,2) not null,
  balance_after numeric(10,2) not null,
  reference text,
  course_id uuid references courses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallet_tx_student on wallet_transactions(student_id);

alter table wallet_transactions enable row level security;

drop policy if exists "wallet_tx_select_own" on wallet_transactions;
create policy "wallet_tx_select_own" on wallet_transactions for select
  using (student_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- pay_course_with_wallet — lets a signed-in student pay for a course out of
-- their wallet balance instantly, with no Hubtel redirect. SECURITY DEFINER
-- so it can safely bypass the (intentionally strict) RLS on `enrollments`
-- and `payments` — but only after verifying the balance itself, atomically,
-- inside the same transaction.
-- ----------------------------------------------------------------------------
create or replace function pay_course_with_wallet(p_course_id uuid)
returns jsonb as $$
declare
  v_student_id uuid := auth.uid();
  v_price numeric(10,2);
  v_balance numeric(10,2);
  v_new_balance numeric(10,2);
  v_already_enrolled boolean;
begin
  if v_student_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select coalesce(discount_price, price) into v_price
  from courses where id = p_course_id and status = 'published';

  if v_price is null then
    return jsonb_build_object('success', false, 'error', 'Course not found');
  end if;

  if v_price <= 0 then
    return jsonb_build_object('success', false, 'error', 'This course is free — no payment needed');
  end if;

  select exists(
    select 1 from enrollments where student_id = v_student_id and course_id = p_course_id
  ) into v_already_enrolled;

  if v_already_enrolled then
    return jsonb_build_object('success', false, 'error', 'Already enrolled');
  end if;

  select balance into v_balance from wallets where student_id = v_student_id for update;
  v_balance := coalesce(v_balance, 0);

  if v_balance < v_price then
    return jsonb_build_object('success', false, 'error', 'Insufficient wallet balance', 'balance', v_balance, 'price', v_price);
  end if;

  v_new_balance := v_balance - v_price;

  insert into wallets (student_id, balance, updated_at)
  values (v_student_id, v_new_balance, now())
  on conflict (student_id) do update set balance = v_new_balance, updated_at = now();

  insert into wallet_transactions (student_id, type, amount, balance_after, course_id, reference)
  values (v_student_id, 'course_payment', -v_price, v_new_balance, p_course_id, 'wallet');

  insert into payments (student_id, course_id, amount, currency, status, payment_type, provider_reference)
  values (v_student_id, p_course_id, v_price, 'GHS', 'succeeded', 'course', 'wallet');

  insert into enrollments (student_id, course_id) values (v_student_id, p_course_id);

  insert into notifications (user_id, type, title, body, link)
  select v_student_id, 'course_purchased', 'You''re enrolled!',
         'Paid from your wallet — ' || title,
         '/pages/student/course-player.html?course=' || p_course_id
  from courses where id = p_course_id;

  return jsonb_build_object('success', true, 'newBalance', v_new_balance);
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Curriculum management RLS note: `course_sections` and `lessons` already
-- have instructor/admin write policies from 002_rls_policies.sql
-- (is_instructor_of() or is_admin()) — no changes needed for the new
-- curriculum builder pages, since admins already pass is_admin().
-- ----------------------------------------------------------------------------
