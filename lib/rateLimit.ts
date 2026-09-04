import { getSupabaseAdminClient } from "@/lib/supabase";
import { isDevStoreEnabled } from "@/lib/devStore";

export type RateLimitResult = { allowed: boolean; retryAfter: number };

/**
 * Counters live in Postgres rather than in memory, because the app runs as
 * serverless functions: an in-process counter would be per-instance, so an
 * attacker would simply be spread across instances and never hit the limit.
 * The increment happens inside check_rate_limit under a row lock, so concurrent
 * attempts cannot race past it.
 */
const devCounters = new Map<string, { count: number; windowStart: number }>();

export const RATE_LIMITS = {
  adminLogin: { max: 5, windowSeconds: 15 * 60 },
  login: { max: 10, windowSeconds: 15 * 60 },
  signup: { max: 5, windowSeconds: 60 * 60 },
  registration: { max: 15, windowSeconds: 60 * 60 },
  profile: { max: 20, windowSeconds: 60 * 60 },
} as const;

/**
 * Identifies the caller for rate-limiting. Behind Vercel the client address is
 * the first entry of x-forwarded-for; the later entries are proxies and are
 * attacker-controlled, so only the first is used.
 */
export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

export async function checkRateLimit(key: string, limit: { max: number; windowSeconds: number }): Promise<RateLimitResult> {
  if (isDevStoreEnabled()) {
    const now = Date.now();
    const entry = devCounters.get(key);
    if (!entry || now - entry.windowStart >= limit.windowSeconds * 1000) {
      devCounters.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfter: 0 };
    }
    if (entry.count >= limit.max) {
      return { allowed: false, retryAfter: Math.ceil((entry.windowStart + limit.windowSeconds * 1000 - now) / 1000) };
    }
    entry.count += 1;
    return { allowed: true, retryAfter: 0 };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { allowed: true, retryAfter: 0 };

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });

  if (error) {
    // Never lock people out of the site because the limiter itself is broken;
    // log loudly instead so the gap is visible.
    console.error("Rate limit check failed, allowing request", error.message);
    return { allowed: true, retryAfter: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: true, retryAfter: 0 };
  return { allowed: Boolean(row.allowed), retryAfter: Number(row.retry_after ?? 0) };
}

/** Standard 429 with Retry-After, so clients and crawlers back off properly. */
export function tooManyRequests(retryAfter: number, message: string) {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } },
  );
}
