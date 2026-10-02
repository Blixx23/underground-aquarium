import "server-only";
import { dispatchOne } from "@/lib/email/queue";
import { OPS_SITE } from "@/lib/ops/config";

/**
 * Turns an agent's markdown report into a plain email and sends it to
 * Chris through the normal email queue, so the email kill switches and
 * health checks cover it like everything else.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Only links to our own pages or plain https pages; anything else stays as text. */
function safeHref(href: string): string | null {
  if (href.startsWith("/")) return OPS_SITE + href;
  return /^https:\/\/[^\s"<>]+$/.test(href) ? href : null;
}

function inline(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
      const url = safeHref(href.replace(/&amp;/g, "&"));
      return url ? `<a href="${esc(url)}">${text}</a>` : text;
    })
    // Bare admin paths become links too.
    .replace(/(^|\s)(\/admin\/[a-z0-9\-/]+)/g, (_m, pre: string, path: string) => `${pre}<a href="${OPS_SITE}${path}">${path}</a>`);
}

/** Enough markdown for a brief: headings, lists, tables, bold, links. */
export function mdToHtml(md: string): string {
  const out: string[] = [];
  const lines = md.split("\n");
  let list: "ul" | "ol" | null = null;
  let table: string[][] = [];

  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const flushTable = () => {
    if (table.length === 0) return;
    const [head, ...rows] = table;
    out.push(
      `<table cellpadding="6" style="border-collapse:collapse;font-size:14px"><tr>${head
        .map((c) => `<th align="left" style="border-bottom:1px solid #ccc">${inline(c)}</th>`)
        .join("")}</tr>${rows
        .map((r) => `<tr>${r.map((c) => `<td style="border-bottom:1px solid #eee">${inline(c)}</td>`).join("")}</tr>`)
        .join("")}</table>`
    );
    table = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*\|/.test(line)) {
      closeList();
      if (/^\s*\|[\s\-:|]+\|\s*$/.test(line)) continue;
      table.push(line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      continue;
    }
    flushTable();
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      closeList();
      const size = m[1].length === 1 ? 20 : m[1].length === 2 ? 17 : 15;
      out.push(`<p style="font-size:${size}px;font-weight:600;margin:18px 0 6px">${inline(m[2])}</p>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  flushTable();
  return out.join("\n");
}

export async function emailReport(args: { to: string; subject: string; markdown: string; runId: string }) {
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
${mdToHtml(args.markdown)}
<p style="margin-top:24px;font-size:13px;color:#666">Rate these findings or tell the team something on the
<a href="${OPS_SITE}/admin/ops">AI team page</a>.</p></div>`;
  await dispatchOne({
    kind: "ops_brief",
    to: args.to,
    subject: args.subject,
    html,
    retryLater: true,
    context: { run_id: args.runId },
  });
}
