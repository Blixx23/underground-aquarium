"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Trash2, Users, Check } from "lucide-react";

type FamilyMember = {
  id: string;
  display_name: string | null;
  email: string | null;
  user_id: string | null;
  status: string;
};

export default function FamilyManager({
  clubId,
  familyMax,
}: {
  clubId: string;
  familyMax: number;
}) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/clubs/family?clubId=${clubId}`);
      const data = await res.json();
      if (res.ok) setMembers(data.members ?? []);
    } catch {
      // best-effort; leave list as-is
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const atCap = members.length >= familyMax;

  async function add() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter an email address.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/clubs/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, email: email.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't add family member.");
      setName("");
      setEmail("");
      setNotice(
        data.emailed
          ? "Added — we emailed them an invite to create their account."
          : "Added. Ask them to sign up with that email to link their account."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add family member.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string, label: string) {
    if (!confirm(`Remove ${label} from your family membership?`)) return;
    setError(null);
    setNotice(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/clubs/family", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, memberId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't remove.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove.");
    } finally {
      setBusyId(null);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div className="mt-6 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <h3 className="font-display text-lg text-white mb-1 flex items-center gap-2">
        <Users className="w-4 h-4 text-ocean-300" /> Your family
      </h3>
      <p className="text-xs text-ocean-500 mb-4">
        Your membership covers up to {familyMax} family member
        {familyMax === 1 ? "" : "s"}. Add them by email — they&apos;ll get their
        own login and won&apos;t pay separate dues.
      </p>

      {error && (
        <p className="text-sm text-coral-300 mb-3 rounded-lg border border-coral-500/30 bg-coral-500/10 px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-emerald-300 mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {notice}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ocean-500 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {members.length > 0 && (
            <ul className="mb-4 space-y-2">
              {members.map((m) => {
                const label = m.display_name || m.email || "Family member";
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ocean-800/50 bg-ocean-900/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ocean-100">{label}</p>
                      <p className="truncate text-xs text-ocean-500">
                        {m.email}
                        {!m.user_id && " · invite sent, not signed up yet"}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(m.id, label)}
                      disabled={busyId === m.id}
                      className="shrink-0 text-ocean-500 hover:text-coral-300 transition-colors disabled:opacity-50"
                      title="Remove"
                    >
                      {busyId === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {atCap ? (
            <p className="text-xs text-ocean-500">
              You&apos;ve reached your family limit of {familyMax}. Remove someone
              to add another.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className={inputClass}
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className={inputClass}
                />
              </div>
              <button
                onClick={add}
                disabled={adding}
                className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Add family member
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
