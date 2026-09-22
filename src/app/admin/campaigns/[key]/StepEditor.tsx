"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Eye, EyeOff } from "lucide-react";

export type StepData = {
  id: string;
  step: number;
  delay_days: number;
  subject: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  active: boolean;
};

export type PreviewVars = Record<string, string>;

function fill(text: string, vars: PreviewVars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k: string) => vars[k.toLowerCase()] ?? "");
}

async function post(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as { ok?: boolean; error?: string; to?: string; shop?: string };
}

/**
 * One email in the sequence. Edits are saved to the database, so they
 * take effect on the next run with no deploy.
 */
export default function StepEditor({
  data,
  vars,
  shopName,
  isLast,
}: {
  data: StepData;
  vars: PreviewVars;
  shopName: string;
  isLast: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(data.subject);
  const [body, setBody] = useState(data.body);
  const [ctaLabel, setCtaLabel] = useState(data.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(data.cta_url ?? "");
  const [delay, setDelay] = useState(String(data.delay_days));
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const dirty =
    subject !== data.subject ||
    body !== data.body ||
    ctaLabel !== (data.cta_label ?? "") ||
    ctaUrl !== (data.cta_url ?? "") ||
    delay !== String(data.delay_days);

  async function run(key: string, payload: Record<string, unknown>, ok: (r: { to?: string; shop?: string }) => string) {
    setBusy(key);
    setNote(null);
    const r = await post(payload);
    setBusy(null);
    if (r.error) setNote({ tone: "bad", text: r.error });
    else {
      setNote({ tone: "ok", text: ok(r) });
      router.refresh();
    }
  }

  const paragraphs = fill(body, vars)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <li className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold ${
              data.active ? "bg-amber-400 text-ocean-950" : "bg-ocean-800 text-ocean-400"
            }`}
          >
            {data.step}
          </span>
          <div>
            <p className="text-sm font-medium text-white">Email {data.step}</p>
            <p className="text-xs text-ocean-500">
              {data.step === 1
                ? "Goes out when a shop is added to the sequence"
                : `Waits ${data.delay_days} day${data.delay_days === 1 ? "" : "s"} after the previous one`}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            run("active", { action: "save-step", stepId: data.id, patch: { active: !data.active } }, () =>
              data.active ? "Step turned off." : "Step turned on."
            )
          }
          className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
            data.active
              ? "border border-ocean-700 text-ocean-300 hover:text-white"
              : "bg-emerald-500 text-ocean-950 hover:bg-emerald-400"
          }`}
        >
          {data.active ? "Turn off" : "Turn on"}
        </button>
      </div>

      <div className="space-y-3">
        {data.step > 1 && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-ocean-500">
              Days to wait after the previous email
            </span>
            <input
              type="number"
              min={0}
              max={365}
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              className="w-24 rounded-lg border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-ocean-500">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-ocean-500">The email</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full resize-y rounded-lg border border-ocean-700 bg-ocean-950 px-3 py-2 font-mono text-[13px] leading-relaxed text-white"
          />
          <span className="mt-1 block text-[11px] text-ocean-500">
            Plain text. A blank line starts a new paragraph. A link on its own line becomes clickable.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-ocean-500">Button text</span>
            <input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="leave blank for no button"
              className="w-full rounded-lg border border-ocean-700 bg-ocean-950 px-3 py-2 text-sm text-white placeholder:text-ocean-600"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-ocean-500">Button link</span>
            <input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="{{claim_url}}"
              className="w-full rounded-lg border border-ocean-700 bg-ocean-950 px-3 py-2 font-mono text-[13px] text-white placeholder:text-ocean-600"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!dirty || busy !== null}
          onClick={() =>
            run(
              "save",
              {
                action: "save-step",
                stepId: data.id,
                patch: {
                  subject,
                  body,
                  cta_label: ctaLabel,
                  cta_url: ctaUrl,
                  delay_days: Number(delay),
                },
              },
              () => "Saved."
            )
          }
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          {dirty ? "Save changes" : "Saved"}
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-ocean-700 px-3.5 py-2 text-sm text-ocean-200 hover:text-white"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        <button
          type="button"
          disabled={busy !== null || dirty}
          title={dirty ? "Save first, the test sends the saved version" : undefined}
          onClick={() => run("test", { action: "test-step", stepId: data.id }, (r) => `Test sent to ${r.to}.`)}
          className="inline-flex items-center gap-1.5 rounded-full border border-ocean-700 px-3.5 py-2 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" /> Send me this one
        </button>
        {isLast && data.step > 1 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("delete", { action: "delete-step", stepId: data.id }, () => "Step deleted.")}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-ocean-800 px-3 py-2 text-sm text-ocean-500 hover:text-red-300 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>

      {note && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            note.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {note.text}
        </p>
      )}

      {showPreview && (
        <div className="mt-4 rounded-xl border border-ocean-800/60 bg-white p-5">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-[#7d8c99]">
            As {shopName} would see it
          </p>
          <p className="mb-4 border-b border-[#e6ecf1] pb-3 font-sans text-[15px] font-semibold text-[#0c2740]">
            {fill(subject, vars)}
          </p>
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-4 font-sans text-[15px] leading-relaxed text-[#22323f]">
              {p}
            </p>
          ))}
          {ctaLabel.trim() && ctaUrl.trim() && (
            <p className="mt-5">
              <span className="inline-block rounded-lg bg-[#0e6e8c] px-5 py-3 font-sans text-[15px] font-semibold text-white">
                {ctaLabel}
              </span>
            </p>
          )}
          <p className="mt-6 border-t border-[#e6ecf1] pt-3 font-sans text-[12px] leading-relaxed text-[#90a3b4]">
            Underground Aquarium · 1609 Blanchard Drive, Roseville, CA 95747
            <br />
            You&apos;re getting this because your shop is listed in our free directory. Unsubscribe and we won&apos;t
            email you again.
          </p>
        </div>
      )}
    </li>
  );
}
