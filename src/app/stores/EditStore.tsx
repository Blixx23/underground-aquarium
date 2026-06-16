"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STORE_TYPES = [
  "freshwater",
  "saltwater",
  "corals",
  "reef",
  "plants",
  "reptiles",
  "dry goods",
];

type StoreData = {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  tags: string[] | null;
};

export default function EditStore({
  store,
  isOwner,
}: {
  store: StoreData;
  isOwner: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(store.address ?? "");
  const [city, setCity] = useState(store.city ?? "");
  const [state, setState] = useState(store.state ?? "");
  const [phone, setPhone] = useState(store.phone ?? "");
  const [website, setWebsite] = useState(store.website ?? "");
  const [hours, setHours] = useState(store.hours ?? "");
  const [description, setDescription] = useState(store.description ?? "");
  const [tags, setTags] = useState<string[]>(store.tags ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  function toggleTag(t: string) {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("fish_stores")
        .update({
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          hours: hours.trim() || null,
          description: description.trim() || null,
          tags,
        })
        .eq("id", store.id);
      if (updateError) throw updateError;
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't save your changes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 px-4 py-2 text-sm font-medium hover:bg-emerald-500/25 transition-colors mb-6"
      >
        <Pencil className="w-4 h-4" /> Edit listing
      </button>
    );
  }

  const inputClass =
    "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40";

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-medium">Edit your listing</p>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-ocean-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address"
          className={inputClass}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className={inputClass}
          />
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State (e.g. CA)"
            className={inputClass}
          />
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className={inputClass}
        />
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website"
          className={inputClass}
        />
        <textarea
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          rows={3}
          placeholder="Hours (e.g. Mon-Sat 11am-7pm)"
          className={inputClass}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Short description of your shop"
          className={inputClass}
        />

        <div>
          <p className="text-ocean-300 text-sm mb-2">What you carry</p>
          <div className="flex flex-wrap gap-2">
            {STORE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors " +
                  (tags.includes(t)
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-white/5 border-white/10 text-ocean-300 hover:text-white")
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-300">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-white/10 text-ocean-300 px-4 py-2.5 text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}