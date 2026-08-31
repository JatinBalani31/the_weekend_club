import type { Metadata } from "next";
import type { Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import NavBar from "@/components/NavBar";
import { getAdminCookieName, isValidAdminSession } from "@/lib/admin";
import { getUserCookieName, getUserIdFromSessionToken } from "@/lib/userAuth";
import { getUserById } from "@/lib/users";
import copy from "@/content/en.json";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: copy.brand.name,
  description: copy.brand.description,
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const userId = getUserIdFromSessionToken(cookieStore.get(getUserCookieName())?.value);
  const user = userId ? await getUserById(userId) : null;
  const isAdmin = isValidAdminSession(cookieStore.get(getAdminCookieName())?.value);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen pb-[env(safe-area-inset-bottom)]">
          <NavBar isLoggedIn={Boolean(user)} userName={user?.name} isAdmin={isAdmin} />
          {children}
        </div>
      </body>
    </html>
  );
}
