"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  Check,
  X,
  Pencil,
} from "lucide-react";
import type { EditorQuestion } from "./CourseEditor";

type Draft = { prompt: string; options: string[]; correct: number };

async function post(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/course-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Something went wrong.");
  return data;
}

export default function SectionQuestions({
  sectionId,
  initialQuestions,
}: {
  sectionId: string;
  initialQuestions: EditorQuestion[];
}) {
  const [questions, setQuestions] = useState<EditorQuestion[]>(
    [...initialQuestions].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    prompt: "",
    options: [],
    correct: 0,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openEditor(q: EditorQuestion) {
    setErr(null);
    setDraft({
      prompt: q.prompt,
      options: [...q.options],
      correct: q.correct_index,
    });
    setOpenId(q.id);
  }

  async function addQuestion() {
    setErr(null);
    setAdding(true);
    try {
      const data = await post({ action: "create", section_id: sectionId });
      if (data?.question) {
        const q = data.question as EditorQuestion;
        setQuestions((prev) => [...prev, q]);
        openEditor(q);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't add question.");
    } finally {
      setAdding(false);
    }
  }

  async function saveQuestion(id: string) {
    const prompt = draft.prompt.trim();
    const options = draft.options.map((o) => o.trim());
    if (!prompt) {
      setErr("Enter a question.");
      return;
    }
    if (options.length < 2) {
      setErr("Add at least two answers.");
      return;
    }
    if (options.some((o) => !o)) {
      setErr("Every answer needs text.");
      return;
    }
    if (draft.correct < 0 || draft.correct >= options.length) {
      setErr("Mark the correct answer.");
      return;
    }
    setErr(null);
    setBusyId(id);
    try {
      await post({
        action: "update",
        id,
        fields: { prompt, options, correct_index: draft.correct },
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, prompt, options, correct_index: draft.correct }
            : q
        )
      );
      setOpenId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save question.");
    } finally {
      setBusyId(null);
    }
  }

  async function del(q: EditorQuestion) {
    if (!confirm("Delete this question?")) return;
    setErr(null);
    setBusyId(q.id);
    try {
      await post({ action: "delete", id: q.id });
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
      if (openId === q.id) setOpenId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't delete.");
    } finally {
      setBusyId(null);
    }
  }

  async function move(idx: number, dir: "up" | "down") {
    const j = dir === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[idx], next[j]] = [next[j], next[idx]];
    setQuestions(next);
    setErr(null);
    try {
      await post({ action: "reorder", orderedIds: next.map((q) => q.id) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't reorder.");
    }
  }

  function setOpt(i: number, val: string) {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, oi) => (oi === i ? val : o)),
    }));
  }
  function addOpt() {
    setDraft((d) => ({ ...d, options: [...d.options, ""] }));
  }
  function removeOpt(i: number) {
    setDraft((d) => {
      const options = d.options.filter((_, oi) => oi !== i);
      let correct = d.correct;
      if (i === d.correct) correct = 0;
      else if (i < d.correct) correct = d.correct - 1;
      return { ...d, options, correct };
    });
  }

  const input =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white">Quiz</p>
        <button
          onClick={addQuestion}
          disabled={adding}
          className="inline-flex items-center gap-1.5 rounded-full bg-ocean-700 hover:bg-ocean-600 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-60"
        >
          {adding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Add question
        </button>
      </div>

      {err && (
        <p className="text-sm text-coral-200 mb-3 rounded-lg border border-coral-500/30 bg-coral-500/10 px-3 py-2">
          {err}
        </p>
      )}

      {questions.length === 0 ? (
        <p className="text-sm text-ocean-500">
          No questions yet. A lesson needs at least one to gate progress.
        </p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => {
            const open = openId === q.id;
            const busy = busyId === q.id;
            return (
              <div
                key={q.id}
                className="rounded-xl border border-ocean-800/60 bg-ocean-950/40"
              >
                <div className="flex items-start gap-2 p-3">
                  <span className="text-[11px] text-ocean-400 mt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      {q.prompt || "Untitled question"}
                    </p>
                    {!open && (
                      <p className="text-xs text-emerald-300/80 mt-0.5 truncate">
                        Correct: {q.options[q.correct_index] ?? "—"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {busy && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-ocean-500 mr-1" />
                    )}
                    <button
                      onClick={() => move(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 text-ocean-400 hover:text-white transition-colors disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => move(idx, "down")}
                      disabled={idx === questions.length - 1}
                      className="p-1 text-ocean-400 hover:text-white transition-colors disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => (open ? setOpenId(null) : openEditor(q))}
                      className="p-1 text-ocean-400 hover:text-white transition-colors"
                      title={open ? "Close" : "Edit"}
                    >
                      {open ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        <Pencil className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => del(q)}
                      disabled={busy}
                      className="p-1 text-ocean-500 hover:text-coral-300 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-ocean-800/60 p-3 space-y-3">
                    <input
                      value={draft.prompt}
                      onChange={(e) =>
                        setDraft({ ...draft, prompt: e.target.value })
                      }
                      placeholder="Question"
                      className={input}
                    />
                    <div className="space-y-2">
                      {draft.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({ ...d, correct: i }))
                            }
                            title="Mark as correct answer"
                            className={
                              "flex items-center justify-center w-5 h-5 shrink-0 rounded-full border transition-colors " +
                              (draft.correct === i
                                ? "border-emerald-400 bg-emerald-500"
                                : "border-ocean-600 hover:border-emerald-400")
                            }
                          >
                            {draft.correct === i && (
                              <Check className="w-3 h-3 text-ocean-950" />
                            )}
                          </button>
                          <input
                            value={opt}
                            onChange={(e) => setOpt(i, e.target.value)}
                            placeholder={`Answer ${i + 1}`}
                            className={input}
                          />
                          {draft.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOpt(i)}
                              className="p-1.5 text-ocean-500 hover:text-coral-300 transition-colors shrink-0"
                              title="Remove answer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={addOpt}
                        className="text-xs text-ocean-300 hover:text-white transition-colors"
                      >
                        + Add answer
                      </button>
                      <span className="text-xs text-ocean-600">
                        Tap the circle to set the correct answer
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => saveQuestion(q.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save question
                      </button>
                      <button
                        onClick={() => setOpenId(null)}
                        className="text-sm text-ocean-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
