import type { ReactNode } from "react";

/**
 * Turn a forum search snippet into clean, readable text.
 * The database marks matched words with <mark>…</mark> (older code used
 * «mark»…«/mark»); post text can also carry markdown like **bold**, links
 * and image tags. This strips the markdown and turns the marks into real
 * highlight nodes. Everything is rendered as plain text: no HTML injection.
 */
export function Snippet({ text, markClass }: { text: string; markClass?: string }): ReactNode {
  const clean = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> their words
    .replace(/<(?!\/?mark>)[^>]*>/g, "") // any stray tags except mark
    // Swap the highlight marks for private characters first, so stripping
    // markdown symbols (including ">") can't break them.
    .replace(/<mark>|«mark»/g, "\u0001")
    .replace(/<\/mark>|«\/mark»/g, "\u0002")
    .replace(/[*_#`>~]+/g, "") // markdown symbols
    .replace(/\s+/g, " ")
    .trim();

  const nodes: ReactNode[] = [];
  const re = /\u0001([\s\S]*?)\u0002/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    if (m.index > last) nodes.push(clean.slice(last, m.index));
    nodes.push(
      <mark key={i++} className={markClass ?? "rounded bg-amber-300/30 px-0.5 font-medium text-amber-50"}>
        {m[1]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  if (last < clean.length) nodes.push(clean.slice(last));
  return <>{nodes}</>;
}
