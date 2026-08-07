import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    const uid  = form.get("uid") as string;

    if (!file || !uid) return new Response("Missing file or uid", { status: 400, headers: CORS });

    const s3 = new S3Client({
      region: "us-east-1", // Storj ignores region but SDK requires it
      endpoint: Deno.env.get("STORJ_ENDPOINT"),
      credentials: {
        accessKeyId:     Deno.env.get("STORJ_ACCESS_KEY")!,
        secretAccessKey: Deno.env.get("STORJ_SECRET_KEY")!,
      },
      forcePathStyle: true,
    });

    const bucket = Deno.env.get("STORJ_BUCKET")!;
    const key    = `kyc/${uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key:    key,
      Body:   new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
    }));

    const url = `${Deno.env.get("STORJ_ENDPOINT")}/${bucket}/${key}`;
    return new Response(JSON.stringify({ url, key }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
