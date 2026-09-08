import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as XLSX from "xlsx";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { eventDateTimeShortFormatter as dateFormatter } from "@/lib/dateTime";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Vercel Cron calls this every 15 minutes. For every event starting within the
 * next 30 minutes that hasn't been notified yet, it sends an Excel participant
 * list to the admin email.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ skipped: "Supabase not configured." });

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!resendApiKey || !fromEmail || !adminEmail) {
    return NextResponse.json({ skipped: "Email not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and ADMIN_EMAIL." });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, date, location")
    .eq("is_active", true)
    .gt("date", now.toISOString())
    .lte("date", windowEnd.toISOString())
    .is("notified_at", null);

  if (eventsError) {
    console.error("Cron: unable to query events", eventsError);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  const resend = new Resend(resendApiKey);
  let notified = 0;

  for (const event of events) {
    const { data: registrations, error: regError } = await supabase
      .from("registrations")
      .select("registration_code, seq_number, name, email, phone, strava_handle, charged_price, payment_status, checked_in_at, created_at")
      .eq("event_id", event.id)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: true });

    if (regError) {
      console.error("Cron: unable to load registrations for", event.id, regError);
      continue;
    }

    const rows = (registrations ?? []).map((r, i) => ({
      "#": r.seq_number ?? i + 1,
      "Reg Code": r.registration_code ?? "",
      "Name": r.name,
      "Email": r.email,
      "Phone": r.phone,
      "Strava": r.strava_handle ?? "",
      "Amount (INR)": r.charged_price ?? 0,
      "Payment": r.payment_status,
      "Registered": dateFormatter.format(new Date(r.created_at)),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Participants");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const eventDate = dateFormatter.format(new Date(event.date));
    const fileName = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-participants.xlsx`;

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `Participant list: ${event.title} — ${rows.length} registered`,
      text: [
        `${event.title}`,
        `Date: ${eventDate}`,
        `Location: ${event.location}`,
        ``,
        `${rows.length} registered participant${rows.length !== 1 ? "s" : ""}.`,
        `The full list is attached as an Excel file.`,
        ``,
        `— the Weekend Club`,
      ].join("\n"),
      attachments: [{ filename: fileName, content: buffer }],
    });

    if (emailError) {
      console.error("Cron: unable to send email for", event.id, emailError);
      continue;
    }

    await supabase.from("events").update({ notified_at: now.toISOString() }).eq("id", event.id);
    notified += 1;
  }

  return NextResponse.json({ notified });
}
