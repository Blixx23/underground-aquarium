import { tempF } from "@/lib/units";
/**
 * The questions people actually type about a fish ("neon tetra tank size",
 * "how big do angelfish get"), answered from the species' own care data.
 * Only questions we have real data for are asked.
 */
export type SpeciesFacts = {
  common_name: string;
  water_type?: string | null;
  temp_min_f?: number | null;
  temp_max_f?: number | null;
  ph_min?: number | null;
  ph_max?: number | null;
  gh_min?: number | null;
  gh_max?: number | null;
  max_size_in?: number | null;
  min_tank_gal?: number | null;
  temperament?: string | null;
  social?: string | null;
  min_group_size?: number | null;
  swim_level?: string | null;
  diet?: string | null;
  care_level?: string | null;
  lifespan?: string | null;
  breeding_type?: string | null;
  origin?: string | null;
};

export type Faq = { q: string; a: string };

const low = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

export function speciesFaq(
  s: SpeciesFacts,
  opts: { hasBreedingGuide?: boolean; tankmates?: { names: string[]; gallons: number } | null; crossesWith?: string[] } = {}
): Faq[] {
  const n = s.common_name;
  const out: Faq[] = [];

  if (has(s.min_tank_gal)) {
    let a = `A ${n} needs a tank of at least ${s.min_tank_gal} gallons.`;
    if (has(s.max_size_in)) a += ` It grows to about ${s.max_size_in} inches.`;
    if (has(s.min_group_size) && Number(s.min_group_size) > 1) {
      a += ` Keep them in a group of ${s.min_group_size} or more, and size the tank for the whole group.`;
    }
    out.push({ q: `What size tank does a ${n} need?`, a });
  } else if (has(s.max_size_in)) {
    out.push({ q: `How big does a ${n} get?`, a: `A ${n} grows to about ${s.max_size_in} inches as an adult.` });
  }

  if (has(s.temp_min_f) && has(s.temp_max_f)) {
    let a = `Keep a ${n} at ${tempF(Number(s.temp_min_f), Number(s.temp_max_f))}`;
    if (has(s.ph_min) && has(s.ph_max)) a += `, pH ${s.ph_min}-${s.ph_max}`;
    if (has(s.gh_min) && has(s.gh_max)) a += `, and ${s.gh_min}-${s.gh_max} dGH hardness`;
    a += ".";
    if (has(s.water_type)) a += ` It's a ${low(s.water_type)} species.`;
    a += " Stable water matters more than hitting an exact number.";
    out.push({ q: `What water temperature and pH does a ${n} need?`, a });
  }

  if (has(s.temperament)) {
    let a = `The ${n} is ${low(s.temperament)}.`;
    if (has(s.social)) {
      const group = has(s.min_group_size) && Number(s.min_group_size) > 1 ? `, happiest in a group of ${s.min_group_size}+` : "";
      a += /^(schooling|shoaling|solitary|colonial|social|territorial|peaceful)/.test(low(s.social))
        ? ` It's a ${low(s.social)} fish${group}.`
        : ` Best kept: ${low(s.social)}${group}.`;
    }
    if (has(s.swim_level)) a += ` It spends most of its time in the ${low(s.swim_level)} of the tank.`;
    out.push({ q: `Is the ${n} aggressive?`, a });
  }

  // "What fish can live with a betta" is one of the most searched questions.
  const mates = opts.tankmates;
  if (mates && mates.names.length >= 2) {
    const names = mates.names.slice(0, 6);
    const listed = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    out.push({
      q: `What fish can live with a ${n}?`,
      a: `In a ${mates.gallons} gallon tank, good tankmates for a ${n} include ${listed}. They share its water needs and won't eat or bully it, or be bullied by it. Every fish is an individual, so watch the first few weeks.`,
    });
  }

  if (has(s.diet)) {
    out.push({
      q: `What does the ${n} eat?`,
      a: `The ${n} is ${/^[aeiou]/i.test(low(s.diet)) ? "an" : "a"} ${low(s.diet)}. Feed a varied diet in small amounts once or twice a day, only what it finishes in a couple of minutes.`,
    });
  }

  if (has(s.lifespan)) {
    out.push({
      q: `How long does a ${n} live?`,
      a: `With good care a ${n} lives ${low(s.lifespan)}.`,
    });
  }

  if (has(s.care_level)) {
    const easy = /easy|beginner/.test(low(s.care_level));
    out.push({
      q: `Is the ${n} good for beginners?`,
      a: easy
        ? `Yes. The ${n} is rated ${low(s.care_level)} care, a good choice for a first tank once it has cycled.`
        : `The ${n} is rated ${low(s.care_level)} care. It's best for keepers who already have a stable, cycled tank.`,
    });
  }

  if (has(s.breeding_type)) {
    out.push({
      q: `How does the ${n} breed?`,
      a:
        `The ${n} is ${/^[aeiou]/i.test(low(s.breeding_type)) ? "an" : "a"} ${low(s.breeding_type)}.` +
        (opts.hasBreedingGuide ? ` Our step-by-step breeding guide covers it, from setting up to raising the fry.` : ""),
    });
  }

  if (opts.crossesWith && opts.crossesWith.length) {
    const list = opts.crossesWith.map((x) => `the ${x}`);
    const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
    out.push({
      q: `Can the ${n} crossbreed with other fish?`,
      a: `Yes. The ${n} can crossbreed with ${joined}. Keep only one of them in a tank if you want to breed true.`,
    });
  }

  if (has(s.origin)) {
    out.push({ q: `Where does the ${n} come from?`, a: `The ${n} is native to ${String(s.origin).replace(/^the\s+/i, "the ")}.` });
  }

  return out;
}
