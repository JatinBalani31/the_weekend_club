import { cookies } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";
import { getAdminCookieName, isValidAdminSession } from "@/lib/admin";
import { getAllRegistrations } from "@/lib/registrations";
import { getAllEventsAdmin } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = cookies().get(getAdminCookieName())?.value;
  if (!isValidAdminSession(session)) return <AdminLogin />;

  const [registrations, events] = await Promise.all([getAllRegistrations(), getAllEventsAdmin()]);

  return (
    <main className="min-h-screen bg-paper px-5 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <AdminDashboard registrations={registrations} events={events} />
      </div>
    </main>
  );
}
