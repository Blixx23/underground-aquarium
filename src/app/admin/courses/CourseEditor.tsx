"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Film,
  Pencil,
  X,
  ExternalLink,
  ListChecks,
  ImageIcon,
} from "lucide-react";
import SectionQuestions from "./SectionQuestions";
import LessonMedia, { type LessonMediaValue } from "./LessonMedia";

export type EditorCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  est_minutes: number;
  badge_title: string;
  cover_image: string | null;
  is_published: boolean;
  sort_order: number;
};

export type EditorQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  sort_order: number;
};

export type EditorSection = {
  id: string;
  title: string;
  content: string | null;
  has_video: boolean;
  video_url: string | null;
  image_url: string | null;
  sort_order: number;
  questionCount?: number;
  questions?: EditorQuestion[];
};

type Draft = {
  title: string;
  content: string;
  media: LessonMediaValue;
};

const EMPTY_MEDIA: LessonMediaValue = { mode: "none", image_url: "", video_url: "" };

function mediaFor(s: EditorSection): LessonMediaValue {
  return {
    mode: s.has_video ? "video" : s.image_url ? "image" : "none",
    image_url: s.image_url ?? "",
    video_url: s.video_url ?? "",
  };
}

async function post(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Something went wrong.");
  return data;
}

export default function CourseEditor({
  course,
  initialSections,
}: {
  course: EditorCourse;
  initialSections: EditorSection[];
}) {
  const router = useRouter();

  const [meta, setMeta] = useState({
    title: course.title,
    slug: course.slug,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    est_minutes: String(course.est_minutes ?? 30),
    badge_title: course.badge_title,
    cover_image: course.cover_image ?? "",
    is_published: course.is_published,
  });
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const [metaErr, setMetaErr] = useState<string | null>(null);

  const [sections, setSections] = useState<EditorSection[]>(initialSections);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    content: "",
    media: EMPTY_MEDIA,
  });
  const [mediaBusy, setMediaBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [secErr, setSecErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function saveMeta() {
    setMetaErr(null);
    setSavingMeta(true);
    try {
      await post("/api/admin/courses", {
        action: "update",
        id: course.id,
        fields: {
          title: meta.title.trim(),
          slug: meta.slug.trim().toLowerCase(),
          subtitle: meta.subtitle.trim() || null,
          description: meta.description.trim() || null,
          est_minutes: Number(meta.est_minutes) || 30,
          badge_title: meta.badge_title.trim() || "Certified",
          cover_image: meta.cover_image.trim() || null,
          is_published: meta.is_published,
        },
      });
      setMetaSaved(true);
      setTimeout(() => setMetaSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setMetaErr(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSavingMeta(false);
    }
  }

  function openEditor(s: EditorSection) {
    setSecErr(null);
    setDraft({
      title: s.title,
      content: s.content ?? "",
      media: mediaFor(s),
    });
    setOpenId(s.id);
  }

  async function addSection() {
    setSecErr(null);
    setAdding(true);
    try {
      const data = await post("/api/admin/course-sections", {
        action: "create",
        course_id: course.id,
      });
      if (data?.section) {
        const s = { ...data.section, questionCount: 0 } as EditorSection;
        setSections((prev) => [...prev, s]);
        openEditor(s);
      }
    } catch (err) {
      setSecErr(err instanceof Error ? err.message : "Couldn't add lesson.");
    } finally {
      setAdding(false);
    }
  }

  async function saveSection(id: string) {
    setSecErr(null);
    setRowBusy(id);
    // A lesson shows one visual: an image, a video, or nothing. Whatever
    // isn't the chosen kind is cleared so the player never has to guess.
    const { mode } = draft.media;
    const has_video = mode === "video";
    const video_url = has_video ? draft.media.video_url.trim() || null : null;
    const image_url = mode === "image" ? draft.media.image_url.trim() || null : null;
    try {
      const res = await post("/api/admin/course-sections", {
        action: "update",
        id,
        fields: {
          title: draft.title.trim() || "Untitled",
          content: draft.content,
          has_video,
          video_url,
          image_url,
        },
      });
      const savedVideoUrl = (res?.video_url as string | null | undefined) ?? video_url;
      setSections((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                title: draft.title.trim() || "Untitled",
                content: draft.content,
                has_video,
                video_url: savedVideoUrl,
                image_url,
              }
            : s
        )
      );
      setOpenId(null);
    } catch (err) {
      setSecErr(err instanceof Error ? err.message : "Couldn't save lesson.");
    } finally {
      setRowBusy(null);
    }
  }

  async function deleteSection(s: EditorSection) {
    if (!confirm(`Delete the lesson "${s.title}" and its quiz?`)) return;
    setSecErr(null);
    setRowBusy(s.id);
    try {
      await post("/api/admin/course-sections", { action: "delete", id: s.id });
      setSections((prev) => prev.filter((x) => x.id !== s.id));
      if (openId === s.id) setOpenId(null);
    } catch (err) {
      setSecErr(err instanceof Error ? err.message : "Couldn't delete.");
    } finally {
      setRowBusy(null);
    }
  }

  async function move(idx: number, dir: "up" | "down") {
    const j = dir === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSections(next);
    setSecErr(null);
    try {
      await post("/api/admin/course-sections", {
        action: "reorder",
        orderedIds: next.map((s) => s.id),
      });
    } catch (err) {
      setSecErr(err instanceof Error ? err.message : "Couldn't reorder.");
    }
  }

  function setSectionQuestionCount(id: string, count: number) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, questionCount: count } : s))
    );
  }

  const input =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";
  const label = "block text-xs font-mono uppercase tracking-wider text-ocean-500 mb-1.5";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="font-display text-3xl text-white">Edit course</h1>
        <Link
          href={`/courses/${course.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Preview
        </Link>
      </div>
      <p className="text-ocean-400 text-sm mb-8">
        Edit the course details and its lessons. Quiz questions get their own
        editor in the next step.
      </p>

      {/* Course details */}
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 sm:p-6 mb-8">
        <p className="text-sm font-medium text-white mb-4">Course details</p>
        {metaErr && (
          <p className="text-sm text-coral-200 mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
            {metaErr}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Title</label>
            <input
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label className={label}>URL slug</label>
            <input
              value={meta.slug}
              onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Badge title</label>
            <input
              value={meta.badge_title}
              onChange={(e) => setMeta({ ...meta, badge_title: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Estimated minutes</label>
            <input
              type="number"
              value={meta.est_minutes}
              onChange={(e) =>
                setMeta({ ...meta, est_minutes: e.target.value })
              }
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Subtitle</label>
            <input
              value={meta.subtitle}
              onChange={(e) => setMeta({ ...meta, subtitle: e.target.value })}
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Description</label>
            <textarea
              value={meta.description}
              onChange={(e) =>
                setMeta({ ...meta, description: e.target.value })
              }
              rows={3}
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Cover image URL</label>
            <input
              value={meta.cover_image}
              onChange={(e) =>
                setMeta({ ...meta, cover_image: e.target.value })
              }
              placeholder="https://…"
              className={input}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <label className="inline-flex items-center gap-2 text-sm text-ocean-200 cursor-pointer">
            <input
              type="checkbox"
              checked={meta.is_published}
              onChange={(e) =>
                setMeta({ ...meta, is_published: e.target.checked })
              }
              className="accent-emerald-500 w-4 h-4"
            />
            Published (visible to everyone)
          </label>
          <div className="flex items-center gap-3">
            {metaSaved && (
              <span className="text-sm text-emerald-300">Saved</span>
            )}
            <button
              onClick={saveMeta}
              disabled={savingMeta}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
            >
              {savingMeta ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save details
            </button>
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-2xl text-white">Lessons</h2>
        <button
          onClick={addSection}
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-700 hover:bg-ocean-600 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add lesson
        </button>
      </div>

      {secErr && (
        <p className="text-sm text-coral-200 mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {secErr}
        </p>
      )}

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400 text-sm">
          No lessons yet. Add the first one.
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((s, idx) => {
            const open = openId === s.id;
            const busy = rowBusy === s.id;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 overflow-hidden"
              >
                {/* Row header */}
                <div className="flex items-center gap-3 p-4">
                  <span className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full border border-ocean-700 text-[11px] text-ocean-300">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-white">
                        {s.title}
                      </h3>
                      {s.has_video ? (
                        <Film className="w-3.5 h-3.5 text-ocean-400 shrink-0" />
                      ) : s.image_url ? (
                        <ImageIcon className="w-3.5 h-3.5 text-ocean-400 shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-xs text-ocean-500 mt-0.5 inline-flex items-center gap-1">
                      <ListChecks className="w-3 h-3" />
                      {s.questionCount ?? 0} quiz questions
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {busy && (
                      <Loader2 className="w-4 h-4 animate-spin text-ocean-500 mr-1" />
                    )}
                    <button
                      onClick={() => move(idx, "up")}
                      disabled={idx === 0}
                      className="p-1.5 text-ocean-400 hover:text-white transition-colors disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => move(idx, "down")}
                      disabled={idx === sections.length - 1}
                      className="p-1.5 text-ocean-400 hover:text-white transition-colors disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => (open ? setOpenId(null) : openEditor(s))}
                      className="p-1.5 text-ocean-400 hover:text-white transition-colors"
                      title={open ? "Close" : "Edit"}
                    >
                      {open ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Pencil className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteSection(s)}
                      disabled={busy}
                      className="p-1.5 text-ocean-500 hover:text-coral-300 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Editor */}
                {open && (
                  <>
                  <div className="border-t border-ocean-800/60 p-4 sm:p-5 space-y-4">
                    <div>
                      <label className={label}>Lesson title</label>
                      <input
                        value={draft.title}
                        onChange={(e) =>
                          setDraft({ ...draft, title: e.target.value })
                        }
                        className={input}
                      />
                    </div>
                    <div>
                      <label className={label}>
                        Lesson content (Markdown: **bold**, lists)
                      </label>
                      <textarea
                        value={draft.content}
                        onChange={(e) =>
                          setDraft({ ...draft, content: e.target.value })
                        }
                        rows={10}
                        className={input + " font-body leading-relaxed"}
                      />
                    </div>
                    <LessonMedia
                      sectionId={s.id}
                      value={draft.media}
                      onChange={(media) => setDraft({ ...draft, media })}
                      onBusyChange={setMediaBusy}
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveSection(s.id)}
                        disabled={busy || mediaBusy}
                        className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save lesson
                      </button>
                      <button
                        onClick={() => setOpenId(null)}
                        className="text-sm text-ocean-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-ocean-800/60 p-4 sm:p-5">
                    <SectionQuestions
                      sectionId={s.id}
                      initialQuestions={s.questions ?? []}
                      onCountChange={(count) =>
                        setSectionQuestionCount(s.id, count)
                      }
                    />
                  </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
