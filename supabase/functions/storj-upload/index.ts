import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { filename, contentType, folder } = await req.json();
    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: "filename and contentType required" }), { status: 400, headers: CORS });
    }

    const ext = filename.split(".").pop();
    const key = `${folder ?? "uploads"}/${Date.now()}.${ext}`;

    const s3 = new S3Client({
      endpoint: Deno.env.get("STORJ_ENDPOINT")!,
      region: "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get("STORJ_ACCESS_KEY")!,
        secretAccessKey: Deno.env.get("STORJ_SECRET_KEY")!,
      },
      forcePathStyle: true,
    });

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
