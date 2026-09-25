/**
 * Common aquarium sizes, each with its own guide page at
 * /tank-builder/<n>-gallon. Dimensions are the usual US glass footprint
 * (outside, in inches, length x width x height). Brands vary by a little.
 */
export type TankSize = {
  gallons: number;
  slug: string;
  dims: [number, number, number];
  /** Other common shapes sold under the same size. */
  alt?: string;
  blurb: string;
};

export const TANK_SIZES: TankSize[] = [
  {
    gallons: 5,
    slug: "5-gallon",
    dims: [16, 8, 10],
    blurb: "A nano tank. Great for a single betta, a shrimp colony or a small group of the tiniest fish.",
  },
  {
    gallons: 10,
    slug: "10-gallon",
    dims: [20, 10, 12],
    blurb: "The classic starter tank. Small enough for a desk, but too small for most schooling fish to really swim.",
  },
  {
    gallons: 15,
    slug: "15-gallon",
    dims: [24, 12, 12],
    blurb: "A 2-foot tank with room for a proper nano community: a small school, a bottom crew and shrimp.",
  },
  {
    gallons: 20,
    slug: "20-gallon",
    dims: [24, 12, 16],
    alt: '20 long: 30" x 12" x 12", which gives fish more swimming length',
    blurb: "The size most people wish they had started with. Enough water to stay stable and room for a real community.",
  },
  {
    gallons: 29,
    slug: "29-gallon",
    dims: [30, 12, 18],
    blurb: "A very popular community tank. Tall enough for angelfish-shaped fish and long enough for active schools.",
  },
  {
    gallons: 40,
    slug: "40-gallon",
    dims: [36, 18, 16],
    alt: '40 breeder. A 40 long is 48" x 12" x 16"',
    blurb: "The 40 breeder's wide footprint gives bottom dwellers and territorial fish lots of floor space.",
  },
  {
    gallons: 55,
    slug: "55-gallon",
    dims: [48, 13, 21],
    blurb: "The 4-foot classic. Opens the door to bigger schools, gouramis, rainbowfish and many cichlids.",
  },
  {
    gallons: 75,
    slug: "75-gallon",
    dims: [48, 18, 21],
    blurb: "Same length as a 55 but much deeper front to back, which makes aquascaping and territories far easier.",
  },
  {
    gallons: 90,
    slug: "90-gallon",
    dims: [48, 18, 24],
    blurb: "A tall 4-foot tank with lots of water volume for larger centerpiece fish.",
  },
  {
    gallons: 125,
    slug: "125-gallon",
    dims: [72, 18, 21],
    blurb: "A 6-foot tank. Room for big schools, large cichlids, clown loaches and plecos that need the length.",
  },
  {
    gallons: 150,
    slug: "150-gallon",
    dims: [72, 18, 28],
    blurb: "A tall 6-footer with serious volume for big, messy fish.",
  },
  {
    gallons: 180,
    slug: "180-gallon",
    dims: [72, 24, 25],
    blurb: "A 6-foot tank that's 2 feet deep. Big fish get room to turn around, and big aquascapes get room to breathe.",
  },
];

export function sizeBySlug(slug: string): TankSize | undefined {
  return TANK_SIZES.find((t) => t.slug === slug);
}

/** The guide page closest to a given number of gallons. */
export function nearestSize(gallons: number): TankSize | undefined {
  if (!(gallons > 0)) return undefined;
  return [...TANK_SIZES].sort((a, b) => Math.abs(a.gallons - gallons) - Math.abs(b.gallons - gallons))[0];
}

/** Rough filled weight: water is 8.34 lb/gal, and glass, gravel and decor bring it to ~10 lb/gal. */
export function filledWeightLb(gallons: number): number {
  return Math.round((gallons * 10) / 10) * 10;
}

export function waterWeightLb(gallons: number): number {
  return Math.round(gallons * 8.34);
}
