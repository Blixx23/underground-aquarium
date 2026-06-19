"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Users, Check, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Club = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  is_public: boolean;
  approved: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  public_url: string | null;
  meeting_info: string | null;
  nonprofit_info: string | null;
  dues_amount_cents: number;
};

export default function ClubSettings({ club }: { club: Club }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description ?? "");
  const [city, setCity] = useState(club.city ?? "");
  const [state, setState] = useState(club.state ?? "");
  const [isPublic, setIsPublic] = useState(club.is_public);
  const [dues, setDues] = useState(
    club.dues_amount_cents ? (club.dues_amount_cents / 100).toFixed(2) : ""
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(club.logo_url);

  const [contactName, setContactName] = useState(club.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(club.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(club.contact_phone ?? "");
  const [publicUrl, setPublicUrl] = useState(club.public_url ?? "");
  const [meetingInfo, setMeetingInfo] = useState(club.meeting_info ?? "");
  const [nonprofitInfo, setNonprofitInfo] = useState(club.nonprofit_info ?? "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSaved(false);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("clubId", club.id);
      const res = await fetch("/api/clubs/logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't upload the logo.");
      setLogoUrl(json.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the logo.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("Club name can't be empty.");
      return;
    }
    // Verification details are required before a club can go public.
    if (isPublic) {
      const missing =
        !contactName.trim() ||
        !contactEmail.trim() ||
        !contactPhone.trim() ||
        !publicUrl.trim() ||
        !meetingInfo.trim();
      if (missing) {
        setError(
          "To list your club publicly, fill in the organizer name, email, phone, a public link, and meeting info below."
        );
        return;
      }
    }
    const duesCents = Math.max(0, Math.round((parseFloat(dues) || 0) * 100));
    setSaving(true);
    try {
      const { error: updErr } = await supabase
        .from("clubs")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          is_public: isPublic,
          dues_amount_cents: duesCents,
          logo_url: logoUrl,
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          public_url: publicUrl.trim() || null,
          meeting_info: meetingInfo.trim() || null,
          nonprofit_info: nonprofitInfo.trim() || null,
        })
        .eq("id", club.id);
      if (updErr) throw updErr;
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";
  const labelClass = "block text-xs text-ocean-400 mb-1";

  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 space-y-4">
      {error && (
        <p className="text-sm text-coral-300 rounded-lg border border-coral-500/30 bg-coral-500/10 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Club logo"
            className="w-16 h-16 rounded-xl object-cover border border-ocean-800/60"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-ocean-800/60 flex items-center justify-center">
            <Users className="w-7 h-7 text-ocean-400" />
          </div>
        )}
        <label className="inline-flex items-center gap-2 rounded-lg border border-ocean-700/60 px-3 py-2 text-sm text-ocean-200 hover:bg-ocean-800/40 cursor-pointer transition-colors">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? "Uploading…" : "Upload logo"}
          <input
            type="file"
            accept="image/*"
            onChange={handleLogo}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div>
        <label className={labelClass}>Club name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Annual dues (USD)</label>
        <div className="flex items-center gap-1 rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 focus-within:border-ocean-500 max-w-[160px]">
          <span className="text-ocean-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={dues}
            onChange={(e) => setDues(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-sm text-white placeholder-ocean-600 focus:outline-none"
          />
        </div>
        <p className="text-[11px] text-ocean-600 mt-1">
          Leave blank or 0 for a free club. Changing this affects new dues
          payments only.
        </p>
      </div>

      {/* Organizer & verification */}
      <div className="space-y-4 rounded-xl border border-ocean-800/60 bg-ocean-950/30 p-4">
        <div>
          <p className="text-sm font-medium text-white">
            Organizer &amp; verification
          </p>
          <p className="text-xs text-ocean-500 mt-0.5">
            Required to list your club publicly — it helps us confirm real
            clubs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Organizer name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Smith"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="club@email.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Public link (website / Facebook / IG)
            </label>
            <input
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Meeting info (where &amp; when)</label>
          <input
            value={meetingInfo}
            onChange={(e) => setMeetingInfo(e.target.value)}
            placeholder="2nd Saturday monthly · Roseville Library (or online)"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Nonprofit status (optional)</label>
          <input
            value={nonprofitInfo}
            onChange={(e) => setNonprofitInfo(e.target.value)}
            placeholder="e.g. 501(c)(3), EIN 12-3456789 — or leave blank"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-ocean-200 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-ocean-700 bg-ocean-900"
          />
          Public club (shows on member profiles and discovery)
        </label>
        {isPublic &&
          (club.approved ? (
            <p className="text-xs text-emerald-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" />
              Approved — your club is listed in the public directory.
            </p>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-xs text-amber-200 flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Pending review — your club won&apos;t appear in the public
                  directory until an admin approves it. Members can still join
                  with an invite link in the meantime.
                </span>
              </p>
            </div>
          ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-300">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
