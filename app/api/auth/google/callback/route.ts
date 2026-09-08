import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { findOrCreateGoogleUser } from "@/lib/users";
import { createUserSessionToken, getUserCookieName } from "@/lib/userAuth";

type GoogleTokenResponse = { access_token?: string; id_token?: string };
type GoogleUserInfo = { sub?: string; email?: string; name?: string; picture?: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam || !code || !stateParam) {
    return NextResponse.redirect(new URL("/login?error=google_denied", siteUrl()));
  }

  let statePayload: { nonce: string; redirect: string };
  try {
    statePayload = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid_state", siteUrl()));
  }

  const cookieStore = request.headers.get("cookie") ?? "";
  const storedNonce = parseCookie(cookieStore, "google_oauth_state");
  if (!storedNonce || !timingSafeEqual(storedNonce, statePayload.nonce)) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", siteUrl()));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=not_configured", siteUrl()));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${siteUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=token_exchange", siteUrl()));
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/login?error=no_token", siteUrl()));
  }

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(new URL("/login?error=userinfo_failed", siteUrl()));
  }

  const googleUser = (await userInfoRes.json()) as GoogleUserInfo;
  if (!googleUser.sub || !googleUser.email) {
    return NextResponse.redirect(new URL("/login?error=missing_profile", siteUrl()));
  }

  const { user, needsPhone } = await findOrCreateGoogleUser({
    googleId: googleUser.sub,
    email: googleUser.email,
    name: googleUser.name ?? googleUser.email.split("@")[0],
  });

  if (needsPhone && user) {
    const params = new URLSearchParams({
      google: "1",
      userId: user.id,
      name: user.name,
      email: user.email,
      redirect: statePayload.redirect,
    });
    const response = NextResponse.redirect(new URL(`/signup/complete?${params}`, siteUrl()));
    response.cookies.delete("google_oauth_state");
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=account_failed", siteUrl()));
  }

  const token = createUserSessionToken(user.id);
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=session_failed", siteUrl()));
  }

  const redirectTo = statePayload.redirect || "/account";
  const response = NextResponse.redirect(new URL(redirectTo, siteUrl()));
  response.cookies.set(getUserCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.delete("google_oauth_state");
  return response;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function parseCookie(header: string, name: string) {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1] ?? null;
}

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}
