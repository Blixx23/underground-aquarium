"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TIERS = ["individual", "family", "lifetime"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export default function JoinClubForm({
  clubId,
  defaultName = "",
}: {
  clubId: string;
  clubName?: string;
  defaultName?: string;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState("individual");
  const [experience, setExperience] = useState("");
  const [interests, setInterests] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!phone.trim()) {
      setError("Please add a phone number so the club can reach you.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: e } = await supabase.rpc("join_club", {
        p_club: clubId,
        p_display_name: name.trim(),
        p_tier: tier,
        p_phone: phone.trim(),
        p_experience: experience || null,
        p_interests: interests.trim() || null,
        p_note: note.trim() || null,
      });
      if (e) throw e;
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't submit your application."
      );
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";
  const labelClass = "block text-xs text-ocean-400 mb-1 text-left";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Request to join
      </button>
    );
  }

  return (
    <div className="text-left space-y-3 max-w-md mx-auto">
      {error && <p className="text-sm text-coral-300">{error}</p>}
      <div>
        <label className={labelClass}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Membership</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className={`${inputClass} capitalize`}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Experience</label>
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className={`${inputClass} capitalize`}
          >
            <option value="">Prefer not to say</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Main interests</label>
        <input
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="e.g. cichlids, planted tanks, breeding"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Note to the officers (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Submit application
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="text-sm text-ocean-400 hover:text-ocean-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
