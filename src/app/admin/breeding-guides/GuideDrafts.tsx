"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ExternalLink, Loader2, MessageSquarePlus, Sparkles, X } from "lucide-react";
import { FACT_LABELS } from "@/lib/breeding/factLabels";

export type DraftGuide = {
  id: string;
  slug: string;
  speciesSlug: string | null;
  speciesName: string;
  seoTitle: string;
  summary: string;
  intro: string;
  facts: Record<string, string>;
  sections: { heading: string; text: string }[];
  faq: { q: string; a: string }[];
  reviewNotes: string | null;
  draftedAt: string | null;
  costCents: number;
};

const CARD = "rounded-2xl border border-ocean-800/60 bg-ocean-900/40";
const INPUT =
  "w-full rounded-xl border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white placeholder:text-ocean-600 focus:border-emerald-500 focus:outline-none";
const LABEL = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ocean-400";

async function post(payload: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("/api/admin/breeding-guides", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, message: json.message ?? json.error ?? (res.ok ? "Done." : "Something went wrong.") };
}

export default function GuideDrafts({ drafts, missing }: { drafts: DraftGuide[]; missing: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [drafting, setDrafting] = useState(false);
  const chosen = missing.find((m) => m.name.toLowerCase() === pick.trim().toLowerCase() || m.slug === pick.trim());

  async function draftOne() {
    if (!chosen) return;
    setDrafting(true);
    setMessage(null);
    const r = await post({ action: "draft", speciesSlug: chosen.slug });
    setMessage(r.message);
    setDrafting(false);
    if (r.ok) {
      setPick("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {message && <p className="rounded-xl border border-ocean-700 bg-ocean-900/60 px-4 py-3 text-sm text-ocean-100">{message}</p>}

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Waiting on you <span className="text-ocean-500">({drafts.length})</span>
        </h2>
        {drafts.length === 0 ? (
          <p className={`${CARD} p-5 text-sm text-ocean-400`}>No drafts waiting.</p>
        ) : (
          <div className="space-y-4">
            {drafts.map((d) => (
              <DraftCard
                key={d.id}
                d={d}
                onDone={(m) => {
                  setMessage(m);
                  router.refresh();
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className={`${CARD} p-5`}>
        <h2 className="text-lg font-medium text-white">Draft a guide for a species</h2>
        <p className="mt-1 text-sm text-ocean-400">
          {missing.length} species in the library have no guide of their own. Pick one and the AI writes and fact-checks a
          draft (about 2 minutes, roughly 20 to 40 cents). It lands above for your yes or no.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            list="guide-missing"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            placeholder="Start typing a species name"
            className={INPUT}
          />
          <datalist id="guide-missing">
            {missing.map((m) => (
              <option key={m.slug} value={m.name} />
            ))}
          </datalist>
          <button
            onClick={draftOne}
            disabled={!chosen || drafting}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-violet-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {drafting ? "Writing and checking (about 2 min)" : "Draft a guide"}
          </button>
        </div>
      </section>
    </div>
  );
}

function DraftCard({ d, onDone }: { d: DraftGuide; onDone: (message: string) => void }) {
  const [open, setOpen] = useState(true);
  const [summary, setSummary] = useState(d.summary);
  const [intro, setIntro] = useState(d.intro);
  const [facts, setFacts] = useState<Record<string, string>>(d.facts);
  const [sections, setSections] = useState(d.sections);
  const [faq, setFaq] = useState(d.faq);
  const [mode, setMode] = useState<"none" | "no" | "else">("none");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, payload: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    const r = await post({ id: d.id, ...payload });
    setBusy(null);
    if (r.ok) onDone(r.message);
    else setError(r.message);
  }

  const rows = (t: string) => Math.min(14, Math.max(3, Math.ceil(t.length / 95) + (t.match(/\n/g)?.length ?? 0)));

  return (
    <div id={d.slug} className={`${CARD} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 font-medium text-violet-200">
          AI draft, fact-checked
        </span>
        <span className="text-ocean-500">
          {d.draftedAt ? new Date(d.draftedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} · cost about{" "}
          {d.costCents.toFixed(0)}¢
        </span>
        {d.speciesSlug && (
          <a href={`/species/${d.speciesSlug}`} target="_blank" className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">
            Species page <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <p className="mt-2 text-lg font-medium text-white">How to breed {d.speciesName}</p>
      <p className="text-xs text-ocean-500">{d.seoTitle}</p>

      {d.reviewNotes && (
        <div className="mt-3 whitespace-pre-line rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-sm text-amber-100/90">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">What the fact-check found</p>
          {d.reviewNotes}
        </div>
      )}

      <button onClick={() => setOpen(!open)} className="mt-3 inline-flex items-center gap-1 text-xs text-ocean-400 hover:text-white">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        {open ? "Hide the guide" : "Read and edit the guide"}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-ocean-500">
            Text like {"{{temp}}"} or {"{{ph}}"} fills in from the species page, so the guide always matches it.
          </p>
          <label className="block">
            <span className={LABEL}>Summary (search results)</span>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>Intro</span>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={rows(intro)} className={INPUT} />
          </label>
          <div>
            <span className={LABEL}>At a glance</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {FACT_LABELS.filter(([k]) => k in facts).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-0.5 block text-xs text-ocean-400">{label}</span>
                  <input value={facts[k]} onChange={(e) => setFacts({ ...facts, [k]: e.target.value })} className={INPUT} />
                </label>
              ))}
            </div>
          </div>
          {sections.map((sec, i) => (
            <label key={i} className="block">
              <span className={LABEL}>{sec.heading}</span>
              <textarea
                value={sec.text}
                onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                rows={rows(sec.text)}
                className={INPUT}
              />
            </label>
          ))}
          <div className="space-y-2">
            <span className={LABEL}>Common questions</span>
            {faq.map((f, i) => (
              <div key={i} className="rounded-xl bg-ocean-950/40 p-2">
                <p className="mb-1 text-sm font-medium text-white">{f.q}</p>
                <textarea
                  value={f.a}
                  onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                  rows={2}
                  className={INPUT}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ocean-400">
        <span className="font-semibold text-ocean-300">If you say yes: </span>
        it goes live as written above, on the breeding guides and on the {d.speciesName} page.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => run("yes", { action: "publish", guide: { summary, intro, facts, sections, faq } })}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy === "yes" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Yes, publish it
        </button>
        <button
          onClick={() => setMode(mode === "no" ? "none" : "no")}
          disabled={busy !== null}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${
            mode === "no" ? "border-coral-400 text-coral-300" : "border-ocean-700 text-ocean-200 hover:border-coral-400"
          }`}
        >
          <X className="h-4 w-4" /> No
        </button>
        <button
          onClick={() => setMode(mode === "else" ? "none" : "else")}
          disabled={busy !== null}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${
            mode === "else" ? "border-sky-400 text-sky-200" : "border-ocean-700 text-ocean-200 hover:border-sky-400"
          }`}
        >
          <MessageSquarePlus className="h-4 w-4" /> Something else
        </button>
      </div>

      {mode === "no" && (
        <div className="mt-3 rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-3">
          <p className="mb-2 text-sm text-ocean-300">The draft is thrown out. You can draft it again later from the box below.</p>
          <button
            onClick={() => run("no", { action: "discard" })}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-coral-400 disabled:opacity-50"
          >
            {busy === "no" && <Loader2 className="h-4 w-4 animate-spin" />} Throw it out
          </button>
        </div>
      )}

      {mode === "else" && (
        <div className="mt-3 space-y-2 rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What should change? e.g. breeders say they need softer water to spawn, or make the fry section simpler"
            className={INPUT}
          />
          <button
            onClick={() => run("else", { action: "redraft", note })}
            disabled={busy !== null || !note.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy === "else" && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy === "else" ? "Rewriting and checking (about 2 min)" : "Rewrite it with my note"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-coral-300">{error}</p>}
    </div>
  );
}
