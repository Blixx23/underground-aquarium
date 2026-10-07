"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle, Bot, Brain, Check, ChevronDown, ExternalLink, Github, Loader2, MessageSquarePlus,
  Play, Power, RotateCcw, ShieldCheck, X,
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

const CARD = "rounded-2xl border border-ocean-800/60 bg-ocean-900/40";

function when(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** The worker's last status in plain words. */
const STATUS_WORDS: Record<string, string> = {
  done: "finished",
  "all quiet": "finished, nothing needed you",
  quiet: "stayed asleep, nothing new",
  capped: "stopped, monthly cap reached",
  error: "didn't finish",
};

function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ocean-200 [&_a]:text-emerald-300 [&_a:hover]:text-emerald-200 [&_h1]:font-display [&_h1]:text-xl [&_h1]:text-white [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-white [&_h3]:font-medium [&_h3]:text-white [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-white [&_table]:w-full [&_table]:text-left [&_td]:border-b [&_td]:border-ocean-800/60 [&_td]:py-1.5 [&_td]:pr-3 [&_th]:border-b [&_th]:border-ocean-700 [&_th]:py-1.5 [&_th]:pr-3 [&_th]:font-medium [&_th]:text-ocean-300 [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

const RISK: Record<string, string> = {
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  high: "border-coral-500/40 bg-coral-500/10 text-coral-300",
};

export default function OpsConsole({ data }: { data: OpsData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function act(key: string, payload: Record<string, unknown>, okText?: string) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMessage(json.error ?? "Something went wrong.");
      else if (json.outcome) {
        const o = json.outcome as { status: string; reason?: string; costCents?: number };
        setMessage(
          o.status === "done"
            ? `Run finished${typeof o.costCents === "number" ? ` (${dollars(o.costCents)})` : ""}.`
            : `${o.status === "skipped" ? "Skipped" : "Error"}: ${o.reason ?? ""}`
        );
      } else if (json.message) setMessage(json.message);
      else if (json.url) setMessage("Sent to GitHub. Claude will open a pull request there.");
      else if (okText) setMessage(okText);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  if (data.setupMissing) {
    return (
      <div className={`${CARD} p-8`}>
        <h1 className="mb-2 font-display text-2xl text-white">AI team</h1>
        <p className="text-ocean-300">
          The team&apos;s tables aren&apos;t in the database yet. Run <code className="text-amber-200">ops_team_setup.sql</code> in
          the Supabase SQL Editor, then reload this page.
        </p>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((data.spentCents / Math.max(1, data.settings.capCents)) * 100));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber-300/70">Admin</p>
          <h1 className="flex items-center gap-2 font-display text-3xl text-white">
            <Bot className="h-7 w-7 text-amber-300" /> AI team
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ocean-400">
            Your digital workers read the site, keep score and suggest what to do. You answer Yes, No or Something else, and
            they learn from every answer.
          </p>
        </div>
        <button
          onClick={() => act("master", { action: "settings", enabled: !data.settings.enabled })}
          disabled={busy !== null}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            data.settings.enabled
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "border border-ocean-700 bg-ocean-900 text-ocean-300 hover:border-ocean-500"
          }`}
        >
          <Power className="h-4 w-4" /> {data.settings.enabled ? "Team is on" : "Team is paused"}
        </button>
      </div>

      {!data.configured.claude && (
        <div className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Add <code>ANTHROPIC_API_KEY</code> in Vercel (Settings, Environment Variables) and redeploy. Until then nothing
            runs.
          </p>
        </div>
      )}

      {message && <p className="rounded-xl border border-ocean-700 bg-ocean-900/60 px-4 py-3 text-sm text-ocean-100">{message}</p>}

      {/* Spend */}
      <div className={`${CARD} p-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-ocean-300">
            This month: <span className="font-display text-2xl text-white">{dollars(data.spentCents)}</span> of a{" "}
            {dollars(data.settings.capCents)} cap
          </p>
          <CapEditor cap={data.settings.capCents} onSave={(c) => act("cap", { action: "settings", monthly_cap_cents: c }, "Cap saved.")} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ocean-950">
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-coral-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-ocean-500">Briefs go to {data.settings.briefEmail}. When the cap is reached every worker stops until next month.</p>
      </div>

      {/* Latest brief */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Latest brief</h2>
        <div className={`${CARD} p-5`}>
          {data.brief ? (
            <>
              <p className="mb-3 text-xs text-ocean-500">
                {data.brief.workerKey === "weekly" ? "Weekly review" : "Morning brief"} · {when(data.brief.startedAt)}
              </p>
              <Markdown>{data.brief.report}</Markdown>
              <Teach workerKey={data.brief.workerKey} busy={busy} act={act} />
            </>
          ) : (
            <p className="text-sm text-ocean-400">No brief yet. The morning session runs at 6:30 am, or press Run now below.</p>
          )}
        </div>
      </section>

      {/* Waiting */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Waiting on you <span className="text-ocean-500">({data.waiting.length})</span>
        </h2>
        <p className="mb-3 max-w-2xl text-sm text-ocean-400">
          Each item says who found it and what they suggest. Edit the suggestion if you like, then answer:{" "}
          <span className="text-emerald-300">Yes</span> does it (the button says exactly what happens),{" "}
          <span className="text-coral-300">No</span> clears it and the team stops suggesting it, and{" "}
          <span className="text-sky-300">Something else</span> sends your note back so the team can rework it.
        </p>
        {data.waiting.length === 0 ? (
          <p className={`${CARD} p-5 text-sm text-ocean-400`}>Nothing waiting. That&apos;s a good day.</p>
        ) : (
          <div className="space-y-3">
            {data.waiting.map((f) => (
              <FindingCard key={f.id} f={f} busy={busy} act={act} />
            ))}
          </div>
        )}
      </section>

      {/* Team */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">The team</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.workers.map((w) => (
            <div key={w.key} className={`${CARD} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{w.name}</p>
                  <p className="text-xs text-ocean-500">
                    {w.schedule} · {w.model}
                  </p>
                </div>
                {!w.needsNote && (
                  <button
                    onClick={() => act(`t-${w.key}`, { action: "worker_toggle", key: w.key, enabled: !w.enabled })}
                    disabled={busy !== null}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      w.enabled ? "bg-emerald-600/80 text-white" : "border border-ocean-700 text-ocean-400"
                    }`}
                  >
                    {w.enabled ? "On" : "Off"}
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm text-ocean-200">{w.about.job}</p>
              <div className="mt-3 space-y-1.5 text-xs">
                <p className={w.enabled && !w.needsNote ? "text-emerald-200" : "text-ocean-500"}>
                  <span className="font-semibold uppercase tracking-wide">When on: </span>
                  {w.about.whenOn}
                </p>
                <p className={!w.enabled && !w.needsNote ? "text-amber-200/90" : "text-ocean-500"}>
                  <span className="font-semibold uppercase tracking-wide">When off: </span>
                  {w.about.whenOff}
                </p>
              </div>
              {w.needsNote ? (
                <p className="mt-3 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-200">{w.needsNote}</p>
              ) : (
                <>
                  <div className="mt-3 rounded-lg bg-ocean-950/50 px-3 py-2 text-xs text-ocean-300">
                    <p>
                      <span className="text-ocean-500">Last run:</span> {when(w.lastRunAt)}
                      {w.lastStatus ? ` · ${STATUS_WORDS[w.lastStatus] ?? w.lastStatus}` : ""} · {dollars(w.spentCents)} this month
                    </p>
                    {w.lastResult && (
                      <p className="mt-1 text-ocean-200">
                        <span className="text-ocean-500">Result:</span> {w.lastResult}
                      </p>
                    )}
                    <p className="mt-1">
                      <span className="text-ocean-500">30 days:</span> {w.filed30} findings, {w.acted30} acted on
                    </p>
                  </div>
                  <button
                    onClick={() => act(`r-${w.key}`, { action: "run", key: w.key })}
                    disabled={busy !== null || w.running}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ocean-700 px-3 py-1 text-xs text-ocean-200 hover:border-emerald-500 hover:text-white disabled:opacity-50"
                  >
                    {busy === `r-${w.key}` || w.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    {busy === `r-${w.key}` || w.running ? "Running (up to 4 min)" : "Run now"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <Collapsible title={`Done in the last 30 days (${data.done.length})`}>
        <div className="space-y-3">
          {data.done.map((f) => (
            <FindingCard key={f.id} f={f} busy={busy} act={act} compact />
          ))}
        </div>
      </Collapsible>

      <Collapsible title={`Dismissed in the last 30 days (${data.dismissed.length})`}>
        <div className="space-y-3">
          {data.dismissed.map((f) => (
            <FindingCard key={f.id} f={f} busy={busy} act={act} compact />
          ))}
        </div>
      </Collapsible>

      <Collapsible title="Run log">
        <div className="space-y-2">
          {data.runs.map((r) => (
            <details key={r.id} className={`${CARD} px-4 py-3`}>
              <summary className="cursor-pointer list-none text-sm text-ocean-200">
                <span className="text-white">{data.workers.find((w) => w.key === r.worker_key)?.name ?? r.worker_key}</span>
                <span className="text-ocean-500">
                  {" "}
                  · {when(r.started_at)} · {r.status}
                  {r.nothing_needed ? " (all quiet)" : ""} · {r.queries} queries · {dollars(Number(r.cost_cents))}
                </span>
              </summary>
              <div className="mt-3">
                {r.error && <p className="mb-2 text-sm text-coral-300">{r.error}</p>}
                {r.report ? <Markdown>{r.report}</Markdown> : <p className="text-sm text-ocean-500">No report.</p>}
              </div>
            </details>
          ))}
        </div>
      </Collapsible>

      <Collapsible title={`What the team remembers (${data.memory.length})`}>
        <p className="mb-3 text-sm text-ocean-400">
          Each worker reads its memory before every run. Retire anything wrong or out of date.
        </p>
        <div className="space-y-4">
          {data.workers
            .filter((w) => data.memory.some((m) => m.worker_key === w.key))
            .map((w) => (
              <div key={w.key}>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-white">
                  <Brain className="h-4 w-4 text-amber-300" /> {w.name}
                </p>
                <ul className="space-y-1.5">
                  {data.memory
                    .filter((m) => m.worker_key === w.key)
                    .map((m) => (
                      <li key={m.id} className="flex items-start gap-2 rounded-lg bg-ocean-950/50 px-3 py-2 text-sm text-ocean-200">
                        <span className="mt-0.5 shrink-0 rounded bg-ocean-800 px-1.5 text-[10px] uppercase tracking-wide text-ocean-300">
                          {m.kind}
                          {m.source === "chris" ? " · you" : ""}
                        </span>
                        <span className="flex-1">{m.content}</span>
                        <button
                          onClick={() => act(`m-${m.id}`, { action: "memory_retire", id: m.id })}
                          disabled={busy !== null}
                          className="shrink-0 text-ocean-500 hover:text-coral-300"
                          aria-label="Retire this memory"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </div>
      </Collapsible>
    </div>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button onClick={() => setOpen(!open)} className="mb-3 flex items-center gap-2 text-lg font-medium text-white">
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? "" : "-rotate-90"}`} /> {title}
      </button>
      {open && children}
    </section>
  );
}

function CapEditor({ cap, onSave }: { cap: number; onSave: (cents: number) => void }) {
  const [value, setValue] = useState(String(cap / 100));
  return (
    <form
      className="flex items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) onSave(Math.round(n * 100));
      }}
    >
      <label className="text-ocean-400" htmlFor="ops-cap">
        Cap $
      </label>
      <input
        id="ops-cap"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        className="w-20 rounded-lg border border-ocean-700 bg-ocean-950 px-2 py-1 text-white"
      />
      <button className="rounded-full border border-ocean-700 px-3 py-1 text-ocean-200 hover:border-emerald-500">Save</button>
    </form>
  );
}

function Teach({
  workerKey,
  busy,
  act,
}: {
  workerKey: string;
  busy: string | null;
  act: (k: string, p: Record<string, unknown>, ok?: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  return (
    <form
      className="mt-5 flex flex-col gap-2 border-t border-ocean-800/60 pt-4 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!note.trim()) return;
        await act("teach", { action: "teach", key: workerKey, note }, "Saved. The team will use it from the next run.");
        setNote("");
      }}
    >
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Tell the team something, e.g. don't flag species photos under a day old"
        className="flex-1 rounded-xl border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white placeholder:text-ocean-600"
      />
      <button
        disabled={busy !== null || !note.trim()}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        <MessageSquarePlus className="h-4 w-4" /> Teach
      </button>
    </form>
  );
}

// Plain words for who found it and what it is.
const FROM: Record<string, string> = {
  morning: "Morning check",
  community: "Community manager",
  cmo: "Marketing",
  partnerships: "Shop partnerships",
  weekly: "Weekly review",
  qa: "Site health check",
  reviewer: "Reviewer",
};
const WHAT: Record<string, string> = {
  bug: "Something is broken",
  data: "Data to fix",
  message: "A message to send",
  decision: "Your call",
  queue: "Waiting in a queue",
  idea: "An idea",
};
const URGENCY: Record<string, string> = { high: "Urgent", medium: "This week", low: "When you have time" };

// What the Yes button says, and what happens when Chris presses it.
const YES: Record<Answer, { label: string; then: string }> = {
  email: {
    label: "Yes, send it",
    then: "The site emails each shop below from support@, with replies coming to you. Edit the email first if you like.",
  },
  fix: {
    label: "Yes, have Claude fix it",
    then: "Claude writes the fix on GitHub and posts a preview link. Nothing goes live until you merge it.",
  },
  approve: {
    label: "Yes, go with this",
    then: "The team carries out the suggestion (as you edited it) on its next run.",
  },
  done: {
    label: "Yes, it's handled",
    then: "This needs you to do it. Use Open to go there, then press Yes once it's taken care of.",
  },
};

const INPUT =
  "w-full rounded-xl border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white placeholder:text-ocean-600 focus:border-emerald-500 focus:outline-none";

function FindingCard({
  f,
  busy,
  act,
  compact = false,
}: {
  f: Finding;
  busy: string | null;
  act: (k: string, p: Record<string, unknown>, ok?: string) => Promise<void>;
  compact?: boolean;
}) {
  const email = f.answer === "email" && f.proposal?.type === "email" ? f.proposal : null;
  const [why, setWhy] = useState(false);
  const [mode, setMode] = useState<"none" | "no" | "else">("none");
  const [suggestion, setSuggestion] = useState(f.suggested_action ?? "");
  const [subject, setSubject] = useState(email?.subject ?? "");
  const [body, setBody] = useState(email?.body ?? "");
  const [reason, setReason] = useState("");
  const [reply, setReply] = useState("");
  const [reviseNow, setReviseNow] = useState(true);
  // Only our own pages or plain https links: a finding's text can echo member content.
  const link = f.link && (/^\/(?!\/)/.test(f.link) || /^https:\/\//.test(f.link)) ? f.link : null;
  const yes = YES[f.answer] ?? YES.done;
  const canSend = (f.recipients ?? []).filter((r) => r.hasEmail).length;
  const working = busy !== null;

  const header = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={`rounded-full border px-2 py-0.5 font-medium ${RISK[f.risk] ?? RISK.medium}`}>{URGENCY[f.risk] ?? f.risk}</span>
      <span className="font-medium text-ocean-200">{WHAT[f.kind] ?? f.kind}</span>
      <span className="text-ocean-500">
        · found by {FROM[f.worker_key] ?? f.worker_key} · {when(f.created_at)}
      </span>
      {f.reviewer_verdict === "approve" && (
        <span className="inline-flex items-center gap-1 text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> double-checked
        </span>
      )}
    </div>
  );

  const whyBlock = (f.detail || f.evidence || f.reviewer_note) && (
    <>
      <button onClick={() => setWhy(!why)} className="mt-2 inline-flex items-center gap-1 text-xs text-ocean-400 hover:text-white">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${why ? "" : "-rotate-90"}`} /> {why ? "Hide why" : "Show why"}
      </button>
      {why && (
        <div className="mt-2 space-y-3 rounded-xl bg-ocean-950/50 p-3 text-sm">
          {f.detail && <Markdown>{f.detail}</Markdown>}
          {f.evidence && <p className="whitespace-pre-wrap text-xs text-ocean-300">{f.evidence}</p>}
          {f.reviewer_note && <p className="text-xs text-ocean-400">Reviewer: {f.reviewer_note}</p>}
        </div>
      )}
    </>
  );

  const links = (
    <>
      {link && (
        <a
          href={link}
          className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1.5 text-xs text-ocean-200 hover:border-emerald-500 hover:text-white"
        >
          Open <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {f.github_issue_url && (
        <a
          href={f.github_issue_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1.5 text-xs text-ocean-200 hover:border-emerald-500"
        >
          <Github className="h-3.5 w-3.5" /> On GitHub
        </a>
      )}
    </>
  );

  // Done and dismissed: just the record, with a way back.
  if (compact) {
    return (
      <div id={f.id} className={`${CARD} p-4`}>
        {header}
        <p className="mt-2 font-medium text-white">{f.title}</p>
        {f.suggested_action && <p className="mt-1 text-sm text-ocean-400">{f.suggested_action}</p>}
        {f.rating_note && <p className="mt-1 text-xs text-ocean-500">You said: {f.rating_note}</p>}
        {whyBlock}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {links}
          {f.status === "dismissed" && (
            <button
              onClick={() => act(`o-${f.id}`, { action: "finding_restore", id: f.id }, "Brought back to Waiting on you.")}
              disabled={working}
              className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1.5 text-xs text-ocean-300 hover:border-emerald-500"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Bring it back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Claude is already fixing it: nothing to decide until the preview is ready.
  if (f.status === "in_progress") {
    return (
      <div id={f.id} className={`${CARD} p-4`}>
        {header}
        <p className="mt-2 font-medium text-white">{f.title}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-sky-200">
          <Loader2 className="h-4 w-4 animate-spin" /> Claude is working on a fix. Check GitHub for the preview link, merge it if it
          looks right, then press Done.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {links}
          <button
            onClick={() => act(`d-${f.id}`, { action: "finding_status", id: f.id, status: "fixed" }, "Marked done.")}
            disabled={working}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id={f.id} className={`${CARD} p-4 sm:p-5`}>
      {header}
      <p className="mt-2 text-base font-medium text-white">{f.title}</p>
      {whyBlock}

      {f.chris_reply && (
        <p className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          You asked for something else: &ldquo;{f.chris_reply}&rdquo;. The team will revise this on its next run.
        </p>
      )}

      {/* The suggestion, editable */}
      <div className="mt-4 space-y-3">
        {email ? (
          <>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ocean-400">
                Goes to {f.recipients?.length ?? 0} shop{f.recipients?.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(f.recipients ?? []).map((r) => (
                  <span
                    key={r.shop}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      r.hasEmail ? "bg-ocean-800 text-ocean-100" : "bg-ocean-950 text-ocean-500 line-through"
                    }`}
                    title={r.hasEmail ? undefined : "No email on file, will be skipped"}
                  >
                    {r.shop}
                  </span>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ocean-400">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ocean-400">Email</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={INPUT} />
              <span className="mt-1 block text-xs text-ocean-500">
                {"{{shop_name}}"} and {"{{owner_first_name}}"} are filled in for each shop.
              </span>
            </label>
          </>
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ocean-400">Suggestion (you can edit it)</span>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={Math.min(8, Math.max(2, Math.ceil(suggestion.length / 90)))}
              placeholder="No suggestion given. Write what you'd like done, or press Something else."
              className={INPUT}
            />
          </label>
        )}
        <p className="text-xs text-ocean-400">
          <span className="font-semibold text-ocean-300">If you say yes: </span>
          {yes.then}
        </p>
      </div>

      {/* Yes / No / Something else */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            act(`y-${f.id}`, {
              action: "finding_yes",
              id: f.id,
              suggestion,
              ...(email ? { subject, body } : {}),
            })
          }
          disabled={working || (email !== null && (!subject.trim() || !body.trim() || canSend === 0))}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy === `y-${f.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {email ? `Yes, send to ${canSend} shop${canSend === 1 ? "" : "s"}` : yes.label}
        </button>
        <button
          onClick={() => setMode(mode === "no" ? "none" : "no")}
          disabled={working}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${
            mode === "no" ? "border-coral-400 text-coral-300" : "border-ocean-700 text-ocean-200 hover:border-coral-400"
          }`}
        >
          <X className="h-4 w-4" /> No
        </button>
        <button
          onClick={() => setMode(mode === "else" ? "none" : "else")}
          disabled={working}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${
            mode === "else" ? "border-sky-400 text-sky-200" : "border-ocean-700 text-ocean-200 hover:border-sky-400"
          }`}
        >
          <MessageSquarePlus className="h-4 w-4" /> Something else
        </button>
        <span className="flex flex-wrap gap-2 sm:ml-auto">{links}</span>
      </div>

      {mode === "no" && (
        <div className="mt-3 space-y-2 rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why not? (optional, helps the team learn)"
            className={INPUT}
          />
          <button
            onClick={() => act(`n-${f.id}`, { action: "finding_no", id: f.id, reason })}
            disabled={working}
            className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-coral-400 disabled:opacity-50"
          >
            {busy === `n-${f.id}` && <Loader2 className="h-4 w-4 animate-spin" />} Say no and clear it
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
          <label className="flex items-center gap-2 text-xs text-ocean-300">
            <input type="checkbox" checked={reviseNow} onChange={(e) => setReviseNow(e.target.checked)} className="accent-emerald-500" />
            Have the team revise it now (takes a few minutes, costs a few cents)
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
            {busy === `e-${f.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy === `e-${f.id}` && reviseNow ? "Revising (up to 4 min)" : "Send to the team"}
          </button>
        </div>
      )}
    </div>
  );
}
