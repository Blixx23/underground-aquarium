/**
 * Underground Aquarium is the resource, not a signpost to someone else's
 * site. Event descriptions can't carry links; the database strips any that
 * slip through, and the forms catch them first with a friendly message.
 */
const LINK_RE =
  /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|org|net|io|co|us|info|biz|shop|store|app|site|online|live|events?|club|gg|ly|me|tv)\b(\/\S*)?/i;

export function containsLink(text: string): boolean {
  // Mentioning us is fine.
  return LINK_RE.test(text.replace(/(https?:\/\/)?(www\.)?undergroundaquarium\.com\S*/gi, ""));
}

export const NO_LINKS_MESSAGE =
  "Links aren't allowed in event descriptions. Put all the details right here on Underground Aquarium.";
