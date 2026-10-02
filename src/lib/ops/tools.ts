import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OPS_LIMITS } from "@/lib/ops/config";
import type { ToolDef } from "@/lib/ops/claude";
import type { WorkerDef } from "@/lib/ops/workers";
import { createReplyDraft, listSupportEmails, readSupportEmail, threadAnswered } from "@/lib/ops/gmail";
import { checkLinks, fetchPage, listSitePages } from "@/lib/ops/siteCheck";
import { getHelpArticles } from "@/lib/help/content";

/**
 * The tools an agent can use. Every one of them reads, or writes only to
 * the team's own tables (memory, findings, scorecards). None of them can
 * change member data, send email or touch money. The Support Desk can save
 * Gmail drafts (never send), and QA can load public pages of the site.
 */

export type RunState = {
  runId: string;
  worker: WorkerDef;
  queries: number;
  scorecard: unknown[];
  nothingNeeded: boolean;
  findingsCreated: number;
  /** Pages QA has loaded this run. */
  fetches: number;
};

const MAX_FETCHES = 60;

/** "Jane Smith <jane@x.com>" becomes "Jane Smith": the agent doesn't need the address. */
function senderName(from: string): string {
  const name = from.replace(/<[^>]*>/g, "").replace(/"/g, "").trim();
  return name || "a member";
}

async function seenIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabaseAdmin.from("ops_support_seen").select("message_id").in("message_id", ids);
  return new Set((data ?? []).map((r) => r.message_id as string));
}

const KINDS = ["queue", "message", "data", "bug", "decision", "idea"];
const RISKS = ["low", "medium", "high"];

