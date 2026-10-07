import {
  LayoutDashboard, Mail, Megaphone, Store, Wrench, Flag, Fish, BookOpen,
  GraduationCap, Droplets, MessageSquare, Users, Camera, Clapperboard, BarChart3, LifeBuoy,
  CalendarDays, MapPin, Warehouse, Bot, Egg,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SOCIETY_CLUB_PATH, SOCIETY_NAME } from "@/lib/config";

/**
 * THE list of admin sections. Everything else reads from here:
 *   - the side menu (AdminNav) and its badges
 *   - the dashboard (only what's waiting)
 *   - the waiting counts (lib/admin/pending.ts)
 *   - the AI team: its list of queues, the live counts in the morning
 *     session, and the admin links findings point to
 *
 * Adding a new admin page? Add it here and it's connected everywhere.
 * scripts/check-admin-sections.mjs runs before every build and fails the
 * build if a folder under src/app/admin isn't listed (as href or in also).
 *
 * A queue is anything that waits on a person. Give it the table and the
 * filter that means "waiting", and it gets counted, badged, shown on the
 * dashboard and checked by the morning session automatically.
 */

export type Queue = {
  /** Plain name, used on the dashboard and in the AI team's brief. */
  label: string;
  table: string;
  /** Column = value filters that mean "waiting". */
  where?: [column: string, value: string | boolean][];
  /** Column in (values) filter. */
  whereIn?: [column: string, values: string[]];
  /** Columns that must be empty (e.g. done_at, for things not finished yet). */
  whereNull?: string[];
  /** A date column that must be today or earlier (Los Angeles time), for "due soon" reminders. */
  onOrBeforeToday?: string;
  /** Only rows for the Society club (filters club_id). */
  society?: boolean;
  /** Column holding when the item arrived, for "oldest waiting". Defaults to created_at. */
  since?: string;
  /** Where it's handled, if not the section's own page. */
  href?: string;
};

export type GroupKey = "today" | "shops" | "community" | "content" | "email" | "society" | "help";

export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "shops", label: "Shops" },
  { key: "community", label: "Community" },
  { key: "content", label: "Content" },
  { key: "email", label: "Email" },
  { key: "society", label: "Society" },
  { key: "help", label: "Help" },
];

