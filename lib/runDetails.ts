import { eventDateTimeShortFormatter } from "@/lib/dateTime";

export type RunDetailsMessageInput = {
  title: string;
  date: string;
  route_description?: string | null;
  route_url?: string | null;
  route_image_url?: string | null;
};

export function formatRunDetailsMessage(event: RunDetailsMessageInput, attendeeName?: string) {
  const lines = [
    attendeeName ? `Hi ${attendeeName},` : null,
    `Your run details for ${event.title}:`,
    `Run date: ${eventDateTimeShortFormatter.format(new Date(event.date))}`,
    event.route_description ? `Run details:\n${event.route_description}` : null,
    event.route_url ? `Route: ${event.route_url}` : null,
    event.route_image_url ? `Route image: ${event.route_image_url}` : null,
    `Looking forward to running with you!\nthe Weekend Club`,
  ];

  return lines.filter((line): line is string => line !== null).join("\n\n");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function formatRunDetailsEmailHtml(event: RunDetailsMessageInput, attendeeName: string) {
  const content = formatRunDetailsMessage(event, attendeeName)
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const image = event.route_image_url
    ? `<p><img src="${escapeHtml(event.route_image_url)}" alt="Route for ${escapeHtml(event.title)}" style="display:block;max-width:100%;height:auto"></p>`
    : "";
  return `${content}${image}`;
}
