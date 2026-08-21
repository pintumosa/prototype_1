import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  function makeS3() {
    return new S3Client({
      endpoint: Deno.env.get("STORJ_ENDPOINT")!,
      region: "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get("STORJ_ACCESS_KEY")!,
        secretAccessKey: Deno.env.get("STORJ_SECRET_KEY")!,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  try {
    const body = await req.json();

    // ── Serve file (GET) — fetch from Storj server-side and stream back ──
    if (body.action === "presign-get") {
      const { key } = body;
      if (!key) return new Response(JSON.stringify({ error: "key required" }), { status: 400, headers: CORS });
      const s3 = makeS3();
      const { GetObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3@3");
      const cmd = new GetObjectCommand({ Bucket: Deno.env.get("STORJ_BUCKET")!, Key: key });
      const obj = await s3.send(cmd);
      const bytes = await obj.Body?.transformToByteArray();
      if (!bytes) return new Response(JSON.stringify({ error: "empty file" }), { status: 404, headers: CORS });
      return new Response(bytes, { headers: { ...CORS, "Content-Type": obj.ContentType || "image/jpeg", "Content-Disposition": "inline" } });
    }

    // ── Direct upload (server-side PUT) ──
    if (body.action === "put-object") {
      const { key, content, contentType } = body;
      if (!key || !content) return new Response(JSON.stringify({ error: "key and content required" }), { status: 400, headers: CORS });
      const s3 = makeS3();
      const bytes = new TextEncoder().encode(content);
      await s3.send(new PutObjectCommand({ Bucket: Deno.env.get("STORJ_BUCKET")!, Key: key, Body: bytes, ContentType: contentType || "text/plain" }));
      return new Response(JSON.stringify({ ok: true, key }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // ── Presign upload (PUT) ──
    const { filename, contentType, folder } = body;
    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: "filename and contentType required" }), { status: 400, headers: CORS });
    }

    const ext = filename.split(".").pop();
    const key = `${folder ?? "uploads"}/${Date.now()}.${ext}`;

    const s3 = makeS3();
    const bucket = Deno.env.get("STORJ_BUCKET")!;

    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
    const publicUrl = `${Deno.env.get("STORJ_PUBLIC_BASE")}/${key}`;

    return new Response(JSON.stringify({ uploadUrl, publicUrl, key }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
