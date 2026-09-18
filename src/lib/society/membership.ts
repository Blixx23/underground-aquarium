import { createClient } from "@/lib/supabase/server";
import { SOCIETY_SLUG } from "@/lib/config";

export type SocietyRow = {
  id: string;
  name: string;
  description: string | null;
  dues_amount_cents: number;
  family_dues_amount_cents: number | null;
  lifetime_dues_amount_cents: number | null;
  stripe_account_id: string | null;
  payouts_enabled: boolean | null;
  contact_email: string | null;
};

export type Membership = {
  role: string | null;
  status: string | null;
  display_name: string | null;
  tier: string | null;
  paid_through: string | null;
  family_primary_id: string | null;
  member_number: number | null;
  joined_at: string | null;
};

export type SocietyContext = {
  society: SocietyRow | null;
  userId: string | null;
  membership: Membership | null;
  isMember: boolean;
  isApplicant: boolean;
  isOfficer: boolean;
  /** Set when the lookup itself failed. Never the same thing as "not a member". */
  error: string | null;
};

/**
 * Everything the Society's member area needs to know about who's asking.
 *
 * The membership lookup deliberately reads only columns that have existed
 * since the club tables were created. Newer columns (member_number,
 * joined_at) come from a second query, so a migration that hasn't run yet
 * costs a card its number rather than telling a member they're a stranger.
 */
export async function getSocietyContext(): Promise<SocietyContext> {
  const supabase = await createClient();

  const { data: society } = await supabase
    .from("clubs")
    .select(
      "id, name, description, dues_amount_cents, family_dues_amount_cents, lifetime_dues_amount_cents, stripe_account_id, payouts_enabled, contact_email"
    )
    .eq("slug", SOCIETY_SLUG)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: SocietyContext = {
    society: (society as SocietyRow) ?? null,
    userId: user?.id ?? null,
    membership: null,
    isMember: false,
    isApplicant: false,
    isOfficer: false,
    error: null,
  };

  if (!society || !user) return empty;

  const { data: me, error } = await supabase
    .from("club_members")
    .select("role, status, display_name, tier, paid_through, family_primary_id")
    .eq("club_id", society.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ...empty, error: error.message };
  if (!me) return empty;

  const isApplicant = me.status === "pending";
  const isMember = me.role !== null && !isApplicant;

  let member_number: number | null = null;
  let joined_at: string | null = null;
  if (isMember) {
    const { data: extra } = await supabase
      .from("club_members")
      .select("member_number, joined_at")
      .eq("club_id", society.id)
      .eq("user_id", user.id)
      .maybeSingle();
    member_number = extra?.member_number ?? null;
    joined_at = extra?.joined_at ?? null;
  }

  return {
    society: society as SocietyRow,
    userId: user.id,
    membership: { ...(me as Omit<Membership, "member_number" | "joined_at">), member_number, joined_at },
    isMember,
    isApplicant,
    isOfficer: ["owner", "admin", "officer"].includes(me.role ?? ""),
    error: null,
  };
}

/**
 * Difficulty class from a species' point value.
 *
 * The point value is the source of truth — the class letter is a label put
 * on top of it. Anything off the published ladder falls back to its own
 * point count rather than being forced into the nearest letter.
 */
export const CLASS_LADDER: { letter: string; points: number; blurb: string }[] = [
  { letter: "A", points: 5, blurb: "Beginner. Breeds readily in a community tank." },
  { letter: "B", points: 10, blurb: "Straightforward with a dedicated tank." },
  { letter: "C", points: 15, blurb: "Needs conditioning and specific water." },
  { letter: "D", points: 20, blurb: "Difficult. Fry are the hard part." },
  { letter: "E", points: 25, blurb: "Expert. Few members will log one." },
  { letter: "F", points: 40, blurb: "Rarely bred in captivity at all." },
];

export function classForPoints(points: number): string | null {
  return CLASS_LADDER.find((c) => c.points === points)?.letter ?? null;
}
