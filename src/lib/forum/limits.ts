/**
 * Forum length limits, shared by the forms (for the live character counter)
 * and the API routes (which enforce them). Keeping them in one place means
 * the counter a member sees always matches what the server will accept.
 */

/** Longest thread title. */
export const MAX_TITLE = 160;

/** Shortest thread title, so "hi" can't be a whole thread. */
export const MIN_TITLE = 3;

/** Longest opening post body. */
export const MAX_OPENER = 20000;

/** Longest reply body. */
export const MAX_REPLY = 10000;

/** "12,345" style number for counters and messages. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** The plain-English message shown (and returned by the API) when text is too long. */
export function tooLongMessage(what: string, length: number, max: number): string {
  return `${what} is ${formatCount(length)} characters. The limit is ${formatCount(max)}, so please shorten it by ${formatCount(length - max)}.`;
}
