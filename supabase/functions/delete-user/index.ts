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

  const { uid } = body;
  if (!uid) return new Response(JSON.stringify({ error: "uid required" }), { status: 400, headers: CORS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not set" }), { status: 500, headers: CORS });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Delete from users table
  const { error: dbErr } = await admin.from("users").delete().eq("uid", uid);
  if (dbErr) return new Response(JSON.stringify({ error: "db: " + dbErr.message }), { status: 500, headers: CORS });

  // Delete from auth
  const { error: authErr } = await admin.auth.admin.deleteUser(uid);
  if (authErr) return new Response(JSON.stringify({ error: "auth: " + authErr.message }), { status: 500, headers: CORS });

  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
