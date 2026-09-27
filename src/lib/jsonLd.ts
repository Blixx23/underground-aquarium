/**
 * Structured data as a string that is safe inside a <script> tag. Members
 * write post and comment text, so a "</script>" in it must not end the tag.
 */
export function ldJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