export function toolsFor(worker: WorkerDef): ToolDef[] {
  const tools: ToolDef[] = [
    {
      name: "query_database",
      description:
        "Run ONE read-only SELECT (or WITH ... SELECT) against the site database. Returns at most 50 rows as JSON. " +
        "Count, group and filter in SQL rather than pulling raw rows. No semicolons, no double quotes, no comments. " +
        "Private columns are blocked.",
      input_schema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "The SELECT query." },
          purpose: { type: "string", description: "A few words on what you're checking." },
        },
        required: ["sql", "purpose"],
      },
    },
    {
      name: "save_memory",
      description:
        "Save something to your memory for future runs. rule = how Chris wants something handled; fact = a baseline " +
        "or durable fact about the site (e.g. normal daily sign-ups); thread = something you're following up on; " +
        "example = work Chris approved, to copy. Keep it to one or two sentences. Don't save what's already there.",
      input_schema: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["rule", "fact", "thread", "example"] },
          content: { type: "string" },
        },
        required: ["kind", "content"],
      },
    },
    {
      name: "retire_memory",
      description: "Retire a memory that is outdated, resolved or wrong (e.g. a thread that's closed).",
      input_schema: {
        type: "object",
        properties: { id: { type: "string" }, reason: { type: "string" } },
        required: ["id", "reason"],
      },
    },
  ];


  if (worker.key === "support") {
    tools.push(
      {
        name: "list_new_support_emails",
        description: "New emails to support@ from the last 7 days that haven't been handled yet and aren't already answered.",
        input_schema: { type: "object", properties: {} },
      },
      {
        name: "read_support_email",
        description: "Read one support email (the new message only, without the quoted history).",
        input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      },
      {
        name: "search_help",
        description: "Search the site's help articles. Returns the best matches with their slugs and summaries.",
        input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      },
      {
        name: "read_help",
        description: "Read one help article in full by its slug.",
        input_schema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
      },
      {
        name: "draft_reply",
        description:
          "Save a reply to one support email as a Gmail draft for Chris to review and send. Plain text, signed " +
          "\"Chris\nUnderground Aquarium\". Also files a ticket so Chris sees it on the AI team page.",
        input_schema: {
          type: "object",
          properties: {
            id: { type: "string" },
            reply: { type: "string" },
            topic: { type: "string", description: "A few words: what the email was about." },
          },
          required: ["id", "reply", "topic"],
        },
      },
      {
        name: "skip_email",
        description:
          "Mark a support email handled without a draft: spam, automated mail, or something you're sending to Chris " +
          "as a finding instead (file that finding with create_finding, kind decision, risk high).",
        input_schema: {
          type: "object",
          properties: { id: { type: "string" }, reason: { type: "string" } },
          required: ["id", "reason"],
        },
      }
    );
  }

  if (worker.key === "qa") {
    tools.push(
      {
        name: "list_site_pages",
        description:
          "What the sitemap lists. With no section: a count and examples per section. With a section like \"/stores\": a spread-out sample of up to 20 of its pages.",
        input_schema: { type: "object", properties: { section: { type: "string" } } },
      },
      {
        name: "fetch_page",
        description:
          "Load one page of the live site as a signed-out visitor. Returns status, load time, redirects, title, a text excerpt and any retired or broken-looking words it spotted.",
        input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
      },
      {
        name: "check_links",
        description: "Load a page and test up to 25 of its internal links. Returns the ones that are broken.",
        input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
      }
    );
  }

  if (worker.key === "reviewer") {
    tools.push({
      name: "review_finding",
      description: "Record your verdict on one new finding.",
      input_schema: {
        type: "object",
        properties: {
          id: { type: "string" },
          verdict: { type: "string", enum: ["approve", "reject", "escalate"] },
          risk: { type: "string", enum: RISKS },
          note: { type: "string", description: "One sentence: why." },
        },
        required: ["id", "verdict", "risk", "note"],
      },
    });
    return tools;
  }

  tools.push(
    {
      name: "create_finding",
      description:
        "File a ticket for something Chris (or a fixer) should act on. Only with evidence. Check your open findings first " +
        "and don't file duplicates. kind: queue (an admin item waiting), message (a draft for Chris to send or post; put " +
        "the full draft in detail), data (a data problem with the exact fix), bug (something broken on the site), " +
        "decision (Chris needs to choose), idea (an improvement; use sparingly).",
      input_schema: {
        type: "object",
        properties: {
          role: { type: "string", enum: worker.roles },
          kind: { type: "string", enum: KINDS },
          risk: { type: "string", enum: RISKS },
          title: { type: "string", description: "One short line." },
          detail: { type: "string" },
          suggested_action: { type: "string" },
          evidence: { type: "string", description: "The numbers, ids or rows that prove it." },
          link: { type: "string", description: "Admin or site path, e.g. /admin/reports" },
        },
        required: ["role", "kind", "risk", "title", "evidence"],
      },
    },
    {
      name: "update_finding",
      description:
        "Update a finding: verified (you re-checked one Chris marked fixed and it's resolved), open (it isn't actually " +
        "fixed), or dismissed (withdraw your own finding that no longer applies). Add a short note.",
      input_schema: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["verified", "open", "dismissed"] },
          note: { type: "string" },
        },
        required: ["id", "status", "note"],
      },
    },
    {
      name: "record_scorecard",
      description:
        "Record your scorecard for this run: each goal or key number, its value, the target or normal range, and " +
        "on_track / watch / off_track. Set nothing_needs_chris to true when nothing is off target and nothing needs him.",
      input_schema: {
        type: "object",
        properties: {
          metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "string" },
                target: { type: "string" },
                status: { type: "string", enum: ["on_track", "watch", "off_track"] },
              },
              required: ["name", "value", "status"],
            },
          },
          nothing_needs_chris: { type: "boolean" },
        },
        required: ["metrics", "nothing_needs_chris"],
      },
    }
  );
  return tools;
}

