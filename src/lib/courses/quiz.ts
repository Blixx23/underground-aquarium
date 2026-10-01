/**
 * How many questions a lesson's quick check asks.
 *
 * Lessons ask a short 2-question review so people keep moving. A section
 * whose title contains "exam" (the final exam) asks every question it has.
 * Extra questions stay in the database untouched; only the first ones by
 * sort order are asked and graded, so raising this number later brings
 * them back without re-entering anything.
 */
export const LESSON_QUIZ_QUESTIONS = 2;

export function isExamSection(title: string | null | undefined): boolean {
  return /\bexam\b/i.test(title ?? "");
}

/** Keep only the questions this section actually asks. Input must be in sort order. */
export function questionsToAsk<T>(sectionTitle: string | null | undefined, questions: T[]): T[] {
  return isExamSection(sectionTitle) ? questions : questions.slice(0, LESSON_QUIZ_QUESTIONS);
}
