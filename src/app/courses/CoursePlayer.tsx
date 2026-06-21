"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Lock,
  Check,
  Clapperboard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Award,
  PartyPopper,
  AlertCircle,
  BookOpen,
  BadgeCheck,
} from "lucide-react";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  sort_order: number;
};

type Section = {
  id: string;
  title: string;
  content: string;
  has_video: boolean;
  video_url: string | null;
  sort_order: number;
  questions: Question[];
};

/* ---------- lightweight lesson renderer (**bold**, lists, paragraphs) ---------- */
function inline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={keyPrefix + i} className="text-white font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={keyPrefix + i}>{p}</span>;
  });
}

function renderLesson(content: string) {
  const blocks = content.split(/\n\n+/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const ordered = lines.every((l) => /^\d+\.\s/.test(l));
    const unordered = lines.every((l) => /^[-*]\s/.test(l));
    if (ordered) {
      return (
        <ol key={bi} className="list-decimal pl-6 space-y-1.5 my-4 text-ocean-200">
          {lines.map((l, li) => (
            <li key={li}>{inline(l.replace(/^\d+\.\s/, ""), `${bi}-${li}-`)}</li>
          ))}
        </ol>
      );
    }
    if (unordered) {
      return (
        <ul key={bi} className="list-disc pl-6 space-y-1.5 my-4 text-ocean-200">
          {lines.map((l, li) => (
            <li key={li}>{inline(l.replace(/^[-*]\s/, ""), `${bi}-${li}-`)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bi} className="my-4 text-ocean-200 leading-relaxed">
        {inline(block.replace(/\n/g, " "), `${bi}-`)}
      </p>
    );
  });
}

export default function CoursePlayer({
  courseSlug,
  badgeTitle,
  sections,
  initialCompleted,
  signedIn,
  courseAlreadyDone,
}: {
  courseSlug: string;
  badgeTitle: string;
  sections: Section[];
  initialCompleted: string[];
  signedIn: boolean;
  courseAlreadyDone: boolean;
}) {
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );
  const firstIncomplete = sections.findIndex((s) => !completed.has(s.id));
  const [active, setActive] = useState(
    firstIncomplete === -1 ? sections.length - 1 : firstIncomplete
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseDone, setCourseDone] = useState(courseAlreadyDone);
  const [summary, setSummary] = useState(courseAlreadyDone);

  const total = sections.length;
  const doneCount = completed.size;
  const section = sections[active];
  const isDone = completed.has(section.id);
  const unlocked = active === 0 || completed.has(sections[active - 1].id);
  const allAnswered = section.questions.every((q) => answers[q.id] != null);
  const lastSection = active === total - 1;
  const submitLabel = lastSection ? "Finish & get certified" : "Complete section";
  const certHref = `/courses/${courseSlug}/certificate`;

  const stepStates = useMemo(
    () =>
      sections.map((s, i) => {
        if (completed.has(s.id)) return "done" as const;
        if (i === 0 || completed.has(sections[i - 1].id)) return "open" as const;
        return "locked" as const;
      }),
    [sections, completed]
  );

  function goTo(i: number) {
    if (stepStates[i] === "locked") return;
    setSummary(false);
    setActive(i);
    setAnswers({});
    setWrong(new Set());
    setError(null);
  }

  function pick(qId: string, oi: number) {
    setAnswers((prev) => ({ ...prev, [qId]: oi }));
    setError(null);
    if (wrong.has(qId)) {
      setWrong((prev) => {
        const n = new Set(prev);
        n.delete(qId);
        return n;
      });
    }
  }

  async function submitSection() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: section.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Try again.");
        return;
      }
      if (data.passed) {
        setCompleted((prev) => new Set(prev).add(section.id));
        setWrong(new Set());
        if (data.courseCompleted) setCourseDone(true);
      } else {
        setWrong(new Set<string>(data.wrongQuestionIds || []));
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-8">
      {/* Section rail */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-ocean-400">
            Progress
          </span>
          <span className="text-xs text-ocean-400">
            {doneCount} / {total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-ocean-900 overflow-hidden mb-5">
          <div
            className="h-full bg-emerald-400/80 transition-all duration-500"
            style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
          />
        </div>
        <ol className="space-y-1">
          {sections.map((s, i) => {
            const state = stepStates[i];
            const activeRow = !summary && i === active;
            return (
              <li key={s.id}>
                <button
                  onClick={() => goTo(i)}
                  disabled={state === "locked"}
                  className={
                    "w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                    (activeRow
                      ? "bg-ocean-800/60 text-white"
                      : state === "locked"
                      ? "text-ocean-600 cursor-not-allowed"
                      : "text-ocean-300 hover:bg-ocean-900/60 hover:text-white")
                  }
                >
                  <span className="shrink-0">
                    {state === "done" ? (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : state === "locked" ? (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-ocean-900 text-ocean-600">
                        <Lock className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full border border-ocean-600 text-ocean-300 text-[11px]">
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <span className="leading-snug">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {courseDone && !lastSection && !summary && (
          <Link
            href={certHref}
            className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Award className="w-4 h-4" /> View certificate
          </Link>
        )}
      </aside>

      {/* Active section */}
      <section>
        {summary ? (
          <div className="card-deep rounded-2xl p-8 sm:p-12 text-center">
            <div className="relative mx-auto mb-5 h-16 w-16">
              <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-glow-pulse" />
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <BadgeCheck className="h-8 w-8 text-emerald-300" />
              </div>
            </div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-emerald-300/80 mb-2">
              Course complete
            </p>
            <h2 className="font-display text-3xl text-white mb-3">
              You&apos;re a {badgeTitle}
            </h2>
            <p className="text-ocean-300 max-w-md mx-auto mb-8">
              You&apos;ve finished every section and passed all the quizzes. Your
              badge is on your profile, and your certificate is ready.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={certHref}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 text-sm font-medium transition-colors"
              >
                <Award className="w-4 h-4" /> View certificate
              </Link>
              <button
                onClick={() => goTo(0)}
                className="inline-flex items-center gap-2 rounded-full border border-ocean-700 text-ocean-200 hover:text-white hover:border-ocean-500 px-6 py-2.5 text-sm transition-colors"
              >
                <BookOpen className="w-4 h-4" /> Review lessons
              </button>
            </div>
          </div>
        ) : !unlocked ? (
          <div className="card-deep rounded-2xl p-10 text-center">
            <Lock className="w-7 h-7 text-ocean-500 mx-auto mb-3" />
            <p className="text-ocean-300">
              Finish the previous section to unlock this one.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-ocean-400 mb-2">
              Section {active + 1} of {total}
            </p>
            <h2 className="font-display text-3xl text-white mb-6">
              {section.title}
            </h2>

            {/* Video */}
            {section.has_video && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-ocean-800/60 bg-ocean-950">
                {section.video_url ? (
                  <div className="aspect-video">
                    <iframe
                      src={section.video_url}
                      title={section.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-ocean-900/60 to-ocean-950">
                    <div className="relative w-12 h-12 mb-3">
                      <div className="absolute inset-0 rounded-full bg-ocean-600/25 animate-glow-pulse" />
                      <div className="relative z-10 flex items-center justify-center w-full h-full">
                        <Clapperboard className="w-6 h-6 text-ocean-200" />
                      </div>
                    </div>
                    <p className="text-ocean-200 font-medium">Video lesson coming soon</p>
                    <p className="text-ocean-500 text-sm mt-1">
                      The full lesson below covers everything you need for now.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Lesson */}
            <div className="card-deep rounded-2xl p-6 sm:p-8 mb-6 text-[17px]">
              {renderLesson(section.content)}
            </div>

            {/* Quiz / completion */}
            {isDone ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                <p className="flex items-center gap-2 text-emerald-200 font-medium">
                  <Check className="w-5 h-5" /> Section complete
                </p>
                {courseDone && lastSection ? (
                  <div className="mt-4">
                    <p className="flex items-center gap-2 text-white font-display text-xl">
                      <PartyPopper className="w-5 h-5 text-emerald-300" /> You did it!
                    </p>
                    <p className="text-ocean-300 text-sm mt-1 mb-4">
                      You&apos;ve completed the course. Your badge is now on your
                      profile.
                    </p>
                    <Link
                      href={certHref}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-sm font-medium transition-colors"
                    >
                      <Award className="w-4 h-4" /> View your certificate
                    </Link>
                  </div>
                ) : !lastSection ? (
                  <button
                    onClick={() => goTo(active + 1)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 text-white px-5 py-2.5 text-sm font-medium transition-colors"
                  >
                    Next section <ArrowRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            ) : !signedIn ? (
              <div className="rounded-2xl border border-ocean-700/50 bg-ocean-900/40 p-6 text-center">
                <p className="text-ocean-200 mb-4">
                  Sign in to take the quizzes and earn your certificate.
                </p>
                <Link
                  href={`/login?redirect=/courses/${courseSlug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 text-white px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  Sign in to continue
                </Link>
              </div>
            ) : (
              <div className="card-deep rounded-2xl p-6 sm:p-8">
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-ocean-400 mb-4">
                  Quick check
                </p>
                <div className="space-y-5">
                  {section.questions.map((q, qi) => {
                    const isWrong = wrong.has(q.id);
                    return (
                      <div
                        key={q.id}
                        className={
                          isWrong
                            ? "rounded-xl border border-coral-500/40 bg-coral-500/5 p-4"
                            : ""
                        }
                      >
                        <p className="font-medium text-white">
                          {qi + 1}. {q.prompt}
                        </p>
                        {isWrong && (
                          <p className="flex items-center gap-1.5 text-xs text-coral-200 mt-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Not quite — pick
                            another answer
                          </p>
                        )}
                        <div className="space-y-2 mt-3">
                          {q.options.map((opt, oi) => {
                            const selected = answers[q.id] === oi;
                            return (
                              <button
                                key={oi}
                                onClick={() => pick(q.id, oi)}
                                className={
                                  "w-full text-left rounded-xl border px-4 py-2.5 text-sm transition-colors " +
                                  (selected
                                    ? "border-ocean-400 bg-ocean-800/60 text-white"
                                    : "border-ocean-800/60 bg-ocean-900/40 text-ocean-200 hover:border-ocean-600")
                                }
                              >
                                <span className="inline-flex items-center gap-2.5">
                                  <span
                                    className={
                                      "flex items-center justify-center w-4 h-4 rounded-full border " +
                                      (selected
                                        ? "border-ocean-300 bg-ocean-400"
                                        : "border-ocean-600")
                                    }
                                  >
                                    {selected && (
                                      <Check className="w-2.5 h-2.5 text-ocean-950" />
                                    )}
                                  </span>
                                  {opt}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {wrong.size > 0 && (
                  <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-100">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      Some answers aren&apos;t right yet. Fix the highlighted{" "}
                      {wrong.size === 1 ? "question" : "questions"} above, then press{" "}
                      <span className="font-medium">{submitLabel}</span> again.
                    </span>
                  </div>
                )}
                {error && <p className="text-sm text-coral-200 mt-5">{error}</p>}

                <button
                  onClick={submitSection}
                  disabled={!allAnswered || submitting}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 text-white px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {submitLabel}
                </button>
                {!allAnswered && (
                  <p className="text-xs text-ocean-500 mt-2">
                    Answer every question to continue.
                  </p>
                )}
              </div>
            )}

            {/* Prev / Next footer */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => goTo(active - 1)}
                disabled={active === 0}
                className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors disabled:opacity-0"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <Link
                href="/courses"
                className="text-sm text-ocean-500 hover:text-ocean-300 transition-colors"
              >
                All courses
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
