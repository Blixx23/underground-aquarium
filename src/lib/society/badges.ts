import {
  Award,
  Crown,
  Droplets,
  Eye,
  FileText,
  Flame,
  Gem,
  GraduationCap,
  Map as MapIcon,
  Medal,
  Repeat,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

/** A row from public.society_badges. */
export type SocietyBadge = {
  key: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  sort_order: number;
};

/** A row from public.member_badges, joined to its definition. */
export type EarnedBadge = SocietyBadge & {
  earned_at: string;
  detail: string | null;
};

export type BadgeTier = "bronze" | "silver" | "gold";

export type BadgeCategory =
  | "membership"
  | "breeding"
  | "service"
  | "longevity"
  | "contribution";

export const BADGE_COLUMNS =
  "key, name, description, category, tier, sort_order";

/** Headings for the trophy case, in display order. */
export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  membership: "Membership",
  breeding: "Breeding",
  service: "Service",
  longevity: "Longevity",
  contribution: "Contribution",
};

export const CATEGORY_ORDER: BadgeCategory[] = [
  "membership",
  "breeding",
  "service",
  "longevity",
  "contribution",
];

/**
 * Icon per badge. Keyed by badge key so the database stays the source of
 * truth for names and descriptions while the artwork lives in the app.
 * Anything unrecognised falls back to a medal rather than rendering nothing.
 */
const ICONS: Record<string, LucideIcon> = {
  member_25: Crown,
  member_50: Star,
  member_100: Star,
  member_250: Star,
  member_1000: Star,

  first_blood: Droplets,
  first_in_society: Trophy,
  pioneer: MapIcon,
  deep_water: Gem,
  unicorn: Sparkles,
  clean_sheet: ShieldCheck,
  persistent: Repeat,

  reviewer_10: Shield,
  reviewer_50: Shield,
  reviewer_100: Shield,
  sharp_eye: Eye,
  mentor: GraduationCap,

  year_1: Flame,
  year_3: Flame,
  year_5: Flame,
  year_10: Flame,

  author: FileText,
  cartographer: Award,
};

export function badgeIcon(key: string): LucideIcon {
  return ICONS[key] ?? Medal;
}

/**
 * Tier styling. Gold is reserved for the badges that are genuinely hard to
 * get, so the colour still means something when the case fills up.
 */
export const TIER_CLASS: Record<
  BadgeTier,
  { ring: string; icon: string; glow: string }
> = {
  gold: {
    ring: "border-amber-400/50 bg-amber-400/10",
    icon: "text-amber-300",
    glow: "shadow-lg shadow-amber-500/10",
  },
  silver: {
    ring: "border-ocean-400/40 bg-ocean-400/10",
    icon: "text-ocean-200",
    glow: "",
  },
  bronze: {
    ring: "border-amber-700/40 bg-amber-700/10",
    icon: "text-amber-600/90",
    glow: "",
  },
};

/** Locked badges are shown, greyed — a locked badge is a roadmap. */
export const LOCKED_CLASS = {
  ring: "border-ocean-800/50 bg-ocean-900/30",
  icon: "text-ocean-700",
  glow: "",
};

export { Users };
