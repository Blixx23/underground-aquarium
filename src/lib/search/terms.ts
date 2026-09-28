/**
 * Turning what someone typed into search terms. Shared by help search, site
 * search and the typo fixer, so they all agree on what a "word" is.
 *
 * People type questions ("how do I mark my listing sold"), so filler words
 * are dropped and simple plurals/verb endings are folded ("listings" finds
 * "listing", "posted" finds "post").
 */

const STOP = new Set(
  "a an and are as at be can do does for from get how i if in is it me my of on or so the to up we what when where which who why will with you your".split(" ")
);

export function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es") && !w.endsWith("ses")) return w.slice(0, -1);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  return w;
}

/**
 * Shorthand and sound-alike spellings a typo fixer can't work out on its own
 * ("foto" is closer to "foot" than to "photo"). Checked before stemming.
 */
const ALIASES: Record<string, string> = {
  foto: "photo",
  fotos: "photos",
  pic: "photo",
  pics: "photos",
  pix: "photos",
  msg: "message",
  msgs: "messages",
  dm: "message",
  dms: "messages",
  pm: "message",
  acct: "account",
  pw: "password",
  pwd: "password",
  passwd: "password",
  lfs: "store",
  vid: "video",
  vids: "videos",
  pls: "",
  plz: "",
  thx: "",
  ur: "your",
  u: "you",
};

export function queryTerms(q: string): string[] {
  const words = q
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .map((w) => (w in ALIASES ? ALIASES[w] : w))
    .filter(Boolean);
  const kept = words.filter((w) => !STOP.has(w));
  return (kept.length ? kept : words).map(stem);
}
