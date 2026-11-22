/**
 * The site's founder. Shown with a small "Founder" tag next to his name in
 * the forums, so visitors know the guide threads come from the site itself.
 * Matched by username (lowercased) so it works anywhere a username is known.
 */
const FOUNDER_USERNAMES = new Set(["chris_lewis", "salmon868"]);

export function isFounder(username: string | null | undefined): boolean {
  return Boolean(username && FOUNDER_USERNAMES.has(username.toLowerCase()));
}
