// Supabase Edge Function: storj-upload
// Generates a Storj S3-compatible presigned PUT URL for any file upload.
// Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
//   STORJ_ENDPOINT   e.g. https://gateway.storjshare.io
//   STORJ_BUCKET     e.g. winzoindia
//   STORJ_ACCESS_KEY
//   STORJ_SECRET_KEY
//   STORJ_PUBLIC_BASE  e.g. https://link.storjshare.io/s/<access-grant>/winzoindia

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Auth check
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  }

  const { filename, contentType, folder } = await req.json();
  if (!filename || !contentType) {
    return new Response(JSON.stringify({ error: "filename and contentType required" }), { status: 400, headers: CORS });
  }

  const ext = filename.split(".").pop();
  const key = `${folder ?? "uploads"}/${user.id}_${Date.now()}.${ext}`;

  const s3 = new S3Client({
    endpoint: Deno.env.get("STORJ_ENDPOINT")!,
    region: "us-east-1",
    credentials: {
      accessKeyId: Deno.env.get("STORJ_ACCESS_KEY")!,
      secretAccessKey: Deno.env.get("STORJ_SECRET_KEY")!,
    },
    forcePathStyle: true,
  });

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: Deno.env.get("STORJ_BUCKET")!, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  );

  // Presigned GET URL valid for 1 year
  const publicUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: Deno.env.get("STORJ_BUCKET")!, Key: key }),
    { expiresIn: 31536000 }
  );

  return new Response(JSON.stringify({ uploadUrl, publicUrl, key }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
