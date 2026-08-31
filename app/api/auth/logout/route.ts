import { NextResponse } from "next/server";
import { getUserCookieName } from "@/lib/userAuth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(getUserCookieName(), "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