export type AdminSection = {
  href: string;
  label: string;
  /** Short line under the menu label. */
  sub: string;
  /** One sentence for the dashboard and the AI team. */
  about: string;
  group: GroupKey;
  Icon: LucideIcon;
  exact?: boolean;
  /** Other admin pages this menu item covers, shown as tabs on the page. */
  also?: { href: string; label: string }[];
  /** Tab label for this page when it has `also` tabs. */
  tab?: string;
  queues?: Queue[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
  // Today
  {
    href: "/admin", label: "Dashboard", sub: "Everything waiting on you", group: "today", Icon: LayoutDashboard, exact: true,
    about: "Everything waiting on you, in one place, plus everything that expires (domains, the DMCA agent, subscriptions).",
    tab: "Waiting",
    also: [{ href: "/admin/renewals", label: "Renewals" }],
    queues: [
      {
        label: "Renewals coming up",
        table: "renewals",
        onOrBeforeToday: "remind_on",
        since: "remind_on",
        href: "/admin/renewals",
      },
    ],
  },
  {
    href: "/admin/ops", label: "AI team", sub: "Brief, findings, workers", group: "today", Icon: Bot,
    about: "The morning brief and the AI team's findings to approve.",
    queues: [{ label: "AI team findings", table: "ops_findings", whereIn: ["status", ["new", "open"]] }],
  },
  {
    href: "/admin/site-stats", label: "Stats", sub: "Members and shops", group: "today", Icon: BarChart3,
    about: "Sign-ups and members, and how every shop is doing.",
    tab: "Members",
    also: [{ href: "/admin/shop-stats", label: "Shops" }],
  },

  // Shops
  {
    href: "/admin/shops", label: "All shops", sub: "Dashboards, show or hide", group: "shops", Icon: Store,
    about: "Every shop in the directory: open its dashboard, show or hide it.",
  },
  {
    href: "/admin/pending-shops", label: "New shops", sub: "Shops members suggested", group: "shops", Icon: MapPin,
    about: "Shops members suggested, waiting to go in the directory.",
    queues: [{ label: "Suggested shops", table: "fish_stores", where: [["status", "pending"]] }],
  },
  {
    href: "/admin/stores", label: "Store claims", sub: "Owners claiming a shop", group: "shops", Icon: Store,
    about: "Shop owners asking to manage their listing.",
    queues: [{ label: "Store claims", table: "store_claims", where: [["status", "pending"]] }],
  },
  {
    href: "/admin/store-fixes", label: "Shop fixes", sub: "Wrong hours, moved, closed", group: "shops", Icon: Wrench,
    about: "Wrong hours, moved or closed shops, flagged by shoppers.",
    queues: [{ label: "Shop fixes", table: "store_edit_suggestions", where: [["status", "open"]] }],
  },
  {
    href: "/admin/wholesale", label: "Wholesale", sub: "Wholesale-only businesses", group: "shops", Icon: Warehouse,
    about: "Wholesale-only businesses, kept off the public directory.",
  },

  // Community
  {
    href: "/admin/reports", label: "Reports", sub: "Flagged posts, members, tanks", group: "community", Icon: Flag,
    about: "Posts, members and community tanks the community flagged.",
    tab: "Posts and members",
    also: [{ href: "/admin/tank-reports", label: "Tanks" }],
    queues: [
      { label: "Flagged posts and members", table: "reports", where: [["status", "open"]] },
      { label: "Flagged tanks", table: "tank_reports", where: [["status", "open"]], href: "/admin/tank-reports" },
    ],
  },
  {
    href: "/admin/events", label: "Events", sub: "Community events to approve", group: "community", Icon: CalendarDays,
    about: "Community events waiting for approval before they go public.",
    queues: [{ label: "Events to approve", table: "events", where: [["status", "pending"]] }],
  },
  {
    href: "/admin/feedback", label: "Feedback", sub: "What members sent in", group: "community", Icon: MessageSquare,
    about: "What members have written in about.",
    queues: [{ label: "Member feedback", table: "feedback", whereIn: ["status", ["new", "in_progress"]] }],
  },
  {
    href: "/admin/bubbles", label: "Bubbles", sub: "Award or deduct", group: "community", Icon: Droplets,
    about: "Award or deduct member bubbles by hand.",
  },

  // Content
  {
    href: "/admin/species", label: "Species", sub: "Suggested fish", group: "content", Icon: Fish,
    about: "Fish and animals the community suggested.",
    queues: [{ label: "Suggested species", table: "species_suggestions", where: [["status", "pending"]] }],
  },
  {
    href: "/admin/species-photos", label: "Species photos", sub: "Member photos to review", group: "content", Icon: Camera,
    about: "Members' photos waiting to go on species pages.",
    queues: [{ label: "Species photos", table: "species_photos", where: [["status", "pending"]] }],
  },
  {
    href: "/admin/species-videos", label: "Breeding videos", sub: "Member clips to review", group: "content", Icon: Clapperboard,
    about: "Members' courtship, spawning, egg and fry clips to review.",
    queues: [{ label: "Breeding videos", table: "species_videos", where: [["status", "pending"]] }],
  },
  {
    href: "/admin/breeding-guides", label: "Breeding guides", sub: "AI drafts to approve", group: "content", Icon: Egg,
    about: "Breeding guides the AI drafted and fact-checked for new species, waiting for a yes before they go live.",
    queues: [{ label: "Breeding guide drafts", table: "breeding_guides", where: [["is_published", false]], since: "drafted_at" }],
  },
  {
    href: "/admin/glossary", label: "Glossary", sub: "Suggested terms", group: "content", Icon: BookOpen,
    about: "Glossary terms waiting to be approved.",
    queues: [{ label: "Glossary terms", table: "glossary_suggestions", where: [["status", "pending"]] }],
  },
  {
    href: "/admin/courses", label: "Courses", sub: "Lessons and quizzes", group: "content", Icon: GraduationCap,
    about: "Lessons, quizzes and drafts still to publish.",
    queues: [{ label: "Unpublished courses", table: "courses", where: [["is_published", false]] }],
  },

  // Email
  {
    href: "/admin/email", label: "Email", sub: "Queue, health and delivery", group: "email", Icon: Mail,
    about: "Queue, delivery and health for everything the site sends.",
    queues: [{ label: "Failed emails", table: "email_queue", where: [["status", "failed"]], whereNull: ["cleared_at"] }],
  },
  {
    href: "/admin/campaigns", label: "Campaigns", sub: "Sequences and who is in them", group: "email", Icon: Megaphone,
    about: "Email sequences and the shops walking through them.",
  },

  // Society
  {
    href: `${SOCIETY_CLUB_PATH}/admin`, label: "Society", sub: "Roster, dues, awards", group: "society", Icon: Users,
    about: `Roster, dues, officers, applications and awards for ${SOCIETY_NAME}.`,
    queues: [
      { label: "Society applications", table: "club_members", where: [["status", "pending"]], society: true, since: "joined_at" },
      {
        label: "Award submissions to review", table: "club_award_submissions", where: [["status", "pending"]], society: true,
        href: `${SOCIETY_CLUB_PATH}/awards/review`,
      },
      {
        label: "Spawn logs with the judge or under appeal", table: "spawn_logs", whereIn: ["status", ["awaiting_judge", "appealed"]],
        society: true, since: "submitted_at", href: "/society/judge",
      },
    ],
  },

  // Help
  {
    href: "/admin/help", label: "Admin help", sub: "How every screen works", group: "help", Icon: LifeBuoy,
    about: "How every admin screen works.",
  },
];

/** The menu item a path belongs to (its own page or one of its tabs). */
export function sectionFor(pathname: string): AdminSection | undefined {
  const hit = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return ADMIN_SECTIONS.find((s) => hit(s.href, s.exact) || (s.also ?? []).some((a) => hit(a.href)));
}
