export type SpawnStageRule = {
  stage: number;
  name: string;
  proves: string;
  min_days_after_previous: number;
  requires_code: boolean;
};

export type SpawnStage = {
  id: string;
  stage: number;
  photos: string[];
  note: string | null;
  created_at: string;
};

export type SpawnLog = {
  id: string;
  club_id: string;
  user_id: string;
  species_id: string | null;
  species_name: string;
  challenge_code: string;
  tank_note: string | null;
  status:
    | "open"
    | "submitted"
    | "in_review"
    | "awaiting_judge"
    | "approved"
    | "rejected"
    | "appealed"
    | "withdrawn";
  judge_reason: string | null;
  appeal_reason: string | null;
  appealed_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
  requires_unanimous: boolean;
  opened_at: string;
  submitted_at: string | null;
  points_awarded: number | null;
  is_first_in_society: boolean;
};

export const SPAWN_LOG_COLUMNS =
  "id, club_id, user_id, species_id, species_name, challenge_code, tank_note, status, opened_at, submitted_at, points_awarded, is_first_in_society, judge_reason, appeal_reason, appealed_at, decided_by, decision_note, requires_unanimous";

export const STATUS_LABEL: Record<SpawnLog["status"], string> = {
  open: "In progress",
  submitted: "Submitted",
  in_review: "Peer review",
  awaiting_judge: "With the judge",
  approved: "Approved",
  rejected: "Rejected",
  appealed: "Under appeal",
  withdrawn: "Withdrawn",
};

/** One place for status colours, so every page agrees. */
export const STATUS_CLASS: Record<SpawnLog["status"], string> = {
  open: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  submitted: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  in_review: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  awaiting_judge: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-coral-500/40 bg-coral-500/10 text-coral-300",
  appealed: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  withdrawn: "border-ocean-700/60 bg-ocean-900/40 text-ocean-500",
};

/**
 * When the next stage becomes loggable.
 *
 * The database enforces this too — this is only so the page can say "Sep 21"
 * instead of letting someone upload five photos and then be told no.
 */
export function unlocksAt(
  previousStageAt: string | null,
  minDays: number
): Date | null {
  if (!previousStageAt || minDays <= 0) return null;
  const d = new Date(previousStageAt);
  d.setDate(d.getDate() + minDays);
  return d;
}

export function daysUntil(when: Date | null): number {
  if (!when) return 0;
  const ms = when.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