function str(v: unknown, max = 4000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  state: RunState
): Promise<{ content: string; isError?: boolean }> {
  const w = state.worker;
  try {
    switch (name) {
      case "query_database": {
        const limit = w.maxQueries ?? OPS_LIMITS.maxQueries;
        if (state.queries >= limit) {
          return { content: `Query limit reached (${limit}). Write your report with what you have.`, isError: true };
        }
        state.queries++;
        const { data, error } = await supabaseAdmin.rpc("ops_query", { q: str(input.sql), max_rows: 50 });
        if (error) return { content: `Query failed: ${error.message}`, isError: true };
        const text = JSON.stringify(data ?? []);
        return {
          content:
            text.length > OPS_LIMITS.maxResultChars
              ? text.slice(0, OPS_LIMITS.maxResultChars) + " ...(cut off: aggregate instead)"
              : text,
        };
      }
      case "save_memory": {
        const kind = str(input.kind);
        if (!["rule", "fact", "thread", "example"].includes(kind)) return { content: "Unknown memory kind.", isError: true };
        const { data, error } = await supabaseAdmin
          .from("ops_memory")
          .insert({ worker_key: w.key, kind, content: str(input.content, 600), source: "agent" })
          .select("id")
          .single();
        if (error) return { content: error.message, isError: true };
        return { content: `Saved (${data.id}).` };
      }
      case "retire_memory": {
        let q = supabaseAdmin
          .from("ops_memory")
          .update({ active: false, retired_at: new Date().toISOString() })
          .eq("id", str(input.id));
        // Only the weekly review may tidy other workers' memory.
        if (w.key !== "weekly") q = q.eq("worker_key", w.key);
        const { error } = await q;
        return error ? { content: error.message, isError: true } : { content: "Retired." };
      }
      case "create_finding": {
        const kind = str(input.kind);
        const risk = str(input.risk);
        if (!KINDS.includes(kind) || !RISKS.includes(risk)) return { content: "Bad kind or risk.", isError: true };
        if (state.findingsCreated >= 12) return { content: "That's enough findings for one run. Prioritise.", isError: true };
        const title = str(input.title, 200);
        // A quiet duplicate check, so the same thing isn't filed every morning.
        const { data: dup } = await supabaseAdmin
          .from("ops_findings")
          .select("id")
          .eq("worker_key", w.key)
          .eq("title", title)
          .in("status", ["new", "open", "in_progress"])
          .limit(1);
        if (dup && dup.length > 0) return { content: `Already open as ${dup[0].id}. Update it instead of filing again.` };
        const { data, error } = await supabaseAdmin
          .from("ops_findings")
          .insert({
            worker_key: w.key,
            role: w.roles.includes(str(input.role)) ? str(input.role) : w.roles[0],
            kind,
            risk,
            title,
            detail: str(input.detail, 6000) || null,
            suggested_action: str(input.suggested_action, 1000) || null,
            evidence: str(input.evidence, 2000) || null,
            link: str(input.link, 300) || null,
            run_id: state.runId,
          })
          .select("id")
          .single();
        if (error) return { content: error.message, isError: true };
        state.findingsCreated++;
        return { content: `Filed (${data.id}).` };
      }
      case "update_finding": {
        const status = str(input.status);
        if (!["verified", "open", "dismissed"].includes(status)) return { content: "Bad status.", isError: true };
        const note = str(input.note, 500);
        const { data: row } = await supabaseAdmin
          .from("ops_findings")
          .select("id, worker_key, status, reviewer_note")
          .eq("id", str(input.id))
          .maybeSingle();
        if (!row) return { content: "No finding with that id.", isError: true };
        const teamWide = w.key === "morning" || w.key === "weekly";
        const own = row.worker_key === w.key;
        if (!own && !teamWide) return { content: "You can only update your own findings.", isError: true };
        // Allowed moves: verify or reopen something Chris marked fixed; withdraw your own open finding.
        const allowed =
          (row.status === "fixed" && (status === "verified" || status === "open")) ||
          (own && status === "dismissed" && (row.status === "new" || row.status === "open"));
        if (!allowed) return { content: `Can't move a ${row.status} finding to ${status}.`, isError: true };
        const { error } = await supabaseAdmin
          .from("ops_findings")
          .update({
            status,
            reviewer_note: [row.reviewer_note, `${w.name}: ${note}`].filter(Boolean).join("\n"),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        return error ? { content: error.message, isError: true } : { content: "Updated." };
      }
      case "record_scorecard": {
        state.scorecard = Array.isArray(input.metrics) ? input.metrics.slice(0, 20) : [];
        state.nothingNeeded = input.nothing_needs_chris === true;
        return { content: "Scorecard recorded." };
      }
      case "review_finding": {
        const verdict = str(input.verdict);
        const risk = str(input.risk);
        if (!["approve", "reject", "escalate"].includes(verdict) || !RISKS.includes(risk)) {
          return { content: "Bad verdict or risk.", isError: true };
        }
        const { data: f } = await supabaseAdmin
          .from("ops_findings")
          .select("id, status, risk")
          .eq("id", str(input.id))
          .maybeSingle();
        if (!f || f.status !== "new") return { content: "Not a new finding.", isError: true };
        // The reviewer can raise risk but never lower a worker's "high".
        const finalRisk = f.risk === "high" ? "high" : risk;
        const { error } = await supabaseAdmin
          .from("ops_findings")
          .update({
            reviewer_verdict: verdict,
            reviewer_note: str(input.note, 500),
            risk: finalRisk,
            status: verdict === "reject" ? "dismissed" : "open",
            updated_at: new Date().toISOString(),
          })
          .eq("id", f.id);
        return error ? { content: error.message, isError: true } : { content: "Recorded." };
      }
      case "list_new_support_emails": {
        const recent = await listSupportEmails(7, 25);
        const seen = await seenIds(recent.map((m) => m.id));
        const fresh = recent.filter((m) => !seen.has(m.id));
        const out: { id: string; from: string; subject: string; date: string; snippet: string }[] = [];
        for (const m of fresh.slice(0, 10)) {
          if (await threadAnswered(m.threadId)) {
            await supabaseAdmin.from("ops_support_seen").upsert({ message_id: m.id, thread_id: m.threadId, action: "already_answered" });
            continue;
          }
          const e = await readSupportEmail(m.id);
          out.push({ id: e.id, from: senderName(e.from), subject: e.subject, date: e.date, snippet: e.snippet });
        }
        return { content: out.length ? JSON.stringify(out) : "No new support email." };
      }
      case "read_support_email": {
        const e = await readSupportEmail(str(input.id));
        return {
          content: JSON.stringify({ id: e.id, from: senderName(e.from), subject: e.subject, date: e.date, message: e.body }),
        };
      }
      case "search_help": {
        const words = str(input.query, 200).toLowerCase().split(/\W+/).filter((x) => x.length > 2);
        const scored = getHelpArticles("member")
          .map((a) => {
            const hay = `${a.title} ${a.summary ?? ""} ${(a.keywords ?? []).join(" ")}`.toLowerCase();
            return { a, score: words.reduce((n, wd) => n + (hay.includes(wd) ? 1 : 0), 0) };
          })
          .filter((x) => x.score > 0)
          .sort((x, y) => y.score - x.score)
          .slice(0, 6);
        return {
          content: scored.length
            ? JSON.stringify(scored.map(({ a }) => ({ slug: a.slug, title: a.title, summary: a.summary })))
            : "No matching help articles.",
        };
      }
      case "read_help": {
        const a = getHelpArticles("member").find((x) => x.slug === str(input.slug, 200));
        return a
          ? { content: `# ${a.title}\n${a.body.slice(0, 8000)}` }
          : { content: "No help article with that slug.", isError: true };
      }
      case "draft_reply": {
        const id = str(input.id);
        const reply = str(input.reply, 5000);
        if (!reply) return { content: "The reply is empty.", isError: true };
        const seen = await seenIds([id]);
        if (seen.has(id)) return { content: "Already handled.", isError: true };
        const e = await readSupportEmail(id);
        const draftId = await createReplyDraft(e, reply);
        await supabaseAdmin
          .from("ops_support_seen")
          .upsert({ message_id: e.id, thread_id: e.threadId, action: "drafted", draft_id: draftId });
        await supabaseAdmin.from("ops_findings").insert({
          worker_key: w.key,
          role: "support",
          kind: "message",
          risk: "medium",
          title: `Reply drafted: ${str(input.topic, 120) || e.subject}`.slice(0, 200),
          detail: `**From:** ${senderName(e.from)}\n**Subject:** ${e.subject}\n\n**Their message:**\n${e.body.slice(0, 1500)}\n\n**Draft reply (in your Gmail Drafts):**\n${reply}`,
          suggested_action: "Open Gmail Drafts, check the reply, edit if needed and send.",
          evidence: `Gmail message ${e.id}`,
          link: "https://mail.google.com/mail/u/0/#drafts",
          run_id: state.runId,
        });
        state.findingsCreated++;
        return { content: "Draft saved in Gmail and filed for Chris." };
      }
      case "skip_email": {
        const id = str(input.id);
        await supabaseAdmin
          .from("ops_support_seen")
          .upsert({ message_id: id, action: `skipped: ${str(input.reason, 200)}` });
        return { content: "Marked handled." };
      }
      case "list_site_pages": {
        if (state.fetches >= MAX_FETCHES) return { content: "Page limit reached. Write your report.", isError: true };
        state.fetches++;
        return { content: JSON.stringify(await listSitePages(str(input.section, 100) || undefined)).slice(0, OPS_LIMITS.maxResultChars) };
      }
      case "fetch_page": {
        if (state.fetches >= MAX_FETCHES) return { content: "Page limit reached. Write your report.", isError: true };
        state.fetches++;
        return { content: JSON.stringify(await fetchPage(str(input.path, 500))) };
      }
      case "check_links": {
        if (state.fetches >= MAX_FETCHES - 5) return { content: "Page limit reached. Write your report.", isError: true };
        state.fetches += 5;
        return { content: JSON.stringify(await checkLinks(str(input.path, 500))) };
      }
      default:
        return { content: `Unknown tool ${name}.`, isError: true };
    }
  } catch (e) {
    return { content: e instanceof Error ? e.message : String(e), isError: true };
  }
}
