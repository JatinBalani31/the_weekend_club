import { getSupabaseAdminClient } from "@/lib/supabase";

const ROUTE_IMAGE_BUCKET = "route-images";
const ROUTE_IMAGE_PATH_PATTERN = /^runs\/[0-9a-f-]+\.(jpg|png|webp)$/i;

export function getRouteImagePath(value: string | null | undefined) {
  if (!value) return null;
  if (ROUTE_IMAGE_PATH_PATTERN.test(value)) return value;

  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/route-images\/(.+)$/);
    const path = match?.[1] ? decodeURIComponent(match[1]) : null;
    return path && ROUTE_IMAGE_PATH_PATTERN.test(path) ? path : null;
  } catch {
    return null;
  }
}

export async function getSignedRouteImageUrl(value: string | null | undefined, expiresInSeconds = 60 * 60 * 24 * 7) {
  const path = getRouteImagePath(value);
  if (!path) return null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(ROUTE_IMAGE_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    console.error("Unable to sign a route image URL", error);
    return null;
  }
  return data.signedUrl;
}
