/**
 * Course levels, in the order they appear in the Courses menu.
 *
 * Every course has a level (beginner, intermediate, expert). A course marked
 * members_only goes in the Society group instead, whatever its level. A group
 * only shows in the menu once it has at least one published course in it.
 */
export type CourseLevel = "beginner" | "intermediate" | "expert";
export type CourseGroup = CourseLevel | "society";

export const COURSE_LEVELS: CourseLevel[] = ["beginner", "intermediate", "expert"];

export const COURSE_GROUPS: { key: CourseGroup; label: string; blurb: string }[] = [
  { key: "beginner", label: "Beginner", blurb: "Start here. The fundamentals every fish keeper needs." },
  { key: "intermediate", label: "Intermediate", blurb: "For keepers with a tank or two running and ready for more." },
  { key: "expert", label: "Expert", blurb: "Advanced husbandry, breeding and specialist species." },
  { key: "society", label: "Society", blurb: "Classes for Underground Aquarium Society members." },
];

export function normaliseLevel(v: unknown): CourseLevel {
  return v === "intermediate" || v === "expert" ? v : "beginner";
}

export function courseGroup(c: { level?: unknown; members_only?: unknown }): CourseGroup {
  return c.members_only ? "society" : normaliseLevel(c.level);
}

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
};
