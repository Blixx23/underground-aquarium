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
  status: "open" | "submitted" | "approved" | "rejected" | "withdrawn";
  opened_at: string;
  submitted_at: string | null;
  points_awarded: number | null;
  is_first_in_society: boolean;
};

export const SPAWN_LOG_COLUMNS =
  "id, club_id, user_id, species_id, species_name, challenge_code, tank_note, status, opened_at, submitted_at, points_awarded, is_first_in_society";

export const STATUS_LABEL: Record<SpawnLog["status"], string> = {
  open: "In progress",
  submitted: "In review",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
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
