"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GraduationCap,
} from "lucide-react";

export type AdminCourse = {
  id: string;
  slug: string;
  title: string;
  badge_title: string;
  est_minutes: number;
  is_published: boolean;
  sort_order: number;
  lessons?: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminCoursesList({
  initialCourses,
}: {
  initialCourses: AdminCourse[];
}) {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [badge, setBadge] = useState("");
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Something went wrong.");
    return data;
  }

  async function createCourse() {
    setError(null);
    const t = title.trim();
    const s = (slug.trim() || slugify(t)).toLowerCase();
    if (!t || !s) {
      setError("A title is required.");
      return;
    }
    setBusy(true);
    try {
      const data = await call({
        action: "create",
        title: t,
        slug: s,
        badge_title: badge.trim() || "Certified",
      });
      setTitle("");
      setSlug("");
      setBadge("");
      setCreating(false);
      if (data?.id) router.push(`/admin/courses/${data.id}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create course.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(c: AdminCourse) {
    setError(null);
    setRowBusy(c.id);
    try {
      await call({
        action: "update",
        id: c.id,
        fields: { is_published: !c.is_published },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update.");
    } finally {
      setRowBusy(null);
    }
  }

  async function remove(c: AdminCourse) {
    if (
      !confirm(
        `Delete "${c.title}"? This removes its lessons, quizzes, and everyone's completions. This can't be undone.`
      )
    )
      return;
    setError(null);
    setRowBusy(c.id);
    try {
      await call({ action: "delete", id: c.id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
    } finally {
      setRowBusy(null);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div>
      {error && (
        <p className="text-sm text-coral-200 mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}

      {/* New course */}
      <div className="mb-6">
        {creating ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
            <p className="text-sm font-medium text-white mb-3">New course</p>
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Course title"
                className={inputClass}
              />
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={title ? slugify(title) : "url-slug (optional)"}
                className={inputClass}
              />
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Badge title (e.g. Certified New Tank Owner)"
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={createCourse}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create &amp; edit
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setError(null);
                }}
                className="text-sm text-ocean-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-700 hover:bg-ocean-600 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> New course
          </button>
        )}
      </div>

      {/* List */}
      {initialCourses.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center">
          <GraduationCap className="w-7 h-7 text-ocean-500 mx-auto mb-3" />
          <p className="text-ocean-300 text-sm">No courses yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialCourses.map((c) => {
            const busyRow = rowBusy === c.id;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 flex items-center gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-white">
                      {c.title}
                    </h3>
                    {c.is_published ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                        Published
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ocean-500 mt-0.5">
                    /{c.slug} · {c.lessons ?? 0} lessons · ~{c.est_minutes} min
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {busyRow && (
                    <Loader2 className="w-4 h-4 animate-spin text-ocean-500 mr-1" />
                  )}
                  <Link
                    href={`/admin/courses/${c.id}`}
                    className="p-2 text-ocean-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => togglePublish(c)}
                    disabled={busyRow}
                    className="p-2 text-ocean-400 hover:text-white transition-colors disabled:opacity-50"
                    title={c.is_published ? "Unpublish" : "Publish"}
                  >
                    {c.is_published ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={busyRow}
                    className="p-2 text-ocean-500 hover:text-coral-300 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
