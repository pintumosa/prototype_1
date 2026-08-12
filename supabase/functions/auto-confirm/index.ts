import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let body;
  try { body = await req.json(); } catch(e) { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: CORS }); }

  const { uid, full_name, phone, email, kyc_type, aadhaar_number, pan_number,
          kyc_url, kyc_key, kyc_back_url, kyc_back_key, pan_url, pan_key } = body;

  if (!uid) return new Response(JSON.stringify({ error: "uid required" }), { status: 400, headers: CORS });

  // SUPABASE_URL is auto-injected by Supabase runtime, SERVICE_ROLE_KEY is our secret
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing env vars", url: !!supabaseUrl, key: !!serviceKey }), { status: 500, headers: CORS });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Confirm email
  const { error: confirmErr } = await admin.auth.admin.updateUserById(uid, { email_confirm: true });
  if (confirmErr) return new Response(JSON.stringify({ error: "confirm: " + confirmErr.message }), { status: 500, headers: CORS });

  // 2. Insert user row (service role bypasses RLS)
  const { error: insertErr } = await admin.from("users").insert({
    uid, full_name: full_name || "", phone: phone || "", email: email || "", kyc_type: kyc_type || "aadhaar",
    aadhaar_number: aadhaar_number || null, pan_number: pan_number || null,
    kyc_url: kyc_url || null, kyc_key: kyc_key || null,
    kyc_back_url: kyc_back_url || null, kyc_back_key: kyc_back_key || null,
    pan_url: pan_url || null, pan_key: pan_key || null,
    kyc_verified: false, chips: 0, created_at: new Date().toISOString()
  });
  if (insertErr) return new Response(JSON.stringify({ error: "insert: " + insertErr.message }), { status: 500, headers: CORS });

  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
