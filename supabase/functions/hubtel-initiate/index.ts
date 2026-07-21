// ============================================================================
// hubtel-initiate — Supabase Edge Function
//
// Called from the browser (course-details.html) via supabase.functions.invoke,
// which automatically forwards the signed-in student's access token. This
// function is the ONLY place Hubtel's ClientId/ClientSecret ever touch —
// they live as Supabase secrets, never in client-side JS.
//
// What it does:
//   1. Verifies the caller is a signed-in student (via their JWT).
//   2. Looks up the course + price server-side (never trusts a price the
//      browser might send).
//   3. Records a `pending` row in `payments` with a unique clientReference.
//   4. Calls Hubtel's Online Checkout "initiate" endpoint.
//   5. Returns the checkoutUrl for the browser to redirect to.
//
// Deploy:
//   supabase functions deploy hubtel-initiate
//
// Required secrets (see README "Hubtel setup" section for how to set these):
//   HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_MERCHANT_ACCOUNT_NUMBER,
//   SITE_URL (e.g. https://your-domain.com — no trailing slash)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const HUBTEL_CLIENT_ID = Deno.env.get("HUBTEL_CLIENT_ID")!;
const HUBTEL_CLIENT_SECRET = Deno.env.get("HUBTEL_CLIENT_SECRET")!;
const HUBTEL_MERCHANT_ACCOUNT_NUMBER = Deno.env.get("HUBTEL_MERCHANT_ACCOUNT_NUMBER")!;
const SITE_URL = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET || !HUBTEL_MERCHANT_ACCOUNT_NUMBER || !SITE_URL) {
      return json({ error: "Payments aren't configured yet. Missing Hubtel secrets or SITE_URL." }, 500);
    }

    // --- Identify the caller from their JWT (never trust a client-sent user id) ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const user = userData.user;

    const { courseId, topupAmount } = await req.json().catch(() => ({}));
    if (!courseId && !topupAmount) return json({ error: "courseId or topupAmount is required" }, 400);

    // --- Service-role client for privileged reads/writes (bypasses RLS) ---
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let amount: number;
    let description: string;
    let course: { id: string; title: string; slug: string } | null = null;
    let paymentType: "course" | "wallet_topup";

    if (topupAmount) {
      amount = Number(topupAmount);
      if (!(amount > 0)) return json({ error: "Enter an amount greater than 0." }, 400);
      if (amount > 10000) return json({ error: "That amount is too large for a single top-up." }, 400);
      paymentType = "wallet_topup";
      description = "Wallet top-up — The Coding Professionals";
    } else {
      const { data: courseRow, error: courseErr } = await admin
        .from("courses")
        .select("id, title, slug, price, discount_price, status")
        .eq("id", courseId)
        .single();
      if (courseErr || !courseRow) return json({ error: "Course not found" }, 404);
      if (courseRow.status !== "published") return json({ error: "This course isn't available for purchase." }, 400);

      amount = courseRow.discount_price != null ? Number(courseRow.discount_price) : Number(courseRow.price);
      if (!(amount > 0)) return json({ error: "This course is free — no payment needed, enroll directly." }, 400);

      const { data: existingEnrollment } = await admin
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (existingEnrollment) return json({ error: "You're already enrolled in this course." }, 400);

      course = courseRow;
      paymentType = "course";
      description = `${courseRow.title} — The Coding Professionals`.slice(0, 255);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("fullname, email, phone")
      .eq("id", user.id)
      .single();

    // Hubtel requires clientReference to be non-empty and max 32 characters.
    const clientReference = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

    const { error: insertErr } = await admin.from("payments").insert({
      student_id: user.id,
      course_id: course?.id ?? null,
      amount,
      currency: "GHS",
      status: "pending",
      payment_type: paymentType,
      client_reference: clientReference,
    });
    if (insertErr) return json({ error: "Could not start payment: " + insertErr.message }, 500);

    const returnUrl =
      paymentType === "wallet_topup"
        ? `${SITE_URL}/pages/student/payment-status.html?ref=${clientReference}&type=topup`
        : `${SITE_URL}/pages/student/payment-status.html?ref=${clientReference}`;
    const cancellationUrl =
      paymentType === "wallet_topup"
        ? `${SITE_URL}/pages/student/wallet.html?payment=cancelled`
        : `${SITE_URL}/course-details.html?slug=${course?.slug}&payment=cancelled`;

    const hubtelAuth = "Basic " + btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);
    const hubtelRes = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: hubtelAuth },
      body: JSON.stringify({
        totalAmount: amount,
        description,
        callbackUrl: `${SUPABASE_URL}/functions/v1/hubtel-callback`,
        returnUrl,
        cancellationUrl,
        merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT_NUMBER,
        clientReference,
        payeeName: profile?.fullname || "",
        payeeEmail: profile?.email || user.email || "",
        payeeMobileNumber: profile?.phone || "",
      }),
    });

    const hubtelData = await hubtelRes.json().catch(() => ({}));

    if (hubtelData?.responseCode !== "0000" || !hubtelData?.data?.checkoutUrl) {
      await admin.from("payments").update({ status: "failed" }).eq("client_reference", clientReference);
      console.error("Hubtel initiate failed:", JSON.stringify(hubtelData));
      return json({ error: hubtelData?.message || "Hubtel couldn't start this payment. Please try again." }, 502);
    }

    await admin
      .from("payments")
      .update({ provider_reference: hubtelData.data.checkoutId })
      .eq("client_reference", clientReference);

    return json({ checkoutUrl: hubtelData.data.checkoutUrl, clientReference });
  } catch (err) {
    console.error("hubtel-initiate error:", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});