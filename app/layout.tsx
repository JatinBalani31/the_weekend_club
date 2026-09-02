import type { Metadata } from "next";
import type { Viewport } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Inter } from "next/font/google";
import NavBar from "@/components/NavBar";
import { getAdminCookieName, isValidAdminSession } from "@/lib/admin";
import { getUserCookieName, getUserIdFromSessionToken } from "@/lib/userAuth";
import { getUserById } from "@/lib/users";
import copy from "@/content/en.json";
import "./globals.css";

const displayFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
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
        className={`${displayFont.variable} ${bodyFont.variable} bg-bg font-body text-text antialiased`}
      >
        <div className="min-h-screen pb-[env(safe-area-inset-bottom)]">
          <NavBar isLoggedIn={Boolean(user)} userName={user?.name} isAdmin={isAdmin} />
          {children}
        </div>
      </body>
    </html>
  );
}
