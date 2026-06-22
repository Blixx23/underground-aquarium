"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import BubbleIcon from "@/components/bubbles/BubbleIcon";

type Member = {
  username: string;
  full_name: string | null;
  bubble_balance: number;
};

export default function BubbleAwardForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"grant" | "deduct">("grant");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // typeahead
  const [matches, setMatches] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const suppress = useRef(false);

  useEffect(() => {
    if (suppress.current) {
      suppress.current = false;
      return;
    }
    const q = username.trim().replace(/^@/, "");
    if (q.length < 1) {
      setMatches([]);
      setOpen(false);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/members/search?q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        if (!active) return;
        setMatches(data.members ?? []);
        setOpen(true);
      } catch {
        if (active) setMatches([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [username]);

  function pick(m: Member) {
    suppress.current = true;
    setUsername(m.username);
    setMatches([]);
    setOpen(false);
  }

  async function submit() {
    setError(null);
    setResult(null);
    const amt = parseInt(amount, 10);
    if (!username.trim()) {
      setError("Enter a username.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required — it's recorded in the ledger.");
      return;
    }
    const delta = direction === "grant" ? amt : -amt;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bubbles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().replace(/^@/, ""),
          delta,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't apply that.");
      setResult(
        `${direction === "grant" ? "Granted" : "Deducted"} ${amt} ${
          amt === 1 ? "bubble" : "bubbles"
        } ${direction === "grant" ? "to" : "from"} @${data.username} — new balance ${
          data.balance
        }.`
      );
      setAmount("");
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't apply that.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      {error && (
        <p className="text-sm text-coral-300 mb-3 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}
      {result && (
        <p className="text-sm text-emerald-300 mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
          {result}
        </p>
      )}

      <label className="block text-xs text-ocean-400 mb-1">Member username</label>
      <div className="relative mb-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onFocus={() => {
            if (matches.length > 0) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Start typing a username…"
          autoComplete="off"
          className={inputClass}
        />
        {searching && (
          <Loader2 className="w-4 h-4 animate-spin text-ocean-500 absolute right-3 top-2.5" />
        )}
        {open && matches.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-ocean-700/60 bg-ocean-900/95 backdrop-blur-xl shadow-2xl shadow-ocean-950/80 overflow-hidden">
            {matches.map((m) => (
              <button
                key={m.username}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ocean-800/60 transition-colors"
              >
                <span className="min-w-0">
                  <span className="text-sm text-white">@{m.username}</span>
                  {m.full_name && (
                    <span className="text-xs text-ocean-500 ml-2">
                      {m.full_name}
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-ocean-400 shrink-0">
                  <BubbleIcon className="w-3.5 h-3.5 text-ocean-300" />
                  {m.bubble_balance}
                </span>
              </button>
            ))}
          </div>
        )}
        {open && !searching && matches.length === 0 && username.trim() && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-ocean-700/60 bg-ocean-900/95 px-3 py-2 text-sm text-ocean-500">
            No members match that.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-xs text-ocean-400 mb-1">Action</label>
          <div className="inline-flex rounded-xl bg-ocean-900/60 border border-ocean-800/60 p-1">
            <button
              type="button"
              onClick={() => setDirection("grant")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                direction === "grant"
                  ? "bg-emerald-600/30 text-emerald-200"
                  : "text-ocean-400 hover:text-ocean-200"
              }`}
            >
              Grant
            </button>
            <button
              type="button"
              onClick={() => setDirection("deduct")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                direction === "deduct"
                  ? "bg-coral-500/20 text-coral-200"
                  : "text-ocean-400 hover:text-ocean-200"
              }`}
            >
              Deduct
            </button>
          </div>
        </div>
        <div className="w-32">
          <label className="block text-xs text-ocean-400 mb-1">Amount</label>
          <div className="flex items-center gap-2">
            <BubbleIcon className="w-5 h-5 text-ocean-300" />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <label className="block text-xs text-ocean-400 mb-1">Reason</label>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why? (recorded in the ledger)"
        className={`${inputClass} mb-4`}
      />

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {direction === "grant" ? "Grant bubbles" : "Deduct bubbles"}
      </button>
    </div>
  );
}
