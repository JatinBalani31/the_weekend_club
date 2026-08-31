import { NextResponse } from "next/server";
import { getAdminCookieName, getAdminPendingCookieName } from "@/lib/admin";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set(getAdminCookieName(), "", { httpOnly: true, expires: new Date(0), path: "/" });
  response.cookies.set(getAdminPendingCookieName(), "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}