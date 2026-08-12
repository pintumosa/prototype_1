// Supabase Edge Function: auto-confirm
// Confirms email AND inserts user row into public.users using service role (bypasses RLS).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const body = await req.json();
  const { uid, full_name, phone, email, kyc_type, aadhaar_number, pan_number,
          kyc_url, kyc_key, kyc_back_url, kyc_back_key, pan_url, pan_key } = body;

  if (!uid) return new Response(JSON.stringify({ error: "uid required" }), { status: 400, headers: CORS });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!
  );

  // 1. Confirm email
  const { error: confirmErr } = await admin.auth.admin.updateUserById(uid, { email_confirm: true });
  if (confirmErr) return new Response(JSON.stringify({ error: confirmErr.message }), { status: 500, headers: CORS });

  // 2. Insert user row (service role bypasses RLS)
  const { error: insertErr } = await admin.from("users").insert({
    uid, full_name, phone, email, kyc_type,
    aadhaar_number: aadhaar_number || null,
    pan_number: pan_number || null,
    kyc_url: kyc_url || null, kyc_key: kyc_key || null,
    kyc_back_url: kyc_back_url || null, kyc_back_key: kyc_back_key || null,
    pan_url: pan_url || null, pan_key: pan_key || null,
    kyc_verified: false, chips: 0,
    created_at: new Date().toISOString()
  });
  if (insertErr) return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: CORS });

  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
