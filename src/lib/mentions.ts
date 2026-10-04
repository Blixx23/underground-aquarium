/**
 * @mentions: "@salmon868" in a post or comment links to that member and
 * tells them they were mentioned. Usernames are letters, numbers and
 * underscores (3 to 24), the same rule as sign-up.
 *
 * An @ only counts at the start of the text or after a space or
 * punctuation, so emails (chris@site.com) and paths never count.
 */
const MENTION = /(^|[^A-Za-z0-9_@./])@([A-Za-z0-9_]{3,24})(?![A-Za-z0-9_])/g;

/** Most people one post can tag, so nobody pings fifty members at once. */
export const MAX_MENTIONS = 10;

/** Unique handles mentioned in the text, lowercased, capped. */
export function extractMentions(text: string | null | undefined): string[] {
  const out = new Set<string>();
  // Code in a forum post (`@like_this`) isn't a mention.
  const plain = (text ?? "").replace(/```[\s\S]*?```|`[^`\n]*`/g, " ");
  for (const m of plain.matchAll(MENTION)) {
    out.add(m[2].toLowerCase());
    if (out.size >= MAX_MENTIONS) break;
  }
  return [...out];
}

export type MentionPart = { text: string } | { handle: string };

/** Text split into plain runs and @handles, for rendering links. */
export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    const at = (m.index ?? 0) + m[1].length;
    if (at > last) parts.push({ text: text.slice(last, at) });
    parts.push({ handle: m[2] });
    last = at + 1 + m[2].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/**
 * Forum posts are Markdown: turn @handle into a link to the profile.
 * Code (`like this`, or fenced blocks) is left alone.
 */
export function linkMentionsInMarkdown(md: string): string {
  return md
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((chunk, i) =>
      i % 2 === 1 ? chunk : chunk.replace(MENTION, (_all, pre: string, h: string) => `${pre}[@${h}](/u/${h})`)
    )
    .join("");
}
