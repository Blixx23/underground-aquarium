/**
 * Where tapping a notification should take you.
 *
 * Trophy and bubble notices used to store a link to your public profile by
 * username. That dropped people on the top of their profile, and broke
 * outright once they changed their username. They now go to the page the
 * notice is actually about, which doesn't depend on a username at all.
 */
export function notificationHref(n: { type?: string | null; link: string | null }): string | null {
  if (n.type === "trophy") return "/trophies";
  if (n.type === "bubbles") return "/profile";
  return n.link;
}
