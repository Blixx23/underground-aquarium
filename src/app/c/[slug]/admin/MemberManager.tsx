"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Crown, Loader2, Lock, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  user_id: string | null;
  role: string;
  status: string;
  tier: string;
  officer_title?: string | null;
  family_primary_id?: string | null;
  display_name: string | null;
  email: string | null;
  phone?: string | null;
  paid_through: string | null;
  joined_at: string;
  account_name?: string | null;
  paid_online?: boolean;
};

const ROLES = ["member", "officer", "admin"];
const STATUSES = ["active", "prospect", "lapsed", "pending"];
const TIERS = ["individual", "family", "lifetime"];

export default function MemberManager({
  clubId,
  clubHasDues,
  initialMembers,
}: {
  clubId: string;
  viewerRole: string;
  clubHasDues: boolean;
  initialMembers: Member[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [tier, setTier] = useState("individual");

  const [renewalDraft, setRenewalDraft] = useState<Record<string, string>>(
    Object.fromEntries(initialMembers.map((m) => [m.id, m.paid_through ?? ""]))
  );
  const [titleDraft, setTitleDraft] = useState<Record<string, string>>(
    Object.fromEntries(initialMembers.map((m) => [m.id, m.officer_title ?? ""]))
  );

  // Search by name, @username, email, or phone. Phone matching ignores
  // formatting so "5551234" finds "(555) 123-4567".
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialMembers;
    const qDigits = q.replace(/\D/g, "");
    return initialMembers.filter((m) => {
      const hay = [
        m.display_name,
        m.account_name,
        m.account_name ? `@${m.account_name}` : null,
        m.email,
        m.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (hay.includes(q)) return true;
      if (qDigits.length >= 2) {
        const pd = (m.phone ?? "").replace(/\D/g, "");
        if (pd && pd.includes(qDigits)) return true;
      }
      return false;
    });
  }, [initialMembers, query]);

  // Resolve a primary member's display label even if they're filtered out.
  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of initialMembers) {
      map[m.id] = m.display_name || m.account_name || m.email || "Member";
    }
    return map;
  }, [initialMembers]);

  // How many family members each main member covers.
  const childCountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of initialMembers) {
      if (m.family_primary_id) {
        map[m.family_primary_id] = (map[m.family_primary_id] ?? 0) + 1;
      }
    }
    return map;
  }, [initialMembers]);

  // Group family members directly beneath their main member.
  const ordered = useMemo(() => {
    const childrenByPrimary = new Map<string, Member[]>();
    const tops: Member[] = [];
    for (const m of filtered) {
      if (m.family_primary_id) {
        const arr = childrenByPrimary.get(m.family_primary_id) ?? [];
        arr.push(m);
        childrenByPrimary.set(m.family_primary_id, arr);
      } else {
        tops.push(m);
      }
    }
    const out: Member[] = [];
    const placed = new Set<string>();
    for (const m of tops) {
      out.push(m);
      placed.add(m.id);
      for (const k of childrenByPrimary.get(m.id) ?? []) {
        out.push(k);
        placed.add(k.id);
      }
    }
    // Children whose main member isn't in the current (filtered) view.
    for (const m of filtered) if (!placed.has(m.id)) out.push(m);
    return out;
  }, [filtered]);

  const total = initialMembers.length;
  const searching = query.trim().length > 0;
  const countLabel = searching
    ? `${filtered.length} of ${total}`
    : `${total} ${total === 1 ? "member" : "members"}`;

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
        status: clubHasDues ? "prospect" : "active",
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

  async function updateField(
    id: string,
    field: "role" | "status" | "tier",
    value: string
  ) {
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

  async function updateTitle(id: string) {
    const value = (titleDraft[id] ?? "").trim();
    const current = initialMembers.find((m) => m.id === id)?.officer_title ?? "";
    if (value === (current ?? "")) return; // nothing changed
    setError(null);
    setBusyId(id);
    try {
      const { error: updErr } = await supabase
        .from("club_members")
        .update({ officer_title: value || null })
        .eq("id", id);
      if (updErr) throw updErr;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update title.");
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

  const todayUTC = (() => {
    const n = new Date();
    return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  })();

  function duesBadgeFor(m: Member): { label: string; cls: string } | null {
    if (m.role === "owner") return null;
    const good = "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
    const warn = "text-amber-300 border-amber-500/30 bg-amber-500/10";
    const muted = "text-ocean-400 border-ocean-700/50 bg-ocean-800/40";
    if (!clubHasDues) return { label: "No dues", cls: muted };
    if (m.family_primary_id) return { label: "Covered", cls: good };
    if (m.tier === "lifetime") return { label: "Lifetime", cls: good };
    const pt = m.paid_through
      ? Date.parse(`${m.paid_through}T00:00:00Z`)
      : null;
    if (pt !== null && !Number.isNaN(pt) && pt >= todayUTC)
      return { label: "Paid", cls: good };
    return { label: "Owes", cls: warn };
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

      {/* Search + count */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[14rem] max-w-sm">
          <Search className="w-4 h-4 text-ocean-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, @username, email, phone"
            className="w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 pl-9 pr-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500"
          />
        </div>
        <span className="text-xs text-ocean-500 whitespace-nowrap">
          {countLabel}
        </span>
      </div>

      {/* Roster */}
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 overflow-x-auto mb-8">
          <datalist id="officer-titles">
            <option value="President" />
            <option value="Vice President" />
            <option value="Treasurer" />
            <option value="Secretary" />
            <option value="Events Coordinator" />
            <option value="Membership Chair" />
          </datalist>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ocean-500 border-b border-ocean-800/60">
              <th className="font-medium px-4 py-3">Member</th>
              <th className="font-medium px-4 py-3">Role</th>
              <th className="font-medium px-4 py-3">Plan</th>
              <th className="font-medium px-4 py-3">Status</th>
              <th className="font-medium px-4 py-3">Renewal</th>
              <th className="font-medium px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-ocean-400"
                >
                  {searching
                    ? `No members match “${query.trim()}”.`
                    : "No members yet — add one below."}
                </td>
              </tr>
            ) : (
              ordered.map((m) => {
                const label =
                  m.display_name || m.account_name || m.email || "Member";
                const isOwner = m.role === "owner";
                const isFamilyChild = !!m.family_primary_id;
                const primaryName = isFamilyChild
                  ? nameById[m.family_primary_id as string] ?? "their family"
                  : null;
                const childCount = childCountById[m.id] ?? 0;
                const dues = duesBadgeFor(m);
                const busy = busyId === m.id;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-ocean-800/40 last:border-0"
                  >
                    <td className={`px-4 py-3 ${isFamilyChild ? "pl-8" : ""}`}>
                      <div className="flex items-center gap-2 text-ocean-100">
                        {isFamilyChild && (
                          <span
                            className="text-ocean-600 shrink-0"
                            title="Family member"
                          >
                            ↳
                          </span>
                        )}
                        {isOwner && (
                          <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                        )}
                        <span>{label}</span>
                        {childCount > 0 && (
                          <span className="shrink-0 rounded-full border border-ocean-700/60 bg-ocean-800/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ocean-300">
                            Family · {childCount}
                          </span>
                        )}
                        {busy && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-ocean-500" />
                        )}
                      </div>
                      {isFamilyChild && (
                        <div className="text-[11px] text-ocean-500">
                          Family of {primaryName}
                        </div>
                      )}
                      <div className="text-xs text-ocean-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        {m.account_name && <span>@{m.account_name}</span>}
                        {m.email && m.email !== label && (
                          <span>{m.email}</span>
                        )}
                        {m.phone && <span>{m.phone}</span>}
                      </div>
                      {!m.user_id && (
                        <div className="text-[11px] text-ocean-600">
                          No account yet
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {isOwner ? (
                          <span className="text-ocean-400 capitalize">owner</span>
                        ) : (
                          <select
                            value={m.role}
                            disabled={busy}
                            onChange={(e) =>
                              updateField(m.id, "role", e.target.value)
                            }
                            className={fieldClass}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
                        {m.role !== "member" && (
                          <input
                            list="officer-titles"
                            value={titleDraft[m.id] ?? ""}
                            disabled={busy}
                            placeholder="Title (e.g. President)"
                            onChange={(e) =>
                              setTitleDraft((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }))
                            }
                            onBlur={() => updateTitle(m.id)}
                            className="w-36 rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-2 py-1 text-xs text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isOwner ? (
                        <span className="text-ocean-400 capitalize">
                          {m.tier}
                        </span>
                      ) : m.family_primary_id ? (
                        <span
                          className="text-ocean-500 capitalize"
                          title="Managed by the main member"
                        >
                          family
                        </span>
                      ) : (
                        <select
                          value={m.tier}
                          disabled={busy}
                          onChange={(e) =>
                            updateField(m.id, "tier", e.target.value)
                          }
                          className={fieldClass}
                        >
                          {TIERS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.status}
                        disabled={busy || isOwner}
                        onChange={(e) =>
                          updateField(m.id, "status", e.target.value)
                        }
                        className={fieldClass}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {isOwner ? (
                        <span className="text-ocean-600">—</span>
                      ) : (
                        <div className="space-y-1.5">
                          {dues && (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${dues.cls}`}
                            >
                              {dues.label}
                            </span>
                          )}
                          {m.family_primary_id ||
                          m.tier === "lifetime" ||
                          !clubHasDues ? null : m.paid_online ? (
                            <span
                              className="flex items-center gap-1 text-ocean-300 whitespace-nowrap"
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add member */}
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4">
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={fieldClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className={fieldClass}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={addMember}
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Add
          </button>
        </div>
        <p className="text-xs text-ocean-600 mt-2">
          You can add members who don&apos;t have an account yet — they&apos;ll
          link up automatically when they sign up with the same email.
        </p>
        {clubHasDues && (
          <p className="text-xs text-ocean-600 mt-1">
            New members start as a{" "}
            <span className="text-ocean-400">prospect</span> and aren&apos;t
            counted until dues are paid — online, or by setting a renewal date
            above.
          </p>
        )}
      </div>
    </div>
  );
}
