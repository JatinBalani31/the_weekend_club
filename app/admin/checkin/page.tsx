import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminCookieName, isValidAdminSession } from "@/lib/admin";
import CheckInScanner from "@/components/CheckInScanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Check-in | the Weekend Club" };

export default async function CheckInPage() {
  const session = cookies().get(getAdminCookieName())?.value;
  if (!(await isValidAdminSession(session))) redirect("/admin");

  return (
    <main className="min-h-screen bg-bg px-5 py-8 text-text sm:px-10 sm:py-12">
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">the Weekend Club</p>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-[0.01em]">Check-in</h1>
        <p className="mt-2 font-body text-sm text-text-muted">
          Enter a registration code (e.g. TWC-001) or scan the QR code on the attendee&apos;s pass.
        </p>
        <CheckInScanner />
      </div>
    </main>
  );
}
