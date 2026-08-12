// Supabase Edge Function: auto-confirm
// Immediately confirms a newly registered user's email so they can sign in without email verification.
// Called right after signUp() succeeds.
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set in Supabase dashboard secrets)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const { uid } = await req.json();
  if (!uid) return new Response(JSON.stringify({ error: "uid required" }), { status: 400, headers: CORS });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await admin.auth.admin.updateUserById(uid, { email_confirm: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });

  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
