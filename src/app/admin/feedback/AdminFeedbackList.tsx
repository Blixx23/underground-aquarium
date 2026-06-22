"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Loader2,
  Bug,
  Lightbulb,
  ExternalLink,
  RotateCcw,
  Play,
  Search,
} from "lucide-react";

type QueueFeedback = {
  id: string;
  kind: string;
  message: string;
  page_url: string | null;
  status: string;
  created_at: string | null;
  submitter_username: string | null;
  submitter_name: string | null;
};

type Status = "new" | "in_progress" | "done";
type Filter = Status | "all";

const STATUS_META: Record<Status, { label: string; pill: string }> = {
  new: { label: "New", pill: "bg-sky-500/15 text-sky-300" },
  in_progress: { label: "In progress", pill: "bg-amber-500/15 text-amber-300" },
  done: { label: "Done", pill: "bg-ocean-800/60 text-ocean-400" },
};

function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function pageLabel(url: string): string {
  if (url === "/") return "the homepage";
  return url;
}

function PageLink({ url, label }: { url: string; label: string }) {
  const isExternal = /^https?:\/\//i.test(url);
  const className =
    "inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 break-all";
  if (isExternal) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={className}>
        {label}
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </a>
    );
  }
  return (
    <Link href={url} target="_blank" className={className}>
      {label}
      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
    </Link>
  );
}

export default function AdminFeedbackList({
  initialFeedback,
}: {
  initialFeedback: QueueFeedback[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<QueueFeedback[]>(initialFeedback);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("new");
  const [query, setQuery] = useState("");

  const counts = {
    new: items.filter((f) => f.status === "new").length,
    in_progress: items.filter((f) => f.status === "in_progress").length,
    done: items.filter((f) => f.status === "done").length,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((f) => {
      if (filter !== "all" && f.status !== filter) return false;
      if (!q) return true;
      const hay = [
        f.message,
        f.submitter_username,
        f.submitter_name,
        f.page_url,
        f.kind,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, filter, query]);

  async function move(id: string, status: Status) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  const tab = (value: Filter, label: string, n?: number) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        filter === value
          ? "bg-ocean-700 text-white"
          : "text-ocean-400 hover:text-ocean-200"
      }`}
    >
      {label}
      {typeof n === "number" && (
        <span className="text-xs text-ocean-500">{n}</span>
      )}
    </button>
  );

  const primaryBtn =
    "inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60";
  const ghostBtn =
    "inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 hover:text-white hover:border-ocean-500 transition-colors disabled:opacity-60";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl bg-ocean-900/60 border border-ocean-800/60 p-1">
          {tab("new", "New", counts.new)}
          {tab("in_progress", "In progress", counts.in_progress)}
          {tab("done", "Done", counts.done)}
          {tab("all", "All")}
        </div>
        <div className="relative flex-1 min-w-[12rem] max-w-xs">
          <Search className="w-4 h-4 text-ocean-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search feedback"
            className="w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 pl-9 pr-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-coral-300 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 mb-4">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
          {query.trim()
            ? `No feedback matches “${query.trim()}”.`
            : filter === "new"
            ? "Nothing new right now."
            : filter === "in_progress"
            ? "Nothing in progress."
            : filter === "done"
            ? "Nothing finished yet."
            : "No feedback yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((f) => {
            const who = f.submitter_username
              ? `@${f.submitter_username}`
              : f.submitter_name || "Anonymous";
            const when = whenLabel(f.created_at);
            const busy = busyId === f.id;
            const isBug = f.kind === "bug";
            const status = (f.status as Status) ?? "new";
            const meta = STATUS_META[status] ?? STATUS_META.new;
            const spin = busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null;
            return (
              <div
                key={f.id}
                className={`rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 ${
                  status === "done" ? "opacity-75" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-ocean-800/50 shrink-0 flex items-center justify-center">
                    {isBug ? (
                      <Bug className="w-5 h-5 text-coral-300" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-amber-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] uppercase tracking-wide rounded-full px-2 py-0.5 ${
                          isBug
                            ? "bg-coral-500/15 text-coral-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {isBug ? "Bug" : "Idea"}
                      </span>
                      <span
                        className={`text-[11px] uppercase tracking-wide rounded-full px-2 py-0.5 ${meta.pill}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-ocean-200 mt-2 whitespace-pre-line break-words">
                      {f.message}
                    </p>
                    {f.page_url && (
                      <p className="text-xs text-ocean-500 mt-2">
                        Submitted from{" "}
                        <PageLink
                          url={f.page_url}
                          label={pageLabel(f.page_url)}
                        />
                      </p>
                    )}
                    <p className="text-xs text-ocean-500 mt-1">
                      From {who}
                      {when ? ` · ${when}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {status === "new" && (
                    <>
                      <button
                        onClick={() => move(f.id, "in_progress")}
                        disabled={busy}
                        className={primaryBtn}
                      >
                        {spin ?? <Play className="w-4 h-4" />}
                        Start
                      </button>
                      <button
                        onClick={() => move(f.id, "done")}
                        disabled={busy}
                        className={ghostBtn}
                      >
                        <Check className="w-4 h-4" /> Mark done
                      </button>
                    </>
                  )}
                  {status === "in_progress" && (
                    <>
                      <button
                        onClick={() => move(f.id, "done")}
                        disabled={busy}
                        className={primaryBtn}
                      >
                        {spin ?? <Check className="w-4 h-4" />}
                        Mark done
                      </button>
                      <button
                        onClick={() => move(f.id, "new")}
                        disabled={busy}
                        className={ghostBtn}
                      >
                        <RotateCcw className="w-4 h-4" /> Back to new
                      </button>
                    </>
                  )}
                  {status === "done" && (
                    <button
                      onClick={() => move(f.id, "new")}
                      disabled={busy}
                      className={ghostBtn}
                    >
                      {spin ?? <RotateCcw className="w-4 h-4" />}
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
