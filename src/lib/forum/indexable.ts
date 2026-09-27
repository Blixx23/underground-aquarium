/**
 * Which forum threads Google should index. One rule, shared by the thread
 * page and the sitemap so they never disagree.
 *
 * A thread earns a place when someone has replied, when it was written as
 * a guide (seeded), or when the opening post is substantial on its own: a
 * detailed question with the numbers and the setup is exactly what people
 * search for, answered or not. One-line posts wait for a reply.
 */
export const MIN_OP_CHARS = 300;

export function threadIndexable(t: {
  is_seeded?: boolean | null;
  reply_count?: number | null;
  opLength?: number | null;
}): boolean {
  return Boolean(t.is_seeded) || (t.reply_count ?? 0) >= 1 || (t.opLength ?? 0) >= MIN_OP_CHARS;
}

/** Markdown to plain text, for descriptions and structured data. */
export function plainText(md: string | null | undefined): string {
  return (md ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
