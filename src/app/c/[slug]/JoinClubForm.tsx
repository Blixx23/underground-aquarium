"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LEVELS = ["beginner", "intermediate", "advanced"];

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const HEARD = [
  "A friend or fellow hobbyist",
  "A local fish store",
  "Facebook",
  "Instagram",
  "Reddit",
  "YouTube",
  "Google search",
  "A fish club or show",
  "Other",
];

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function JoinClubForm({
  clubId,
  defaultName = "",
  dues = 0,
  lifetimeDues = null,
  society = false,
}: {
  clubId: string;
  clubName?: string;
  defaultName?: string;
  dues?: number;
  lifetimeDues?: number | null;
  /** Brass styling and Society wording, rather than the generic club form. */
  society?: boolean;
}) {
  const tierOptions = [
    {
      value: "individual",
      label: dues > 0 ? `Individual — ${money(dues)}/yr` : "Individual",
    },
    ...(lifetimeDues && lifetimeDues > 0
      ? [{ value: "lifetime", label: `Lifetime — ${money(lifetimeDues)} once` }]
      : []),
  ];
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [heard, setHeard] = useState("");
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
      setError(
        society
          ? "Please add a phone number so the Society can reach you."
          : "Please add a phone number so the club can reach you."
      );
      return;
    }
    if (!line1.trim() || !city.trim() || !state || !zip.trim()) {
      setError("Please add your full mailing address.");
      return;
    }
    if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) {
      setError("Please enter a 5-digit ZIP code.");
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
        p_address_line1: line1.trim(),
        p_address_line2: line2.trim() || null,
        p_city: city.trim(),
        p_state: state,
        p_postal_code: zip.trim(),
        p_heard_about: heard || null,
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
        className={
          society
            ? "inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-ocean-950 transition-all duration-300 hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-500/25"
            : "inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
        }
      >
        <UserPlus className="w-4 h-4" />
        {society ? "Apply for membership" : "Request to join"}
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
      <div>
        <label className={labelClass}>Mailing address</label>
        <input
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="Street address"
          autoComplete="address-line1"
          className={inputClass}
        />
      </div>
      <div>
        <input
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          placeholder="Apt, suite, unit (optional)"
          autoComplete="address-line2"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_7rem] gap-3">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          autoComplete="address-level2"
          className={inputClass}
        />
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          autoComplete="address-level1"
          className={inputClass}
          aria-label="State"
        >
          <option value="">State</option>
          {STATES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP"
          inputMode="numeric"
          autoComplete="postal-code"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Membership</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className={inputClass}
          >
            {tierOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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
        <label className={labelClass}>How did you hear about us? (optional)</label>
        <select
          value={heard}
          onChange={(e) => setHeard(e.target.value)}
          className={inputClass}
        >
          <option value="">Choose one</option>
          {HEARD.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>
          Note to the {society ? "Society" : "club"} officers (optional)
        </label>
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
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            society
              ? "bg-amber-400 text-ocean-950 hover:bg-amber-300"
              : "bg-ocean-700 text-white hover:bg-ocean-600"
          }`}
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
