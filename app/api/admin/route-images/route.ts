import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
const ROUTE_IMAGE_BUCKET = "route-images";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", { extension: "jpg", matches: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ["image/png", { extension: "png", matches: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ["image/webp", { extension: "webp", matches: (bytes: Buffer) => bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" }],
]);

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!/^runs\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(path)) {
    return NextResponse.json({ error: "Invalid route image." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });

  const { data, error } = await supabase.storage.from(ROUTE_IMAGE_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data) {
    console.error("Unable to create a signed route image URL", error);
    return NextResponse.json({ error: "Could not open the route image." }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl });
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Route images must be smaller than 5 MB." }, { status: 400 });
  }

  const imageType = IMAGE_TYPES.get(file.type);
  if (!imageType) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!imageType.matches(bytes)) return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 400 });

  const path = `runs/${crypto.randomUUID()}.${imageType.extension}`;
  const { error } = await supabase.storage.from(ROUTE_IMAGE_BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("Unable to upload route image", error);
    return NextResponse.json({ error: "Could not upload the route image." }, { status: 500 });
  }

  const { data: signedImage, error: signedImageError } = await supabase.storage
    .from(ROUTE_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signedImageError || !signedImage) {
    console.error("Unable to create a signed URL for uploaded route image", signedImageError);
    return NextResponse.json({ error: "Image uploaded but could not be previewed. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ path, previewUrl: signedImage.signedUrl }, { status: 201 });
}
