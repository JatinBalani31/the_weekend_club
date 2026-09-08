import type { Metadata } from "next";
import type { Viewport } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Inter } from "next/font/google";
import NavBar from "@/components/NavBar";
import { getAdminCookieName, isValidAdminSession } from "@/lib/admin";
import { getUserCookieName } from "@/lib/userAuth";
import { getSessionUser } from "@/lib/users";
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
  const user = await getSessionUser(cookieStore.get(getUserCookieName())?.value);
  const isAdmin = await isValidAdminSession(cookieStore.get(getAdminCookieName())?.value);

  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} bg-bg font-body text-text antialiased`}
      >
        <div className="flex min-h-screen flex-col pb-[env(safe-area-inset-bottom)]">
          <NavBar isLoggedIn={Boolean(user)} userName={user?.name} isAdmin={isAdmin} />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border px-5 py-8 font-body text-xs font-bold uppercase tracking-[0.16em] text-text-muted sm:px-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-4">
              <span>&copy; {new Date().getFullYear()} {copy.brand.name}. {copy.brand.rights}</span>
              <span>{copy.brand.developedBy}</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
