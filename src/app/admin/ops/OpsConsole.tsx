"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle, Bot, Brain, Check, ChevronDown, ExternalLink, Github, Loader2, MessageSquarePlus,
  Play, Power, RotateCcw, ShieldCheck, ThumbsDown, ThumbsUp, X,
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
};

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
      } else if (json.url) setMessage("Sent to GitHub. Claude will open a pull request there.");
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
            Your digital workers read the site, keep score and draft. You approve. Rate their findings and they learn what
            matters to you.
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
        {data.waiting.length === 0 ? (
          <p className={`${CARD} p-5 text-sm text-ocean-400`}>Nothing waiting. That&apos;s a good day.</p>
        ) : (
          <div className="space-y-3">
            {data.waiting.map((f) => (
              <FindingCard key={f.id} f={f} busy={busy} act={act} github={data.configured.github} />
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
              {w.needsNote ? (
                <p className="mt-3 text-xs text-amber-200/80">{w.needsNote}</p>
              ) : (
                <>
                  <p className="mt-3 text-xs text-ocean-400">
                    Last run {when(w.lastRunAt)}
                    {w.lastStatus ? ` · ${w.lastStatus}` : ""} · {dollars(w.spentCents)} this month
                  </p>
                  <p className="text-xs text-ocean-400">
                    30 days: {w.filed30} findings, {w.acted30} acted on
                  </p>
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
            <FindingCard key={f.id} f={f} busy={busy} act={act} github={false} compact />
          ))}
        </div>
      </Collapsible>

      <Collapsible title={`Dismissed in the last 30 days (${data.dismissed.length})`}>
        <div className="space-y-3">
          {data.dismissed.map((f) => (
            <FindingCard key={f.id} f={f} busy={busy} act={act} github={false} compact />
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

function FindingCard({
  f,
  busy,
  act,
  github,
  compact = false,
}: {
  f: Finding;
  busy: string | null;
  act: (k: string, p: Record<string, unknown>, ok?: string) => Promise<void>;
  github: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  // Only our own pages or plain https links: a finding's text can echo member content.
  const link = f.link && (/^\/(?!\/)/.test(f.link) || /^https:\/\//.test(f.link)) ? f.link : null;

  return (
    <div id={f.id} className={`${CARD} p-4`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full border px-2 py-0.5 uppercase tracking-wide ${RISK[f.risk] ?? RISK.medium}`}>{f.risk}</span>
        <span className="rounded-full border border-ocean-700 px-2 py-0.5 uppercase tracking-wide text-ocean-300">{f.kind}</span>
        <span className="text-ocean-500">
          {f.role ?? f.worker_key} · {when(f.created_at)}
        </span>
        {f.reviewer_verdict === "approve" && (
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> AI-checked
          </span>
        )}
        {f.status === "new" && <span className="text-amber-300">not reviewed yet</span>}
        {f.status === "in_progress" && <span className="text-sky-300">fix in progress</span>}
        {f.status === "verified" && <span className="text-emerald-300">verified fixed</span>}
      </div>

      <button onClick={() => setOpen(!open)} className="mt-2 block w-full text-left">
        <p className="font-medium text-white">{f.title}</p>
        {!open && f.suggested_action && <p className="mt-1 line-clamp-2 text-sm text-ocean-400">{f.suggested_action}</p>}
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-sm">
          {f.detail && <Markdown>{f.detail}</Markdown>}
          {f.suggested_action && (
            <p className="text-ocean-200">
              <span className="text-ocean-400">Suggested: </span>
              {f.suggested_action}
            </p>
          )}
          {f.evidence && <p className="whitespace-pre-wrap rounded-lg bg-ocean-950/60 p-3 text-xs text-ocean-300">{f.evidence}</p>}
          {f.reviewer_note && <p className="text-xs text-ocean-400">Reviewer: {f.reviewer_note}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {link && (
          <a
            href={link}
            className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1 text-xs text-ocean-200 hover:border-emerald-500 hover:text-white"
          >
            Open <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {f.github_issue_url && (
          <a
            href={f.github_issue_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1 text-xs text-ocean-200 hover:border-emerald-500"
          >
            <Github className="h-3.5 w-3.5" /> Issue
          </a>
        )}
        {!compact && (
          <>
            <button
              onClick={() => act(`d-${f.id}`, { action: "finding_status", id: f.id, status: "fixed" })}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Done
            </button>
            <button
              onClick={() => act(`x-${f.id}`, { action: "finding_status", id: f.id, status: "dismissed" })}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1 text-xs text-ocean-300 hover:border-ocean-500 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Dismiss
            </button>
            {f.kind === "bug" && github && !f.github_issue_url && (
              <button
                onClick={() => act(`g-${f.id}`, { action: "finding_github", id: f.id })}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 px-3 py-1 text-xs text-sky-200 hover:border-sky-400 disabled:opacity-50"
              >
                {busy === `g-${f.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />} Fix with Claude
              </button>
            )}
          </>
        )}
        {f.status === "dismissed" && (
          <button
            onClick={() => act(`o-${f.id}`, { action: "finding_restore", id: f.id })}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-full border border-ocean-700 px-3 py-1 text-xs text-ocean-300 hover:border-emerald-500"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </button>
        )}

        <span className="ml-auto flex items-center gap-1">
          {f.rating === null ? (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="why? (optional)"
                className="hidden w-36 rounded-lg border border-ocean-800 bg-ocean-950 px-2 py-1 text-xs text-white placeholder:text-ocean-600 sm:block"
              />
              <button
                onClick={() => act(`u-${f.id}`, { action: "finding_rate", id: f.id, rating: 1, note }, "Thanks: saved to its memory.")}
                disabled={busy !== null}
                className="rounded-full p-1.5 text-ocean-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                aria-label="Useful"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => act(`n-${f.id}`, { action: "finding_rate", id: f.id, rating: -1, note }, "Got it: it won't flag things like this.")}
                disabled={busy !== null}
                className="rounded-full p-1.5 text-ocean-400 hover:bg-coral-500/10 hover:text-coral-300"
                aria-label="Not useful"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className={`text-xs ${f.rating > 0 ? "text-emerald-300" : "text-coral-300"}`}>
              {f.rating > 0 ? "Rated useful" : "Rated not useful"}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
