/** The kinds of site search results, in the order they're shown. Shared by the server search and the search page. */

export type SiteGroupKey =
  | "people"
  | "help"
  | "listings"
  | "species"
  | "breeding"
  | "stores"
  | "forums"
  | "events"
  | "glossary"
  | "courses";

export const GROUP_LABELS: Record<SiteGroupKey, string> = {
  people: "People",
  help: "Using the site",
  listings: "Classifieds",
  species: "Fish species & care",
  breeding: "Breeding guides",
  stores: "Fish stores",
  forums: "Forums",
  events: "Events",
  glossary: "Glossary",
  courses: "Courses",
};

// People first (searching a name almost always means a member), then real
// answers: fish, care, stores, ads, the community. "How the site works" help
// articles always come last.
export const ORDER: SiteGroupKey[] = ["people", "species", "glossary", "stores", "listings", "forums", "breeding", "events", "courses", "help"];

export function isGroupKey(v: unknown): v is SiteGroupKey {
  return typeof v === "string" && (ORDER as string[]).includes(v);
}
