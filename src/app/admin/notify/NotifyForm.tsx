"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";

const TITLE_MAX = 80;
const BODY_MAX = 300;

/** Common places to send people. "Other page" takes any site path. */
const PLACES = [
  { label: "Local fish stores", path: "/aquarium-stores" },
  { label: "Classifieds", path: "/marketplace" },
  { label: "Feed", path: "/feed" },
  { label: "Forums", path: "/forums" },
  { label: "Events", path: "/events" },
  { label: "No link", path: "" },
  { label: "Other page", path: "custom" },
];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function NotifyForm({ reach }: { reach: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("Review your local fish store");
  const [body, setBody] = useState(
    "Got a fish store you love? Leave it a quick review so other hobbyists near you know where to go. It only takes a minute."
  );
  const [place, setPlace] = useState("/aquarium-stores");
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"test" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  // One id per message, so a double click or retry can't send it twice.
  const [sendId, setSendId] = useState(newId);

  const link = place === "custom" ? custom.trim() : place;
  const linkBad = place === "custom" && (!link.startsWith("/") || link.startsWith("//"));
  const ready = title.trim() && body.trim() && !linkBad;

  async function send(test: boolean) {
    setError(null);
    setResult(null);
    if (!ready) {
      setError(linkBad ? "The link must be a page on the site, starting with /" : "Add a title and a message.");
      return;
    }
    setBusy(test ? "test" : "all");
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), link, email, test, sendId: test ? newId() : sendId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send that.");
      if (test) {
        setResult("Test sent to you. Check your bell.");
      } else {
        setResult(`Sent to ${Number(data.sent).toLocaleString()} members.`);
        setSendId(newId());
        setConfirming(false);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that.");
    } finally {
      setBusy(null);
    }
  }

  const input =
    "w-full rounded-xl border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:border-ocean-500 focus:outline-none";

  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      {error && (
        <p className="mb-3 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">{error}</p>
      )}
      {result && (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {result}
        </p>
      )}

      <label className="mb-1 block text-xs text-ocean-400">Title</label>
      <input
        value={title}
        maxLength={TITLE_MAX}
        onChange={(e) => {
          setTitle(e.target.value);
          setConfirming(false);
        }}
        className={`${input} mb-1`}
      />
      <p className="mb-4 text-right text-xs text-ocean-600">
        {title.length}/{TITLE_MAX}
      </p>

      <label className="mb-1 block text-xs text-ocean-400">Message</label>
      <textarea
        value={body}
        maxLength={BODY_MAX}
        rows={3}
        onChange={(e) => {
          setBody(e.target.value);
          setConfirming(false);
        }}
        className={`${input} mb-1 resize-y`}
      />
      <p className="mb-4 text-right text-xs text-ocean-600">
        {body.length}/{BODY_MAX}
      </p>

      <label className="mb-1 block text-xs text-ocean-400">When they tap it, take them to</label>
      <select
        value={place}
        onChange={(e) => {
          setPlace(e.target.value);
          setConfirming(false);
        }}
        className={`${input} mb-2`}
      >
        {PLACES.map((p) => (
          <option key={p.label} value={p.path}>
            {p.label}
            {p.path && p.path !== "custom" ? ` (${p.path})` : ""}
          </option>
        ))}
      </select>
      {place === "custom" && (
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setConfirming(false);
          }}
          placeholder="/stores/some-shop"
          className={`${input} mb-2`}
        />
      )}

      <label className="mb-5 mt-3 flex items-center gap-2 text-sm text-ocean-200">
        <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4" />
        Also email members who get Site news by email
      </label>

      <p className="mb-2 text-xs text-ocean-400">How it looks in the bell</p>
      <div className="mb-5 flex gap-3 rounded-xl border border-ocean-800/60 bg-ocean-950/60 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-300">
          <Bell className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">{title || "Title"}</span>
          <span className="block text-sm text-ocean-300">{body || "Message"}</span>
          <span className="mt-0.5 block text-xs text-ocean-500">just now</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => send(true)}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-ocean-700 px-4 py-2 text-sm text-ocean-100 hover:bg-ocean-800/60 disabled:opacity-50"
        >
          {busy === "test" && <Loader2 className="h-4 w-4 animate-spin" />}
          Send a test to me
        </button>

        {!confirming ? (
          <button
            type="button"
            onClick={() => (ready ? setConfirming(true) : send(false))}
            disabled={busy !== null}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            Send to {reach.toLocaleString()} members
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => send(false)}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-medium text-ocean-950 hover:bg-amber-300 disabled:opacity-50"
            >
              {busy === "all" && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, send it to everyone
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy !== null}
              className="px-2 py-2 text-sm text-ocean-400 hover:text-white"
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {confirming && (
        <p className="mt-3 text-xs text-amber-200">
          This goes to every member at once and can&apos;t be taken back. Check the wording above first.
        </p>
      )}
    </div>
  );
}
