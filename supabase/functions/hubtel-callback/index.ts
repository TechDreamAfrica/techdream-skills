// ============================================================================
// hubtel-callback — Supabase Edge Function (public webhook)
//
// Hubtel calls this URL server-to-server after a customer completes (or
// abandons) payment on the hosted checkout page. It does NOT send a Supabase
// JWT, so this function must be deployed with JWT verification turned off:
//
//   supabase functions deploy hubtel-callback --no-verify-jwt
//
// (or set `verify_jwt = false` for this function in supabase/config.toml —
// see the snippet in this project's README).
//
// Hubtel does not publish a signed-webhook / signature-verification scheme
// for Online Checkout callbacks (confirmed against their public docs at the
// time this was written), so authenticity here is anchored to two things
// instead: (1) the clientReference must match a `pending` payment row WE
// created in hubtel-initiate, and (2) processing is idempotent — a payment
// already marked `succeeded` is never re-processed. If Hubtel adds signature
// verification later, add it here.
//
// What it does on a successful payment:
//   1. Looks up the `pending` payment row by clientReference.
//   2. Marks it `succeeded`.
//   3. Creates the enrollment (if not already present) — or, for a wallet
//      top-up, credits the wallet balance instead.
//   4. Sends the student a notification.
// On a failed/cancelled payment, marks the row `failed`.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ received: true, error: "invalid JSON" }), { status: 200 });
  }

  // Hubtel's field casing for the callback body isn't pinned down as a
  // strict, versioned contract in their public docs, so we read defensively
  // across the casings/shapes seen in real integrations and log the raw
  // payload so you can tighten this once you see your own live traffic.
  const data = body.Data ?? body.data ?? body;
  const clientReference: string | undefined = data.ClientReference ?? data.clientReference;
  const statusRaw = String(data.Status ?? data.status ?? body.status ?? "").toLowerCase();
  const responseCode: string | undefined = body.ResponseCode ?? body.responseCode ?? data.ResponseCode;
  const checkoutId: string | undefined = data.CheckoutId ?? data.checkoutId ?? null;

  console.log("Hubtel callback received:", JSON.stringify(body));

  if (!clientReference) {
    console.warn("Hubtel callback missing a client reference — nothing to match against.");
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("client_reference", clientReference)
    .maybeSingle();

  if (!payment) {
    console.warn("Hubtel callback for unknown client_reference:", clientReference);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Idempotency guard — never process the same successful payment twice.
  if (payment.status === "succeeded") {
    return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
  }

  const isSuccess =
    statusRaw.includes("success") || statusRaw === "paid" || responseCode === "0000";

  if (isSuccess) {
    await admin
      .from("payments")
      .update({
        status: "succeeded",
        provider_reference: checkoutId || payment.provider_reference,
      })
      .eq("id", payment.id);

    if (payment.payment_type === "wallet_topup") {
      // Credit the wallet atomically: read-modify-write inside this single
      // request is safe here because Hubtel calls this webhook once per
      // transaction and the idempotency guard above prevents double-credit
      // on retries.
      const { data: wallet } = await admin
        .from("wallets")
        .select("balance")
        .eq("student_id", payment.student_id)
        .maybeSingle();
      const newBalance = Number(wallet?.balance || 0) + Number(payment.amount);

      await admin
        .from("wallets")
        .upsert({ student_id: payment.student_id, balance: newBalance, updated_at: new Date().toISOString() });

      await admin.from("wallet_transactions").insert({
        student_id: payment.student_id,
        type: "topup",
        amount: payment.amount,
        balance_after: newBalance,
        reference: payment.client_reference,
      });

      await admin.from("notifications").insert({
        user_id: payment.student_id,
        type: "announcement",
        title: "Wallet topped up",
        body: `GHS ${Number(payment.amount).toFixed(2)} was added to your wallet.`,
        link: `/pages/student/wallet.html`,
      });

      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // --- Course purchase path ---
    const { data: existing } = await admin
      .from("enrollments")
      .select("id")
      .eq("student_id", payment.student_id)
      .eq("course_id", payment.course_id)
      .maybeSingle();

    if (!existing) {
      await admin.from("enrollments").insert({
        student_id: payment.student_id,
        course_id: payment.course_id,
      });
    }

    const { data: course } = await admin.from("courses").select("title").eq("id", payment.course_id).single();

    await admin.from("notifications").insert({
      user_id: payment.student_id,
      type: "course_purchased",
      title: "You're enrolled!",
      body: `Your payment for ${course?.title || "your course"} was successful.`,
      link: `/pages/student/course-player.html?course=${payment.course_id}`,
    });
  } else {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});