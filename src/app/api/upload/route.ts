import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // required for MinIO
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const PUBLIC_URL = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: "Arquivo ou caminho não informado." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = path.replace(/^\//, "");

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "image/jpeg",
        ACL: "public-read" as any,
      })
    );

    const url = `${PUBLIC_URL}/${BUCKET}/${key}`;
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("Erro no upload S3:", err);
    return NextResponse.json({ error: err.message || "Erro no upload." }, { status: 500 });
  }
}
