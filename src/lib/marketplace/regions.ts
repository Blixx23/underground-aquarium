import { supabasePublic } from "@/lib/supabase/public";

export type MarketRegion = {
  id: string;
  state_code: string;
  state_name: string;
  slug: string;
  name: string;
  is_primary: boolean;
  sort_order: number;
};

export type StateGroup = {
  code: string;
  name: string;
  regions: MarketRegion[];
  listingCount: number;
};

/** How many live ads sit in each region, keyed "CA/sacramento". */
export type RegionCounts = Map<string, number>;

const REGION_COLUMNS =
  "id, state_code, state_name, slug, name, is_primary, sort_order";

/** Every region, ordered by state then the curated order inside each state. */
export async function getAllRegions(): Promise<MarketRegion[]> {
  const { data } = await supabasePublic
    .from("market_regions")
    .select(REGION_COLUMNS)
    .order("state_code", { ascending: true })
    .order("sort_order", { ascending: true });

  return (data ?? []) as unknown as MarketRegion[];
}

/** Live-ad counts per region. Reads the listing_region_counts view. */
export async function getRegionCounts(): Promise<RegionCounts> {
  const { data } = await supabasePublic
    .from("listing_region_counts")
    .select("state_code, region_slug, listing_count");

  const counts: RegionCounts = new Map();
  for (const row of (data ?? []) as unknown as {
    state_code: string;
    region_slug: string;
    listing_count: number;
  }[]) {
    counts.set(`${row.state_code}/${row.region_slug}`, row.listing_count);
  }
  return counts;
}

export function countFor(counts: RegionCounts, region: MarketRegion): number {
  return counts.get(`${region.state_code}/${region.slug}`) ?? 0;
}

/** Regions grouped into states, with each state's total live-ad count. */
export async function getStateGroups(): Promise<StateGroup[]> {
  const [regions, counts] = await Promise.all([
    getAllRegions(),
    getRegionCounts(),
  ]);

  const byState = new Map<string, StateGroup>();
  for (const r of regions) {
    let group = byState.get(r.state_code);
    if (!group) {
      group = {
        code: r.state_code,
        name: r.state_name,
        regions: [],
        listingCount: 0,
      };
      byState.set(r.state_code, group);
    }
    group.regions.push(r);
    group.listingCount += countFor(counts, r);
  }

  return [...byState.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** One state's regions, or null if the code isn't a real state. */
export async function getStateGroup(
  stateCode: string
): Promise<StateGroup | null> {
  const code = stateCode.toUpperCase();
  const { data } = await supabasePublic
    .from("market_regions")
    .select(REGION_COLUMNS)
    .eq("state_code", code)
    .order("sort_order", { ascending: true });

  const regions = (data ?? []) as unknown as MarketRegion[];
  if (regions.length === 0) return null;

  const counts = await getRegionCounts();
  return {
    code,
    name: regions[0].state_name,
    regions,
    listingCount: regions.reduce((n, r) => n + countFor(counts, r), 0),
  };
}

/** A single region by its state code and slug, or null. */
export async function getRegion(
  stateCode: string,
  regionSlug: string
): Promise<MarketRegion | null> {
  const { data } = await supabasePublic
    .from("market_regions")
    .select(REGION_COLUMNS)
    .eq("state_code", stateCode.toUpperCase())
    .eq("slug", regionSlug)
    .maybeSingle();

  return (data as unknown as MarketRegion) ?? null;
}

export function stateHref(stateCode: string): string {
  return `/marketplace/${stateCode.toLowerCase()}`;
}

export function regionHref(region: {
  state_code: string;
  slug: string;
}): string {
  return `/marketplace/${region.state_code.toLowerCase()}/${region.slug}`;
}
