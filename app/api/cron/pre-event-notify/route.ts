import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as XLSX from "xlsx";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { eventDateTimeShortFormatter as dateFormatter } from "@/lib/dateTime";
import { formatRunDetailsEmailHtml, formatRunDetailsMessage } from "@/lib/runDetails";
import { getSignedRouteImageUrl } from "@/lib/routeImages";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The scheduled workflow calls this every 15 minutes to send event participant
 * lists to the admin and upcoming route details to paid attendees.
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
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ skipped: "Email not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL." });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
  const resend = new Resend(resendApiKey);
  let notified = 0;
  let runDetailsSent = 0;
  let failed = 0;

  if (adminEmail) {
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, date, location")
      .eq("is_active", true)
      .gt("date", now.toISOString())
      .lte("date", windowEnd.toISOString())
      .is("notified_at", null);

    if (eventsError) {
      console.error("Cron: unable to query pre-event notifications", eventsError);
      return NextResponse.json({ error: "Query failed." }, { status: 500 });
    }

    for (const event of events ?? []) {
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("registration_code, seq_number, name, email, phone, strava_handle, charged_price, payment_status, checked_in_at, created_at")
        .eq("event_id", event.id)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: true });

      if (regError) {
        console.error("Cron: unable to load registrations for", event.id, regError);
        failed += 1;
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
        console.error("Cron: unable to send pre-event email for", event.id, emailError);
        failed += 1;
        continue;
      }

      const { error: markError } = await supabase.from("events").update({ notified_at: now.toISOString() }).eq("id", event.id);
      if (markError) {
        console.error("Cron: unable to mark pre-event email as sent for", event.id, markError);
        failed += 1;
        continue;
      }
      notified += 1;
    }
  }

  const runDetailsWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: upcomingRuns, error: upcomingRunsError } = await supabase
    .from("events")
    .select("id, title, date")
    .eq("event_type", "run")
    .gt("date", now.toISOString())
    .lte("date", runDetailsWindowEnd.toISOString());

  if (upcomingRunsError) {
    console.error("Cron: unable to query upcoming run details", upcomingRunsError);
    return NextResponse.json({ error: "Run details query failed.", notified, runDetailsSent, failed: failed + 1 }, { status: 500 });
  }

  const runs = upcomingRuns ?? [];
  const { data: savedRunDetails, error: savedRunDetailsError } = runs.length > 0
    ? await supabase
      .from("event_run_details")
      .select("event_id, route_description, route_url, route_image_path")
      .in("event_id", runs.map((event) => event.id))
    : { data: [], error: null };

  if (savedRunDetailsError) {
    console.error("Cron: unable to load saved run details", savedRunDetailsError);
    return NextResponse.json({ error: "Run details query failed.", notified, runDetailsSent, failed: failed + 1 }, { status: 500 });
  }

  const detailsByEventId = new Map((savedRunDetails ?? []).map((details) => [details.event_id, details]));
  for (const event of runs) {
    const details = detailsByEventId.get(event.id);
    if (!details || (!details.route_description && !details.route_url && !details.route_image_path)) continue;

    const { data: registrations, error: regError } = await supabase
      .from("registrations")
      .select("id, name, email")
      .eq("event_id", event.id)
      .eq("payment_status", "paid")
      .is("run_details_email_sent_at", null);

    if (regError) {
      console.error("Cron: unable to load run attendees for", event.id, regError);
      failed += 1;
      continue;
    }

    const routeImageUrl = details.route_image_path ? await getSignedRouteImageUrl(details.route_image_path) : null;
    if (details.route_image_path && !routeImageUrl) {
      console.error("Cron: unable to create a private route image link for", event.id);
      failed += 1;
      continue;
    }
    const runDetails = {
      ...event,
      route_description: details.route_description,
      route_url: details.route_url,
      route_image_url: routeImageUrl,
    };

    for (const registration of registrations ?? []) {
      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: registration.email,
        subject: `Your run details for ${event.title}`,
        text: formatRunDetailsMessage(runDetails, registration.name),
        html: formatRunDetailsEmailHtml(runDetails, registration.name),
      });

      if (emailError) {
        console.error("Cron: unable to send run details email for", registration.id, emailError);
        failed += 1;
        continue;
      }

      const { data: markedRegistration, error: markError } = await supabase
        .from("registrations")
        .update({ run_details_email_sent_at: now.toISOString() })
        .eq("id", registration.id)
        .is("run_details_email_sent_at", null)
        .select("id");

      if (markError || !markedRegistration?.length) {
        console.error("Cron: unable to mark run details email as sent for", registration.id, markError);
        failed += 1;
        continue;
      }
      runDetailsSent += 1;
    }
  }

  return NextResponse.json({ notified, runDetailsSent, failed }, { status: failed ? 500 : 200 });
}
