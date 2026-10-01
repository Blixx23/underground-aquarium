"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Clock,
  Grid3x3,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import MasteryEmblem from "@/components/courses/MasteryEmblem";
import { seededShuffle } from "@/lib/courses/mastery";

type Question = { id: string; prompt: string; options: string[] };
type Requirement = { id: string; slug: string; title: string; done: boolean };

type Breakdown = { topic: string; label: string; correct: number; total: number };
type Result = {
  passed: boolean;
  correct: number;
  total: number;
  scored: number;
  passPercent: number;
  breakdown: Breakdown[];
  retryAt?: string;
  review?: { prompt: string; yourAnswer: string | null; correctAnswer: string; explanation: string | null }[];
};

type Status = {
  unlocked: boolean;
  passed: boolean;
  retryAt: string | null;
  bestScore: number | null;
  attempts: number;
  requirements: Requirement[];
  openSession: { id: string; expiresAt: string } | null;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Gold-to-green glowing frame used around the exam's key panels. */
function Glow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-3xl bg-gradient-to-r from-amber-400 via-emerald-300 to-amber-400 p-[1.5px] shadow-[0_0_60px_rgba(251,191,36,0.25)] ${className}`}>
      <div className="rounded-[calc(1.5rem-1.5px)] bg-ocean-950">{children}</div>
    </div>
  );
}

function Breakdowns({ rows }: { rows: Breakdown[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((b) => {
        const pct = b.total ? Math.round((b.correct / b.total) * 100) : 0;
        return (
          <div key={b.topic}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ocean-200">{b.label}</span>
              <span className="font-mono text-ocean-400">
                {b.correct}/{b.total}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ocean-900">
              <div
                className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-400" : pct >= 75 ? "bg-amber-400" : "bg-coral-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MasteryExam({
  title,
  badgeTitle,
  sectionId,
  questions,
  status,
  signedIn,
  passPercent,
  timeLimitMin,
  cooldownHours,
  certHref,
  profileHref,
}: {
  title: string;
  badgeTitle: string;
  sectionId: string;
  questions: Question[];
  status: Status;
  signedIn: boolean;
  passPercent: number;
  timeLimitMin: number;
  cooldownHours: number;
  certHref: string;
  profileHref: string | null;
}) {
  const [phase, setPhase] = useState<"intro" | "running" | "result">("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [focusLosses, setFocusLosses] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const submittedRef = useRef(false);

  // Question and answer order are scrambled per attempt (seeded by the
  // session, so a refresh keeps the same order).
  const ordered = useMemo(() => {
    if (!sessionId) return [];
    return seededShuffle(questions, sessionId).map((q) => {
      const order = seededShuffle(
        q.options.map((_, i) => i),
        `${sessionId}:${q.id}`
      );
      return { ...q, order };
    });
  }, [questions, sessionId]);

  const storageKey = sessionId ? `mastery:${sessionId}` : null;

  // Restore answers after a refresh.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || phase !== "running") return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {}
  }, [answers, storageKey, phase]);

  // Clock
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const remaining = expiresAt ? expiresAt - now : 0;
  const answeredCount = Object.keys(answers).length;
  const total = questions.length;

  const submit = useCallback(async () => {
    if (submittedRef.current || !sessionId) return;
    submittedRef.current = true;
    setBusy(true);
    setConfirming(false);
    setError(null);
    try {
      const res = await fetch("/api/courses/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, answers, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong submitting your exam.");
        if (res.status >= 500) submittedRef.current = false;
        return;
      }
      try {
        if (storageKey) sessionStorage.removeItem(storageKey);
      } catch {}
      setResult(data as Result);
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      submittedRef.current = false;
      setError("Network error. Your answers are saved on this page; press Submit again.");
    } finally {
      setBusy(false);
    }
  }, [answers, sectionId, sessionId, storageKey]);

  // Time's up: submit whatever is answered.
  useEffect(() => {
    if (phase === "running" && expiresAt && remaining <= 0) submit();
  }, [phase, expiresAt, remaining, submit]);

  // Anti-cheat while the exam is running: no copying, selecting, printing or
  // right-clicking, and leaving the tab is recorded.
  useEffect(() => {
    if (phase !== "running") return;
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && ["c", "x", "a", "p", "s", "u"].includes(k)) e.preventDefault();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden" && sessionId) {
        setFocusLosses((n) => n + 1);
        fetch("/api/courses/exam/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [phase, sessionId]);

  // Keyboard: 1-4 / A-D to answer, arrows to move.
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || confirming) return;
      const q = ordered[idx];
      if (!q) return;
      const n = /^[1-6]$/.test(e.key) ? Number(e.key) - 1 : LETTERS.indexOf(e.key.toUpperCase());
      if (n >= 0 && n < q.order.length) {
        setAnswers((a) => ({ ...a, [q.id]: q.order[n] }));
      } else if (e.key === "ArrowRight") {
        setIdx((i) => Math.min(total - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, ordered, idx, total, confirming]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/exam/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.retryAt ? `You can retake the exam on ${fmtWhen(data.retryAt)}.` : data?.error || "Couldn't start the exam.");
        return;
      }
      submittedRef.current = false;
      setSessionId(data.sessionId);
      setExpiresAt(new Date(data.expiresAt).getTime());
      setNow(Date.now());
      setIdx(0);
      setPhase("running");
      window.scrollTo({ top: 0 });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ result */
  if (phase === "result" && result) {
    if (result.passed) {
      return (
        <div className="space-y-8">
          <Glow>
            <div className="relative overflow-hidden px-6 py-10 text-center sm:px-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.18),transparent_60%)]" />
              <MasteryEmblem size={128} className="relative mx-auto mb-5 drop-shadow-[0_0_24px_rgba(251,191,36,0.55)]" />
              <p className="relative font-mono text-xs uppercase tracking-[0.3em] text-amber-300">Mastery earned</p>
              <h2 className="relative mt-2 font-display text-4xl text-amber-50 sm:text-5xl">{badgeTitle}</h2>
              <p className="relative mt-4 text-lg text-ocean-200">
                {result.correct} of {result.total} correct · <span className="text-amber-200">{result.scored}%</span>
              </p>
              <p className="relative mx-auto mt-3 max-w-lg text-ocean-300">
                You passed the hardest test in the beginner path. This now shows on your profile for everyone to see.
              </p>
              <div className="relative mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href={certHref}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300"
                >
                  <Award className="h-4 w-4" /> View your certificate
                </Link>
                {profileHref && (
                  <Link
                    href={`${profileHref}?tab=courses`}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 px-6 py-2.5 text-sm text-amber-100 transition-colors hover:border-amber-200"
                  >
                    See it on your profile <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </Glow>

          <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
            <div className="card-deep rounded-2xl p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ocean-400">By topic</p>
              <Breakdowns rows={result.breakdown} />
            </div>
            <div className="card-deep rounded-2xl p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ocean-400">
                {result.review?.length ? `What you missed (${result.review.length})` : "What you missed"}
              </p>
              {!result.review?.length ? (
                <p className="text-ocean-200">Nothing. A perfect score.</p>
              ) : (
                <div className="space-y-5">
                  {result.review.map((r, i) => (
                    <div key={i} className="border-b border-ocean-800/60 pb-4 last:border-0 last:pb-0">
                      <p className="font-medium text-white">{r.prompt}</p>
                      {r.yourAnswer && (
                        <p className="mt-1.5 flex items-start gap-2 text-sm text-coral-200">
                          <X className="mt-0.5 h-4 w-4 shrink-0" /> {r.yourAnswer}
                        </p>
                      )}
                      <p className="mt-1 flex items-start gap-2 text-sm text-emerald-200">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" /> {r.correctAnswer}
                      </p>
                      {r.explanation && <p className="mt-1.5 text-sm text-ocean-300">{r.explanation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-coral-500/30 bg-coral-500/[0.06] px-6 py-10 text-center sm:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-coral-200">Not this time</p>
          <p className="mt-3 font-display text-5xl text-white">{result.scored}%</p>
          <p className="mt-2 text-ocean-200">
            {result.correct} of {result.total} correct. You need {result.passPercent}% to pass.
          </p>
          {result.retryAt && (
            <p className="mt-4 text-ocean-300">
              You can try again on <span className="text-white">{fmtWhen(result.retryAt)}</span>.
            </p>
          )}
          <p className="mx-auto mt-3 max-w-lg text-sm text-ocean-400">
            To keep this exam meaningful, answers aren&apos;t shown after a failed attempt. Use the topic scores below to
            see which courses to review.
          </p>
        </div>
        <div className="card-deep rounded-2xl p-6">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ocean-400">By topic</p>
          <Breakdowns rows={result.breakdown} />
          <Link href="/courses" className="mt-6 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300">
            Review the beginner courses <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ running */
  if (phase === "running" && ordered.length) {
    const q = ordered[idx];
    const low = remaining < 10 * 60_000;
    return (
      <div className="select-none print:hidden" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
        {/* Top bar */}
        <div className="sticky top-20 z-20 -mx-2 mb-6 rounded-2xl border border-ocean-800/70 bg-ocean-950/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white">
                Question <span className="font-semibold">{idx + 1}</span>
                <span className="text-ocean-500"> / {total}</span>
              </span>
              <span className="text-ocean-400">{answeredCount} answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm ${
                  low ? "bg-coral-500/15 text-coral-200" : "bg-ocean-800/70 text-ocean-100"
                }`}
              >
                <Clock className="h-4 w-4" /> {fmtClock(remaining)}
              </span>
              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ocean-700 px-3 py-1 text-sm text-ocean-200 hover:text-white"
              >
                <Grid3x3 className="h-4 w-4" /> All questions
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1 text-sm font-semibold text-ocean-950 hover:bg-amber-300 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Submit
              </button>
            </div>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-ocean-900">
            <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-300 transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} />
          </div>
        </div>

        {focusLosses > 0 && (
          <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0" /> You left the exam {focusLosses} {focusLosses === 1 ? "time" : "times"}. Every time
            is recorded with your result.
          </p>
        )}
        {error && <p className="mb-4 rounded-xl border border-coral-500/30 bg-coral-500/10 px-4 py-2.5 text-sm text-coral-100">{error}</p>}

        {showGrid && (
          <div className="mb-6 card-deep rounded-2xl p-4">
            <div className="grid grid-cols-10 gap-1.5">
              {ordered.map((oq, i) => (
                <button
                  key={oq.id}
                  type="button"
                  onClick={() => {
                    setIdx(i);
                    setShowGrid(false);
                  }}
                  className={`h-8 rounded-md text-xs font-mono transition-colors ${
                    i === idx
                      ? "bg-amber-400 text-ocean-950"
                      : answers[oq.id] != null
                      ? "bg-emerald-500/25 text-emerald-100"
                      : "bg-ocean-900 text-ocean-500 hover:text-white"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question */}
        <div className="card-deep rounded-2xl p-6 sm:p-8">
          <p className="mb-5 text-xl font-medium leading-relaxed text-white">{q.prompt}</p>
          <div className="space-y-2.5">
            {q.order.map((orig, di) => {
              const selected = answers[q.id] === orig;
              return (
                <button
                  key={orig}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: orig }))}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-amber-300 bg-amber-400/10 text-white"
                      : "border-ocean-800/60 bg-ocean-900/40 text-ocean-200 hover:border-ocean-600"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      selected ? "border-amber-300 bg-amber-400 text-ocean-950" : "border-ocean-600 text-ocean-400"
                    }`}
                  >
                    {LETTERS[di]}
                  </span>
                  <span>{q.options[orig]}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
            {idx < total - 1 ? (
              <button
                type="button"
                onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                className="inline-flex items-center gap-2 rounded-full bg-ocean-600 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-500"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-ocean-950 hover:bg-amber-300"
              >
                Finish and submit
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-ocean-600">Tip: press 1–4 or A–D to answer, and the arrow keys to move.</p>

        {confirming && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
            <div className="w-full max-w-md rounded-2xl border border-ocean-700 bg-ocean-950 p-6">
              <h3 className="font-display text-2xl text-white">Submit your exam?</h3>
              <p className="mt-2 text-ocean-300">
                You&apos;ve answered <span className="text-white">{answeredCount}</span> of {total}.
                {answeredCount < total && " Unanswered questions count as wrong."} You can&apos;t change answers after this.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-4 py-2 text-sm text-ocean-300 hover:text-white">
                  Keep working
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-ocean-950 hover:bg-amber-300 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit exam
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------ intro */
  const doneCount = status.requirements.filter((r) => r.done).length;
  return (
    <Glow>
      <div className="relative overflow-hidden px-6 py-10 sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(251,191,36,0.14),transparent_55%)]" />
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-start">
          <MasteryEmblem
            size={140}
            muted={!status.passed && !status.unlocked}
            className={status.unlocked || status.passed ? "drop-shadow-[0_0_28px_rgba(251,191,36,0.5)]" : ""}
          />
          <div className="flex-1 text-center md:text-left">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-300">The final beginner test</p>
            <h2 className="mt-2 font-display text-4xl text-amber-50">{title}</h2>

            {status.passed ? (
              <>
                <p className="mt-3 text-lg text-ocean-200">
                  You&apos;ve earned <span className="text-amber-200">{badgeTitle}</span>
                  {status.bestScore != null && <> with a score of {status.bestScore}%</>}.
                </p>
                <Link
                  href={certHref}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-amber-300"
                >
                  <Award className="h-4 w-4" /> View your certificate
                </Link>
              </>
            ) : !status.unlocked ? (
              <>
                <p className="mt-3 text-ocean-200">
                  Finish every beginner course to unlock this exam.{" "}
                  <span className="text-white">
                    {doneCount} of {status.requirements.length}
                  </span>{" "}
                  done.
                </p>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {status.requirements.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/courses/${r.slug}`}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                          r.done
                            ? "border-emerald-500/30 text-emerald-100"
                            : "border-ocean-800/70 text-ocean-300 hover:border-ocean-600 hover:text-white"
                        }`}
                      >
                        {r.done ? <Check className="h-4 w-4 text-emerald-300" /> : <Lock className="h-4 w-4 text-ocean-600" />}
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <ul className="mt-5 space-y-2 text-left text-ocean-200">
                  {[
                    `${total} questions covering every beginner course`,
                    `${timeLimitMin} minutes once you start; the clock keeps running if you leave`,
                    `Score ${passPercent}% or higher to pass`,
                    `If you don't pass, you can try again after ${cooldownHours} hours`,
                    "Questions and answers are shuffled every attempt",
                    "Copying, pasting and right-clicking are turned off, and leaving the tab is recorded",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> {t}
                    </li>
                  ))}
                </ul>
                {status.attempts > 0 && status.bestScore != null && (
                  <p className="mt-4 text-sm text-ocean-400">
                    Attempts so far: {status.attempts} · best score {status.bestScore}%
                  </p>
                )}
                {error && <p className="mt-4 text-sm text-coral-200">{error}</p>}
                {status.retryAt ? (
                  <p className="mt-6 rounded-xl border border-ocean-700 bg-ocean-900/60 px-4 py-3 text-ocean-200">
                    You can try again on <span className="text-white">{fmtWhen(status.retryAt)}</span>. Use the time to
                    review the courses you scored lowest on.
                  </p>
                ) : !signedIn ? (
                  <Link
                    href="/login?redirect=/courses"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-ocean-950"
                  >
                    Sign in to take the exam
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={start}
                    disabled={busy}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-base font-semibold text-ocean-950 shadow-[0_0_30px_rgba(251,191,36,0.35)] transition-colors hover:bg-amber-300 disabled:opacity-60"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {status.openSession ? "Resume your exam" : "Begin the exam"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {!status.passed && (
          <div className="relative mt-10 border-t border-amber-500/20 pt-8">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-300">Why this one matters</p>
            <h3 className="mt-2 font-display text-2xl text-amber-50">Passing this exam is a real accomplishment</h3>
            <div className="mt-4 grid gap-6 text-ocean-200 md:grid-cols-2">
              <p>
                This isn&apos;t a quiz you click through. Foundations Mastery covers the entire beginner path: setting up a
                tank, the nitrogen cycle, choosing fish, water chemistry, fish health, buying healthy fish and live plants,
                all in one sitting.
              </p>
              <p>
                The questions are built around real situations, and the wrong answers are the mistakes beginners actually
                make, so they sound right if you only skimmed. The clock keeps running if you go looking things up, and if
                you don&apos;t pass, you won&apos;t see the answers and you&apos;ll wait a day to try again.
              </p>
              <p>
                Most fish keepers learn these lessons the hard way, by losing fish. Passing means you learned them first,
                and that the fish in your care have a keeper who knows what they need.
              </p>
              <p>
                Only members who finish every beginner course can even attempt it. Pass, and the{" "}
                <span className="text-amber-200">{badgeTitle}</span> emblem goes on your profile for good, where the whole
                community can see it.
              </p>
            </div>
          </div>
        )}
      </div>
    </Glow>
  );
}
