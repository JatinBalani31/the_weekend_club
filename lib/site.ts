/**
 * Shared community links. Defined once here and imported everywhere they appear
 * (homepage, success page, confirmation email) so a changed invite link is a
 * one-line edit.
 *
 * The WhatsApp invite can be revoked/regenerated from the group's admin settings;
 * if the group is ever reset, update the URL here. The Strava `app.link` URL is a
 * deep link that opens the app on mobile and falls back to web.
 */
export const COMMUNITY_LINKS = {
  whatsapp: "https://chat.whatsapp.com/ECJOGWqQ7Gj9YwMxpwpJhF",
  strava: "https://strava.app.link/fERdAAvG65b",
  instagram: "https://instagram.com/the__weekend__club",
};
