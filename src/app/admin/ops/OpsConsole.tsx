"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle, ArrowRight, Bot, Brain, Check, ChevronDown, CircleHelp, ExternalLink, Github, History, ListChecks,
  Loader2, Mail, MessageSquarePlus, Newspaper, Play, RotateCcw, ShieldCheck, Sparkles, ThumbsUp, Users, Wrench, X,
} from "lucide-react";

export type Finding = {
  id: string;
  worker_key: string;
  role: string | null;
  kind: string;
  risk: "low" | "medium" | "high";
  status: string;
  title: string;
  detail: string | null;
  suggested_action: string | null;
  evidence: string | null;
  link: string | null;
  reviewer_verdict: string | null;
  reviewer_note: string | null;
  rating: number | null;
  rating_note: string | null;
  github_issue_url: string | null;
  created_at: string;
  updated_at: string;
  proposal: { type: string; subject?: string; body?: string; store_ids?: string[] } | null;
  chris_reply: string | null;
  /** What Yes does, worked out on the server (lib/ops/proposals.ts). */
  answer: Answer;
  /** For email proposals: the shops it goes to. */
  recipients?: { shop: string; hasEmail: boolean }[];
};

export type Answer = "email" | "fix" | "approve" | "done";

export type OpsData = {
  setupMissing: boolean;
  configured: { claude: boolean; github: boolean };
  settings: { enabled: boolean; capCents: number; briefEmail: string };
  spentCents: number;
  workers: {
    key: string;
    name: string;
    schedule: string;
    model: string;
    needsNote: string | null;
    about: { job: string; whenOn: string; whenOff: string };
    lastResult: string | null;
    enabled: boolean;
    lastRunAt: string | null;
    lastStatus: string | null;
    running: boolean;
    spentCents: number;
    filed30: number;
    acted30: number;
  }[];
  brief: { id: string; workerKey: string; report: string; startedAt: string } | null;
  waiting: Finding[];
  done: Finding[];
  dismissed: Finding[];
  runs: {
    id: string;
    worker_key: string;
    trigger: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    queries: number;
    cost_cents: number;
    report: string | null;
    error: string | null;
    nothing_needed: boolean;
  }[];
  memory: { id: string; worker_key: string; kind: string; content: string; source: string; created_at: string }[];
};

type Act = (key: string, payload: Record<string, unknown>, okText?: string) => Promise<void>;
type Tab = "todo" | "brief" | "team" | "history" | "memory";

const CARD = "rounded-2xl border border-ocean-800/60 bg-ocean-900/40";
const INPUT =
  "w-full rounded-xl border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white placeholder:text-ocean-600 focus:border-emerald-500 focus:outline-none";
const PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50";
const SECONDARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-ocean-700 px-4 py-2 text-sm text-ocean-100 hover:border-emerald-500 hover:text-white disabled:opacity-50";
const QUIET = "text-sm text-ocean-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50";

