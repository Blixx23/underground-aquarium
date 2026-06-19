"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Crown, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  user_id: string | null;
  role: string;
  status: string;
  tier: string;
  display_name: string | null;
  email: string | null;
  paid_through: string | null;
  joined_at: string;
  account_name?: string | null;
  paid_online?: boolean;
};

const ROLES = ["member", "officer", "admin"];
const STATUSES = ["active", "lapsed", "pending"];
const TIERS = ["individual", "family", "lifetime"];

export default function MemberManager({
  clubId,
  initialMembers,
}: {
  clubId: string;
  viewerRole: string;
  initialMembers: Member[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [tier, setTier] = useState("individual");

  const [renewalDraft, setRenewalDraft] = useState<Record<string, string>>(
    Object.fromEntries(initialMembers.map((m) => [m.id, m.paid_through ?? ""]))
  );

  function fmtDate(d: string | null) {
    if (!d) return "—";
    const dt = new Date(d + "T00:00:00");
    return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
  }

  async function addMember() {
    setError(null);
    if (!name.trim() && !email.trim()) {
      setError("Enter at least a name or an email.");
      return;
    }
    setAdding(true);
    try {
      const { error: insErr } = await supabase.from("club_members").insert({
        club_id: clubId,
        display_name: name.trim() || null,
        email: email.trim() || null,
        role,
        tier,
        status: "active",
      });
      if (insErr) throw insErr;
      setName("");
      setEmail("");
      setRole("member");
      setTier("individual");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add member.");
    } finally {
      setAdding(false);
    }
  }

  async function updateField(id: string, field: "role" | "status", value: string) {
    setError(null);
    setBusyId(id);
    try {
      const { error: updErr } = await supabase
        .from("club_members")
        .update({ [field]: value })
        .eq("id", id);
      if (updErr) throw updErr;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update.");
    } finally {
      setBusyId(null);
    }
  }

  async function setRenewal(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const date = renewalDraft[id] || null;
      const { error: rpcErr } = await supabase.rpc("set_member_renewal", {
        p_member: id,
        p_date: date,
      });
      if (rpcErr) throw rpcErr;
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't set the renewal date."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(id: string, label: string) {
    if (!confirm(`Remove ${label} from the club?`)) return;
    setError(null);
    setBusyId(id);
    try {
      const { error: delErr } = await supabase
        .from("club_members")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove member.");
    } finally {
      setBusyId(null);
    }
  }

  const fieldClass =
    "rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-2 py-1 text-sm text-white focus:outline-none focus:border-ocean-500 capitalize";
  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";
  const dateClass =
    "rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-2 py-1 text-sm text-white focus:outline-none focus:border-ocean-500";

  return (
    <div>
      {error && (
        <p className="text-sm text-coral-300 mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}

      {/* Add member */}
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 mb-6">
        <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-ocean-300" /> Add a member
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className={inputClass}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className={fieldClass}>
            {TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={addMember}
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add
          </button>
        </div>
        <p className="text-xs text-ocean-600 mt-2">
          You can add members who don&apos;t have an account yet — they&apos;ll link
          up automatically when they sign up with the same email.
        </p>
      </div>

      {/* Roster */}
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ocean-500 border-b border-ocean-800/60">
              <th className="font-medium px-4 py-3">Member</th>
              <th className="font-medium px-4 py-3">Role</th>
              <th className="font-medium px-4 py-3">Status</th>
              <th className="font-medium px-4 py-3">Renewal</th>
              <th className="font-medium px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {initialMembers.map((m) => {
              const label =
                m.display_name || m.account_name || m.email || "Member";
              const isOwner = m.role === "owner";
              const busy = busyId === m.id;
              return (
                <tr key={m.id} className="border-b border-ocean-800/40 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-ocean-100">
                      {isOwner && <Crown className="w-4 h-4 text-amber-300 shrink-0" />}
                      <span>{label}</span>
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-ocean-500" />}
                    </div>
                    {m.email && m.display_name && (
                      <div className="text-xs text-ocean-500">{m.email}</div>
                    )}
                    {!m.user_id && (
                      <div className="text-[11px] text-ocean-600">No account yet</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <span className="text-ocean-400 capitalize">owner</span>
                    ) : (
                      <select
                        value={m.role}
                        disabled={busy}
                        onChange={(e) => updateField(m.id, "role", e.target.value)}
                        className={fieldClass}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={m.status}
                      disabled={busy || isOwner}
                      onChange={(e) => updateField(m.id, "status", e.target.value)}
                      className={fieldClass}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <span className="text-ocean-600">—</span>
                    ) : m.paid_online ? (
                      <span
                        className="inline-flex items-center gap-1 text-ocean-300 whitespace-nowrap"
                        title="Set automatically by online dues payments"
                      >
                        {fmtDate(m.paid_through)}
                        <Lock className="w-3 h-3 text-ocean-500" />
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={renewalDraft[m.id] ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            setRenewalDraft((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          className={dateClass}
                        />
                        <button
                          onClick={() => setRenewal(m.id)}
                          disabled={busy}
                          className="rounded-full bg-ocean-700 px-3 py-1 text-xs font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
                        >
                          Set
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isOwner && (
                      <button
                        onClick={() => removeMember(m.id, label)}
                        disabled={busy}
                        className="text-ocean-500 hover:text-coral-300 transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
