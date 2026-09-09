import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 503 });

  // Google matches the redirect_uri against the registered one exactly. Falling
  // back to localhost in production would send people to a dead address and
  // surface as an opaque redirect_uri_mismatch, so say what is actually wrong.
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
    console.error("NEXT_PUBLIC_SITE_URL is unset; Google OAuth cannot build a valid redirect URI.");
    return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get("redirect") ?? "/account";

  const state = crypto.randomBytes(20).toString("hex");
  const statePayload = JSON.stringify({ nonce: state, redirect });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", Buffer.from(statePayload).toString("base64url"));
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/api/auth/google/callback`;
}