function when(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Whole days since a date, for "waiting 5 days". */
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function waitingFor(iso: string): string {
  const d = daysSince(iso);
  if (d < 1) return "new today";
  if (d === 1) return "waiting 1 day";
  return `waiting ${d} days`;
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ocean-100 [&_a]:text-emerald-300 [&_a:hover]:text-emerald-200 [&_h1]:font-display [&_h1]:text-xl [&_h1]:text-white [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h3]:font-semibold [&_h3]:text-white [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-white [&_table]:w-full [&_table]:text-left [&_td]:border-b [&_td]:border-ocean-800/60 [&_td]:py-1.5 [&_td]:pr-3 [&_th]:border-b [&_th]:border-ocean-700 [&_th]:py-1.5 [&_th]:pr-3 [&_th]:font-medium [&_th]:text-ocean-300 [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

// Plain words for who found it.
const FROM: Record<string, string> = {
  morning: "Morning check",
  community: "Community manager",
  cmo: "Marketing",
  partnerships: "Shop partnerships",
  weekly: "Weekly review",
  qa: "Site health check",
  reviewer: "Reviewer",
};

const URGENCY: Record<string, { label: string; dot: string; text: string }> = {
  high: { label: "Urgent", dot: "bg-coral-400", text: "text-coral-300" },
  medium: { label: "This week", dot: "bg-amber-400", text: "text-amber-300" },
  low: { label: "When you have time", dot: "bg-emerald-400", text: "text-emerald-300" },
};

/**
 * To-do items are grouped by what Chris actually has to do, so each group
 * needs only one line of explanation and every card has one obvious button.
 */
const GROUPS: { answer: Answer; title: string; how: string; Icon: typeof ListChecks }[] = [
  {
    answer: "done",
    title: "Do these yourself",
    how: "The team can't do these for you. Open the page, take care of it, then press Mark done. The team checks it on its next run.",
    Icon: ListChecks,
  },
  {
    answer: "email",
    title: "Emails ready to send",
    how: "Read the email, change anything you like, then send. It goes out from support@ and replies come to you.",
    Icon: Mail,
  },
  {
    answer: "fix",
    title: "Fixes Claude can make",
    how: "Claude writes the fix on GitHub and gives you a preview link. Nothing goes live until you merge it.",
    Icon: Wrench,
  },
  {
    answer: "approve",
    title: "Plans to approve",
    how: "Approve and the team carries it out on its next run, exactly as written here. Edit it first if you like.",
    Icon: Sparkles,
  },
];

export default function OpsConsole({ data }: { data: OpsData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>("todo");
  const [, startTransition] = useTransition();

  const act: Act = async (key, payload, okText) => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMessage({ text: json.error ?? "Something went wrong.", bad: true });
      else if (json.outcome) {
        const o = json.outcome as { status: string; reason?: string; costCents?: number };
        setMessage(
          o.status === "done"
            ? { text: `Run finished${typeof o.costCents === "number" ? ` (${dollars(o.costCents)})` : ""}.`, bad: false }
            : { text: `${o.status === "skipped" ? "Skipped" : "Didn't finish"}: ${o.reason ?? ""}`, bad: o.status !== "skipped" }
        );
      } else if (json.message) setMessage({ text: json.message, bad: false });
      else if (json.url) setMessage({ text: "Sent to GitHub. Claude will post a preview link there.", bad: false });
      else if (okText) setMessage({ text: okText, bad: false });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  if (data.setupMissing) {
    return (
      <div className={`${CARD} p-8`}>
        <h1 className="mb-2 font-display text-2xl text-white">AI team</h1>
        <p className="text-ocean-200">
          The team&apos;s tables aren&apos;t in the database yet. Run <code className="text-amber-200">ops_team_setup.sql</code> in
          the Supabase SQL Editor, then reload this page.
        </p>
      </div>
    );
  }

  const workersOn = data.workers.filter((w) => w.enabled && !w.needsNote).length;
  const failing = data.workers.filter((w) => w.enabled && w.lastStatus === "error");
  const oldest = data.waiting.reduce<string | null>((o, f) => (!o || f.created_at < o ? f.created_at : o), null);
  const pct = Math.min(100, Math.round((data.spentCents / Math.max(1, data.settings.capCents)) * 100));

  const TABS: { key: Tab; label: string; count?: number; Icon: typeof ListChecks }[] = [
    { key: "todo", label: "To do", count: data.waiting.length, Icon: ListChecks },
    { key: "brief", label: "Brief", Icon: Newspaper },
    { key: "team", label: "Team", Icon: Users },
    { key: "history", label: "History", Icon: History },
    { key: "memory", label: "Memory", Icon: Brain },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl text-white">
            <Bot className="h-7 w-7 text-amber-300" /> AI team
          </h1>
          <p className="mt-1 text-ocean-200">Your workers check the site and suggest what to do. Nothing happens without your OK.</p>
        </div>
        <MasterSwitch enabled={data.settings.enabled} busy={busy} act={act} />
      </div>

      {!data.configured.claude && (
        <div className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Add <code>ANTHROPIC_API_KEY</code> in Vercel (Settings, Environment Variables) and redeploy. Until then nothing runs.
          </p>
        </div>
      )}

      {/* Three tiles: what needs you, is the team healthy, what it costs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => setTab("todo")} className={`${CARD} p-4 text-left transition-colors hover:border-emerald-500/60`}>
          <p className="text-sm text-ocean-300">Needs you</p>
          <p className={`mt-1 text-3xl font-semibold ${data.waiting.length ? "text-amber-300" : "text-emerald-300"}`}>
            {data.waiting.length}
          </p>
          <p className="mt-1 text-sm text-ocean-300">
            {data.waiting.length === 0 ? "All clear" : oldest && daysSince(oldest) >= 1 ? `Oldest ${waitingFor(oldest)}` : "All new today"}
          </p>
        </button>
        <button onClick={() => setTab("team")} className={`${CARD} p-4 text-left transition-colors hover:border-emerald-500/60`}>
          <p className="text-sm text-ocean-300">Team</p>
          <p className="mt-1 text-3xl font-semibold text-white">
            {data.settings.enabled ? `${workersOn} of ${data.workers.length}` : "Paused"}
          </p>
          <p className={`mt-1 text-sm ${failing.length ? "text-coral-300" : "text-ocean-300"}`}>
            {!data.settings.enabled
              ? "Nothing runs until you turn it on"
              : failing.length
                ? `${failing.length} didn't finish last run`
                : "workers on, all running fine"}
          </p>
        </button>
        <button onClick={() => setTab("team")} className={`${CARD} p-4 text-left transition-colors hover:border-emerald-500/60`}>
          <p className="text-sm text-ocean-300">This month</p>
          <p className="mt-1 text-3xl font-semibold text-white">{dollars(data.spentCents)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ocean-950">
            <div className={`h-full rounded-full ${pct >= 90 ? "bg-coral-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-sm text-ocean-300">of a {dollars(data.settings.capCents)} cap</p>
        </button>
      </div>

      <HowItWorks />

      {/* Tabs */}
      <div className="-mx-1 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${
                tab === t.key ? "bg-ocean-700 text-white" : "text-ocean-300 hover:bg-ocean-900 hover:text-white"
              }`}
            >
              <t.Icon className="h-4 w-4" /> {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-ocean-950">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            message.bad ? "border-coral-500/40 bg-coral-500/10 text-coral-100" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          <p>{message.text}</p>
          <button onClick={() => setMessage(null)} aria-label="Close" className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {tab === "todo" && <TodoTab data={data} busy={busy} act={act} />}
      {tab === "brief" && <BriefTab data={data} busy={busy} act={act} />}
      {tab === "team" && <TeamTab data={data} busy={busy} act={act} />}
      {tab === "history" && <HistoryTab data={data} busy={busy} act={act} />}
      {tab === "memory" && <MemoryTab data={data} busy={busy} act={act} />}
    </div>
  );
}

function MasterSwitch({ enabled, busy, act }: { enabled: boolean; busy: string | null; act: Act }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => act("master", { action: "settings", enabled: !enabled }, enabled ? "Team paused. Nothing will run." : "Team on.")}
      disabled={busy !== null}
      className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left disabled:opacity-50 ${
        enabled ? "border-emerald-500/40 bg-emerald-500/10" : "border-ocean-700 bg-ocean-900/60"
      }`}
    >
      <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-ocean-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-white">{enabled ? "Team is on" : "Team is paused"}</span>
        <span className="block text-xs text-ocean-300">{enabled ? "Tap to pause everything" : "Tap to turn it back on"}</span>
      </span>
    </button>
  );
}

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <section className={`${CARD} px-4 py-3`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-sm text-ocean-200 hover:text-white">
        <CircleHelp className="h-4 w-4 text-sky-300" />
        <span className="flex-1">How this works, and your 5 minutes a day</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="mt-4 grid gap-6 pb-1 text-sm sm:grid-cols-2">
          <ol className="space-y-2.5 text-ocean-100">
            {[
              "Each worker checks the site on its own schedule (see Team). Quiet days cost almost nothing.",
              "A reviewer double-checks what they find and throws out the noise.",
              "Anything that needs you lands in To do, sorted by what you have to do.",
              "Each item has one main button. If it's wrong, press Not needed or Ask for changes and the team learns from it.",
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ocean-800 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <div>
            <p className="mb-2 font-medium text-white">Your 5 minutes a day</p>
            <ul className="space-y-2 text-ocean-100">
              {[
                "Read the morning brief (Brief tab, or your email).",
                "Clear the To do tab, top to bottom.",
                "Send any support@ drafts in Gmail after a look.",
                "Merge good fixes on GitHub.",
                "Got a standing rule? Add it under Memory.",
              ].map((s) => (
                <li key={s} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ To do ------------------------------ */

function TodoTab({ data, busy, act }: { data: OpsData; busy: string | null; act: Act }) {
  const fixing = data.waiting.filter((f) => f.status === "in_progress");
  const open = data.waiting.filter((f) => f.status !== "in_progress");
  // Most urgent first, then oldest first, so nothing sits forgotten at the bottom.
  const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const sorted = [...open].sort((a, b) => (rank[a.risk] ?? 1) - (rank[b.risk] ?? 1) || a.created_at.localeCompare(b.created_at));

  if (data.waiting.length === 0) {
    return (
      <div className={`${CARD} flex flex-col items-center gap-2 p-10 text-center`}>
        <Check className="h-8 w-8 text-emerald-400" />
        <p className="text-lg font-medium text-white">Nothing needs you right now</p>
        <p className="text-sm text-ocean-300">New items show up here after the workers run. The morning check runs at 6:30 am.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {GROUPS.map((g) => {
        const items = sorted.filter((f) => f.answer === g.answer);
        if (!items.length) return null;
        return (
          <section key={g.answer}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <g.Icon className="h-5 w-5 text-ocean-300" /> {g.title} <span className="text-ocean-400">({items.length})</span>
            </h2>
            <p className="mb-3 mt-1 text-sm text-ocean-300">{g.how}</p>
            <div className="space-y-3">
              {items.map((f) => (
                <TaskCard key={f.id} f={f} busy={busy} act={act} />
              ))}
            </div>
          </section>
        );
      })}

      {fixing.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Loader2 className="h-5 w-5 text-sky-300" /> Claude is fixing <span className="text-ocean-400">({fixing.length})</span>
          </h2>
          <p className="mb-3 mt-1 text-sm text-ocean-300">
            Open it on GitHub, check the preview link, merge it if it looks right, then press Mark done.
          </p>
          <div className="space-y-3">
            {fixing.map((f) => (
              <div key={f.id} id={f.id} className={`${CARD} p-4`}>
                <TaskMeta f={f} />
                <p className="mt-1.5 font-medium text-white">{f.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {f.github_issue_url && (
                    <a href={f.github_issue_url} target="_blank" rel="noreferrer" className={SECONDARY}>
                      <Github className="h-4 w-4" /> Open on GitHub
                    </a>
                  )}
                  <button
                    onClick={() => act(`d-${f.id}`, { action: "finding_status", id: f.id, status: "fixed" }, "Marked done.")}
                    disabled={busy !== null}
                    className={PRIMARY}
                  >
                    <Check className="h-4 w-4" /> Mark done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function safeLink(link: string | null): string | null {
  // Only our own pages or plain https links: a finding's text can echo member content.
  return link && (/^\/(?!\/)/.test(link) || /^https:\/\//.test(link)) ? link : null;
}

/** One quiet line: how urgent, who found it, how long it's waited. */
function TaskMeta({ f }: { f: Finding }) {
  const u = URGENCY[f.risk] ?? URGENCY.medium;
  const stale = daysSince(f.created_at) >= 7;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className={`inline-flex items-center gap-1.5 font-medium ${u.text}`}>
        <span className={`h-2 w-2 rounded-full ${u.dot}`} /> {u.label}
      </span>
      <span className="text-ocean-400">·</span>
      <span className="text-ocean-300">{FROM[f.worker_key] ?? f.worker_key}</span>
      <span className="text-ocean-400">·</span>
      <span className={stale ? "text-amber-300" : "text-ocean-300"}>{waitingFor(f.created_at)}</span>
      {f.reviewer_verdict === "approve" && (
        <span title="The reviewer checked this against the data" className="inline-flex items-center text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          <span className="sr-only">double-checked</span>
        </span>
      )}
    </p>
  );
}

/** Where a link goes, in words: our own pages by path, anything else as "an outside page". */
function pageName(link: string): string {
  return link.startsWith("/") ? link.split(/[?#]/)[0] : "the page";
}

/**
 * What the team recommends for an item, and what every button on its card
 * does. Kept in one place so the card's words always match what happens.
 */
function guideFor(
  f: Finding,
  link: string | null,
  canSend: number,
  open: boolean
): { recommend: string; steps?: string[]; buttons: { label: string; does: string; main?: boolean }[] } {
  const quiet = [
    { label: "Not needed", does: "Clears it without doing anything. Add a reason and the team learns not to flag things like this." },
    { label: "Ask for changes", does: "Sends it back to the team with your note. They rewrite it and it comes back here." },
  ];
  const suggestion = f.suggested_action?.trim();
  const shops = `${canSend} shop${canSend === 1 ? "" : "s"}`;
  switch (f.answer) {
    case "done":
      return {
        recommend: suggestion || "Take a look and handle this yourself.",
        steps: [
          link ? `Press Open the page (goes to ${pageName(link)}).` : "Find it in the admin area.",
          "Take care of it there.",
          "Come back and press Mark done.",
        ],
        buttons: [
          ...(link ? [{ label: "Open the page", does: `Takes you to ${pageName(link)}. Nothing changes until you act there.`, main: true }] : []),
          {
            label: "Mark done",
            does: "Tells the team you handled it and moves it to History. The team checks on its next run, and brings it back if it isn't done.",
            main: !link,
          },
          ...quiet,
        ],
      };
    case "email":
      return {
        recommend: `Send this email to ${shops}.${suggestion ? ` ${suggestion}` : ""}`,
        steps: open ? undefined : ["Press Read the email.", "Change anything you like.", `Press Send to ${shops}.`],
        buttons: [
          open
            ? {
                label: `Send to ${shops}`,
                does: "Emails each shop right away from support@, with their name filled in. Replies go to you. Shops with no email are skipped.",
                main: true,
              }
            : { label: "Read the email", does: "Opens the email so you can read and edit it. Nothing is sent yet.", main: true },
          ...quiet,
        ],
      };
    case "fix":
      return {
        recommend: `Let Claude fix this.${suggestion ? ` ${suggestion}` : ""}`,
        buttons: [
          {
            label: "Have Claude fix it",
            does: "Claude writes the fix on GitHub and posts a preview link. The live site doesn't change until you merge it there.",
            main: true,
          },
          ...quiet,
        ],
      };
    case "approve":
      return {
        recommend: suggestion || "Approve this plan.",
        steps: open ? undefined : ["Press Read the plan.", "Edit it if you like.", "Press Approve."],
        buttons: [
          open
            ? { label: "Approve", does: "The team carries out the plan exactly as written above on its next run. Nothing for you to do.", main: true }
            : { label: "Read the plan", does: "Opens the plan so you can read and edit it. Nothing happens yet.", main: true },
          ...quiet,
        ],
      };
  }
}

function TaskCard({ f, busy, act }: { f: Finding; busy: string | null; act: Act }) {
  const email = f.answer === "email" && f.proposal?.type === "email" ? f.proposal : null;
  const link = safeLink(f.link);
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  const [mode, setMode] = useState<"none" | "no" | "else">("none");
  const [plan, setPlan] = useState(f.suggested_action ?? "");
  const [subject, setSubject] = useState(email?.subject ?? "");
  const [body, setBody] = useState(email?.body ?? "");
  const [reason, setReason] = useState("");
  const [reply, setReply] = useState("");
  const [reviseNow, setReviseNow] = useState(true);
  const working = busy !== null;
  const canSend = (f.recipients ?? []).filter((r) => r.hasEmail).length;
  const guide = guideFor(f, link, canSend, open);

  const yes = () =>
    act(
      `y-${f.id}`,
      { action: "finding_yes", id: f.id, suggestion: f.answer === "approve" ? plan : f.suggested_action ?? "", ...(email ? { subject, body } : {}) },
      f.answer === "done" ? "Marked done. The team will check it on its next run." : undefined
    );
  const spin = (k: string) => busy === k && <Loader2 className="h-4 w-4 animate-spin" />;

  // The one main button for each kind of item.
  const main = (() => {
    switch (f.answer) {
      case "done":
        return (
          <>
            {link && (
              <a href={link} className={PRIMARY}>
                Open the page <ArrowRight className="h-4 w-4" />
              </a>
            )}
            <button onClick={yes} disabled={working} className={link ? SECONDARY : PRIMARY}>
              {spin(`y-${f.id}`) || <Check className="h-4 w-4" />} Mark done
            </button>
          </>
        );
      case "email":
        return open ? (
          <button onClick={yes} disabled={working || !subject.trim() || !body.trim() || canSend === 0} className={PRIMARY}>
            {spin(`y-${f.id}`) || <Mail className="h-4 w-4" />} Send to {canSend} shop{canSend === 1 ? "" : "s"}
          </button>
        ) : (
          <button onClick={() => setOpen(true)} className={PRIMARY}>
            Read the email <ArrowRight className="h-4 w-4" />
          </button>
        );
      case "fix":
        return (
          <button onClick={yes} disabled={working} className={PRIMARY}>
            {spin(`y-${f.id}`) || <Wrench className="h-4 w-4" />} Have Claude fix it
          </button>
        );
      case "approve":
        return open ? (
          <button onClick={yes} disabled={working || !plan.trim()} className={PRIMARY}>
            {spin(`y-${f.id}`) || <Check className="h-4 w-4" />} Approve
          </button>
        ) : (
          <button onClick={() => setOpen(true)} className={PRIMARY}>
            Read the plan <ArrowRight className="h-4 w-4" />
          </button>
        );
    }
  })();

  return (
    <div id={f.id} className={`${CARD} p-4 sm:p-5`}>
      <TaskMeta f={f} />
      <p className="mt-1.5 text-lg font-medium leading-snug text-white">{f.title}</p>

      {/* The team's recommendation, in plain words, naming the button to press */}
      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
          <ThumbsUp className="h-4 w-4" /> We recommend
        </p>
        <p className="mt-1 text-ocean-50">{guide.recommend}</p>
        {guide.steps && (
          <ol className="mt-2 space-y-1 text-sm text-ocean-100">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ocean-800 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {f.chris_reply && (
        <p className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          You asked for: &ldquo;{f.chris_reply}&rdquo;. The team will revise this on its next run.
        </p>
      )}

      {/* Email and plan details open only when asked for */}
      {open && email && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ocean-200">
              Goes to {f.recipients?.length ?? 0} shop{f.recipients?.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(f.recipients ?? []).map((r) => (
                <span
                  key={r.shop}
                  className={`rounded-full px-2.5 py-1 text-xs ${r.hasEmail ? "bg-ocean-800 text-ocean-100" : "bg-ocean-950 text-ocean-500 line-through"}`}
                  title={r.hasEmail ? undefined : "No email on file, will be skipped"}
                >
                  {r.shop}
                </span>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean-200">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean-200">Email</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className={INPUT} />
            <span className="mt-1 block text-xs text-ocean-400">
              {"{{shop_name}}"} and {"{{owner_first_name}}"} are filled in for each shop.
            </span>
          </label>
        </div>
      )}
      {open && f.answer === "approve" && (
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-ocean-200">The plan (edit it if you like)</span>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            rows={Math.min(8, Math.max(3, Math.ceil(plan.length / 90)))}
            className={INPUT}
          />
        </label>
      )}

      {/* Buttons: one main action, two quiet ones */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">{main}</div>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => setMode(mode === "no" ? "none" : "no")} disabled={working} className={QUIET}>
            Not needed
          </button>
          <button onClick={() => setMode(mode === "else" ? "none" : "else")} disabled={working} className={QUIET}>
            Ask for changes
          </button>
          {(f.detail || f.evidence || f.reviewer_note) && (
            <button onClick={() => setWhy(!why)} className={QUIET}>
              {why ? "Hide details" : "Why?"}
            </button>
          )}
          {f.answer !== "done" && link && (
            <a href={link} className={`${QUIET} inline-flex items-center gap-1`}>
              Open page <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {open && (
            <button onClick={() => setOpen(false)} className={QUIET}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* What every button on this card does, so nothing is a guess */}
      <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-ocean-800/60 pt-3 text-sm sm:grid-cols-[auto,1fr]">
        {guide.buttons.map((b) => (
          <div key={b.label} className="contents">
            <dt className={b.main ? "font-semibold text-emerald-300" : "font-medium text-ocean-100"}>{b.label}</dt>
            <dd className="mb-1 text-ocean-300 sm:mb-0">{b.does}</dd>
          </div>
        ))}
      </dl>

      {why && (
        <div className="mt-3 space-y-3 rounded-xl bg-ocean-950/60 p-3 text-sm">
          {f.detail && <Markdown>{f.detail}</Markdown>}
          {f.evidence && <p className="whitespace-pre-wrap text-ocean-200">{f.evidence}</p>}
          {f.reviewer_note && <p className="text-ocean-300">Reviewer: {f.reviewer_note}</p>}
        </div>
      )}

      {mode === "no" && (
        <div className="mt-3 space-y-2 rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-3">
          <p className="text-sm text-ocean-200">This clears it. Saying why teaches the team not to flag things like this again.</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why not? (optional)" className={INPUT} />
          <button
            onClick={() => act(`n-${f.id}`, { action: "finding_no", id: f.id, reason }, "Cleared.")}
            disabled={working}
            className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-coral-400 disabled:opacity-50"
          >
            {spin(`n-${f.id}`)} Clear it
          </button>
        </div>
      )}

      {mode === "else" && (
        <div className="mt-3 space-y-2 rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="What would you like instead? e.g. send it only to the Florida shops, or wait until next month"
            className={INPUT}
          />
          <label className="flex items-center gap-2 text-sm text-ocean-200">
            <input type="checkbox" checked={reviseNow} onChange={(e) => setReviseNow(e.target.checked)} className="accent-emerald-500" />
            Revise it now (a few minutes, a few cents). Otherwise it waits for the next run.
          </label>
          <button
            onClick={async () => {
              await act(`e-${f.id}`, { action: "finding_reply", id: f.id, text: reply, reviseNow });
              setReply("");
              setMode("none");
            }}
            disabled={working || !reply.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {spin(`e-${f.id}`)}
            {busy === `e-${f.id}` && reviseNow ? "Revising (up to 4 min)" : "Send to the team"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Brief ------------------------------ */

function BriefTab({ data, busy, act }: { data: OpsData; busy: string | null; act: Act }) {
  if (!data.brief) {
    return <p className={`${CARD} p-6 text-ocean-200`}>No brief yet. The morning check writes one every day at 6:30 am.</p>;
  }
  return (
    <section className={`${CARD} p-5 sm:p-6`}>
      <p className="text-sm text-ocean-300">
        {data.brief.workerKey === "weekly" ? "Weekly review" : "Morning brief"} · {when(data.brief.startedAt)}
      </p>
      <div className="mt-3">
        <Markdown>{data.brief.report}</Markdown>
      </div>
      <Teach workers={data.workers} defaultKey={data.brief.workerKey} busy={busy} act={act} />
    </section>
  );
}

/* ------------------------------ Team ------------------------------ */

function TeamTab({ data, busy, act }: { data: OpsData; busy: string | null; act: Act }) {
  return (
    <div className="space-y-6">
      <p className="text-ocean-200">
        Each switch turns one worker on or off. A worker that&apos;s off costs nothing. Run now does a check right away instead of waiting
        for its schedule.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {data.workers.map((w) => (
          <WorkerCard key={w.key} w={w} teamOn={data.settings.enabled} busy={busy} act={act} />
        ))}
      </div>

      <section className={`${CARD} p-5`}>
        <h2 className="text-lg font-semibold text-white">Spending</h2>
        <p className="mt-1 text-ocean-200">
          <span className="font-semibold text-white">{dollars(data.spentCents)}</span> spent this month. At the cap every worker stops
          until next month.
        </p>
        <div className="mt-3">
          <CapEditor
            cap={data.settings.capCents}
            onSave={(c) => act("cap", { action: "settings", monthly_cap_cents: c }, "Cap saved.")}
          />
        </div>
        <p className="mt-3 text-sm text-ocean-300">Briefs are emailed to {data.settings.briefEmail || "no one yet"}.</p>
      </section>
    </div>
  );
}

function WorkerCard({
  w,
  teamOn,
  busy,
  act,
}: {
  w: OpsData["workers"][number];
  teamOn: boolean;
  busy: string | null;
  act: Act;
}) {
  const [more, setMore] = useState(false);
  const running = busy === `r-${w.key}` || w.running;
  const failed = w.lastStatus === "error";
  const name = FROM[w.key] ?? w.name;
  const status = w.needsNote
    ? { text: "Needs setup", cls: "text-ocean-300" }
    : !w.enabled
      ? { text: "Off", cls: "text-ocean-400" }
      : failed
        ? { text: "Last run didn't finish", cls: "text-coral-300" }
        : running
          ? { text: "Running now", cls: "text-sky-300" }
          : {
              text: `Ran ${when(w.lastRunAt)}${w.lastStatus === "all quiet" ? ", all quiet" : w.lastStatus === "capped" ? ", hit the cap" : ""}`,
              cls: "text-emerald-300",
            };

  return (
    <div className={`${CARD} flex flex-col p-4 ${!w.enabled ? "opacity-80" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{name}</p>
          <p className="text-sm text-ocean-300">{w.schedule}</p>
        </div>
        {!w.needsNote && (
          <button
            role="switch"
            aria-checked={w.enabled}
            aria-label={`${name} ${w.enabled ? "on" : "off"}`}
            onClick={() => act(`t-${w.key}`, { action: "worker_toggle", key: w.key, enabled: !w.enabled }, `${name} turned ${w.enabled ? "off" : "on"}.`)}
            disabled={busy !== null}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              w.enabled ? "bg-emerald-500" : "bg-ocean-700"
            }`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${w.enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        )}
      </div>

      <p className="mt-2 text-sm text-ocean-100">{w.about.job}</p>
      <p className={`mt-2 text-sm font-medium ${status.cls}`}>{status.text}</p>
      {w.needsNote && <p className="mt-2 rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-200">{w.needsNote}</p>}

      {more && !w.needsNote && (
        <div className="mt-3 space-y-2 border-t border-ocean-800/60 pt-3 text-sm">
          <p className="text-ocean-200">{w.enabled ? w.about.whenOn : `While it's off: ${w.about.whenOff}`}</p>
          {w.lastResult && (
            <p className="text-ocean-200">
              <span className="text-ocean-400">Last result: </span>
              {w.lastResult}
            </p>
          )}
          <p className="text-ocean-300">
            {dollars(w.spentCents)} this month · {w.filed30} {w.filed30 === 1 ? "item" : "items"} in 30 days, {w.acted30} acted on
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
        {!w.needsNote && (
          <button
            onClick={() => act(`r-${w.key}`, { action: "run", key: w.key })}
            disabled={busy !== null || w.running || !teamOn}
            title={teamOn ? undefined : "Turn the team on first"}
            className="inline-flex items-center gap-1.5 rounded-full border border-ocean-700 px-3 py-1.5 text-sm text-ocean-100 hover:border-emerald-500 hover:text-white disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running (up to 4 min)" : "Run now"}
          </button>
        )}
        <button onClick={() => setMore(!more)} className={QUIET}>
          {more ? "Less" : "More"}
        </button>
      </div>
    </div>
  );
}

function CapEditor({ cap, onSave }: { cap: number; onSave: (cents: number) => void }) {
  const [value, setValue] = useState(String(cap / 100));
  return (
    <form
      className="flex flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) onSave(Math.round(n * 100));
      }}
    >
      <label className="text-ocean-200" htmlFor="ops-cap">
        Monthly cap $
      </label>
      <input
        id="ops-cap"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        className="w-24 rounded-lg border border-ocean-700 bg-ocean-950 px-2 py-1.5 text-white"
      />
      <button className="rounded-full border border-ocean-700 px-3 py-1.5 text-ocean-100 hover:border-emerald-500">Save</button>
    </form>
  );
}

/* ------------------------------ History ------------------------------ */

function HistoryTab({ data, busy, act }: { data: OpsData; busy: string | null; act: Act }) {
  return (
    <div className="space-y-4">
      <Collapsible title="Done in the last 30 days" count={data.done.length} defaultOpen>
        {data.done.length === 0 ? (
          <p className="text-sm text-ocean-300">Nothing yet.</p>
        ) : (
          data.done.map((f) => <PastCard key={f.id} f={f} busy={busy} act={act} />)
        )}
      </Collapsible>
      <Collapsible title="Cleared in the last 30 days" count={data.dismissed.length}>
        {data.dismissed.length === 0 ? (
          <p className="text-sm text-ocean-300">Nothing cleared.</p>
        ) : (
          data.dismissed.map((f) => <PastCard key={f.id} f={f} busy={busy} act={act} />)
        )}
      </Collapsible>
      <Collapsible title="Every run" count={data.runs.length}>
        <p className="text-sm text-ocean-300">Each time a worker ran, what it cost and what it wrote. Tap one to read it.</p>
        {data.runs.map((r) => (
          <details key={r.id} className="rounded-xl border border-ocean-800/60 bg-ocean-950/40 px-4 py-3">
            <summary className="cursor-pointer list-none text-sm">
              <span className="font-medium text-white">{FROM[r.worker_key] ?? data.workers.find((w) => w.key === r.worker_key)?.name ?? r.worker_key}</span>
              <span className="text-ocean-300">
                {" "}
                · {when(r.started_at)} ·{" "}
                <span className={r.status === "error" ? "text-coral-300" : ""}>
                  {r.status === "error" ? "didn't finish" : r.nothing_needed ? "all quiet" : r.status}
                </span>{" "}
                · {dollars(Number(r.cost_cents))}
              </span>
            </summary>
            <div className="mt-3">
              {r.error && <p className="mb-2 text-sm text-coral-300">{r.error}</p>}
              {r.report ? <Markdown>{r.report}</Markdown> : <p className="text-sm text-ocean-300">No report.</p>}
              <p className="mt-2 text-xs text-ocean-400">{r.queries} database lookups</p>
            </div>
          </details>
        ))}
      </Collapsible>
    </div>
  );
}

function PastCard({ f, busy, act }: { f: Finding; busy: string | null; act: Act }) {
  const link = safeLink(f.link);
  return (
    <div className="rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-4">
      <p className="text-sm text-ocean-300">
        {FROM[f.worker_key] ?? f.worker_key} · {when(f.updated_at)}
      </p>
      <p className="mt-1 font-medium text-white">{f.title}</p>
      {f.rating_note && <p className="mt-1 text-sm text-ocean-300">You said: {f.rating_note}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {link && (
          <a href={link} className={`${QUIET} inline-flex items-center gap-1`}>
            Open page <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {f.github_issue_url && (
          <a href={f.github_issue_url} target="_blank" rel="noreferrer" className={`${QUIET} inline-flex items-center gap-1`}>
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
        )}
        {f.status === "dismissed" && (
          <button
            onClick={() => act(`o-${f.id}`, { action: "finding_restore", id: f.id }, "Brought back to To do.")}
            disabled={busy !== null}
            className={`${QUIET} inline-flex items-center gap-1`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Bring it back
          </button>
        )}
      </div>
    </div>
  );
}

function Collapsible({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`${CARD} p-4`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-lg font-semibold text-white">
        <ChevronDown className={`h-5 w-5 text-ocean-300 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="flex-1">{title}</span>
        {typeof count === "number" && <span className="text-sm font-normal text-ocean-300">{count}</span>}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </section>
  );
}

/* ------------------------------ Memory ------------------------------ */

function MemoryTab({ data, busy, act }: { data: OpsData; busy: string | null; act: Act }) {
  const withMemory = data.workers.filter((w) => data.memory.some((m) => m.worker_key === w.key));
  return (
    <div className="space-y-4">
      <section className={`${CARD} p-5`}>
        <h2 className="text-lg font-semibold text-white">Teach the team a standing rule</h2>
        <p className="mt-1 text-sm text-ocean-200">
          Workers read their memory before every run. Your Not needed reasons and ratings land here too.
        </p>
        <Teach workers={data.workers} defaultKey="morning" busy={busy} act={act} bare />
      </section>

      {withMemory.length === 0 ? (
        <p className={`${CARD} p-5 text-sm text-ocean-300`}>Nothing remembered yet.</p>
      ) : (
        withMemory.map((w) => {
          const items = data.memory.filter((m) => m.worker_key === w.key);
          return (
            <Collapsible key={w.key} title={FROM[w.key] ?? w.name} count={items.length}>
              <p className="text-sm text-ocean-300">Press the X on anything wrong or out of date and the worker forgets it.</p>
              <ul className="space-y-1.5">
                {items.map((m) => (
                  <li key={m.id} className="flex items-start gap-2 rounded-lg bg-ocean-950/50 px-3 py-2 text-sm text-ocean-100">
                    <span className="mt-0.5 shrink-0 rounded bg-ocean-800 px-1.5 text-[11px] uppercase tracking-wide text-ocean-200">
                      {m.source === "chris" ? "from you" : m.kind}
                    </span>
                    <span className="flex-1">{m.content}</span>
                    <button
                      onClick={() => act(`m-${m.id}`, { action: "memory_retire", id: m.id }, "Forgotten.")}
                      disabled={busy !== null}
                      className="shrink-0 text-ocean-400 hover:text-coral-300"
                      aria-label="Forget this"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Collapsible>
          );
        })
      )}
    </div>
  );
}

function Teach({
  workers,
  defaultKey,
  busy,
  act,
  bare = false,
}: {
  workers: OpsData["workers"];
  defaultKey: string;
  busy: string | null;
  act: Act;
  bare?: boolean;
}) {
  const [note, setNote] = useState("");
  const [key, setKey] = useState(defaultKey);
  return (
    <form
      className={`mt-4 space-y-2 ${bare ? "" : "border-t border-ocean-800/60 pt-4"}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!note.trim()) return;
        await act("teach", { action: "teach", key, note }, "Saved. The worker will use it from its next run.");
        setNote("");
      }}
    >
      {!bare && <p className="text-sm font-medium text-white">Tell the team something for next time</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={key} onChange={(e) => setKey(e.target.value)} className={`${INPUT} sm:w-56`} aria-label="Which worker">
          {workers.map((w) => (
            <option key={w.key} value={w.key}>
              {FROM[w.key] ?? w.name}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. don't flag species photos under a day old"
          className={`${INPUT} flex-1`}
        />
        <button disabled={busy !== null || !note.trim()} className={PRIMARY}>
          <MessageSquarePlus className="h-4 w-4" /> Save
        </button>
      </div>
    </form>
  );
}
