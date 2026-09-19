/**
 * Underground Aquarium certificate codes.
 *
 *   UA-B7K2-M9QX-T4P8
 *      │└─────────┘│
 *      │  serial   └ check character
 *      └ program letter
 *
 * Codes are only ever created by the database (public.ua_code). This file
 * reads them: it cleans up what someone typed, catches typos before a
 * lookup, and says which program a code belongs to. It mirrors
 * public.ua_normalize_code exactly; change one, change both.
 */

/** Crockford base 32: no I, L, O or U, so nothing on paper is ambiguous. */
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type CertificateProgram = {
  letter: string;
  name: string;
  description: string;
};

/** The first letter of every code. Mirrors public.certificate_programs. */
export const CERTIFICATE_PROGRAMS: CertificateProgram[] = [
  { letter: "M", name: "Membership", description: "Membership in the Underground Aquarium Society." },
  { letter: "B", name: "Breeder Award Program", description: "Titles earned by breeding fish, judged stage by stage." },
  { letter: "H", name: "Horticulture Award Program", description: "Titles earned by propagating aquatic plants." },
  { letter: "C", name: "Courses", description: "Completion of an Underground Aquarium course." },
  { letter: "P", name: "Professional Certification", description: "Certification for aquarium store staff and professionals." },
  { letter: "A", name: "Honors & Achievements", description: "Special recognition, milestones and honors." },
];

export function programFor(letter: string): CertificateProgram | null {
  return CERTIFICATE_PROGRAMS.find((p) => p.letter === letter) ?? null;
}

/** Luhn mod 32. Catches any single wrong character and any swap of neighbours. */
export function checkCharacter(body: string): string {
  let factor = 2;
  let total = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    const addend = factor * CODE_ALPHABET.indexOf(body[i]);
    factor = factor === 2 ? 1 : 2;
    total += Math.floor(addend / 32) + (addend % 32);
  }
  return CODE_ALPHABET[(32 - (total % 32)) % 32];
}

export type ParsedCode =
  /** A well-formed registry code, check character and all. */
  | { state: "valid"; code: string; program: CertificateProgram | null }
  /** A pre-registry UAS-XXXX-XXXX code. Still honoured. */
  | { state: "legacy"; code: string }
  /** Right length, but the check character doesn't match: a typo. */
  | { state: "typo"; code: string }
  /** Not enough characters yet. */
  | { state: "incomplete"; typed: number }
  /** Can't be a code at all. */
  | { state: "invalid" };

export function formatCode(body12: string): string {
  return `UA-${body12.slice(0, 4)}-${body12.slice(4, 8)}-${body12.slice(8, 12)}`;
}

export function parseCode(input: string): ParsedCode {
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (/^UAS[A-Z0-9]{8}$/.test(s)) {
    return { state: "legacy", code: `UAS-${s.slice(3, 7)}-${s.slice(7, 11)}` };
  }

  if (s.startsWith("UA")) s = s.slice(2);
  s = s.replace(/O/g, "0").replace(/[IL]/g, "1");

  if ([...s].some((c) => !CODE_ALPHABET.includes(c))) return { state: "invalid" };
  if (s.length < 12) return { state: "incomplete", typed: s.length };
  if (s.length > 12) return { state: "invalid" };

  const code = formatCode(s);
  if (checkCharacter(s.slice(0, 11)) !== s[11]) return { state: "typo", code };
  return { state: "valid", code, program: programFor(s[0]) };
}

/**
 * Live formatting for the input box: strips junk, uppercases, and puts the
 * dashes in as you type, so what's on screen looks like what's on paper.
 */
export function formatAsTyped(input: string): string {
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("UAS")) {
    s = s.slice(3, 11);
    return "UAS-" + [s.slice(0, 4), s.slice(4, 8)].filter(Boolean).join("-");
  }
  if (s.startsWith("UA")) s = s.slice(2);
  else if (s === "U") return "U";
  s = s.slice(0, 12);
  const groups = [s.slice(0, 4), s.slice(4, 8), s.slice(8, 12)].filter(Boolean);
  return groups.length ? "UA-" + groups.join("-") : "";
}
