"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fish, Loader2, ImagePlus, X, MapPin } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/marketplace/categories";
import { CONDITIONS } from "@/lib/marketplace/listings";
import type { MarketRegion } from "@/lib/marketplace/regions";
import { LISTING_LIFETIME_DAYS } from "@/lib/config";
import { prepareImage } from "@/lib/images/prepareImage";

const MAX_PHOTOS = 8;

type ListingKind = "sale" | "free" | "wanted";

type Photo = { file: File; preview: string };

/** The shape the edit page hands in. Absent means "posting something new". */
export type ExistingListing = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string | null;
  price_cents: number | null;
  is_wanted: boolean;
  condition: string | null;
  city: string | null;
  images: string[] | null;
  region_id: string;
  state_code: string;
  allow_messages: boolean;
  show_email: boolean;
  contact_phone: string | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function kindOf(listing: ExistingListing): ListingKind {
  if (listing.is_wanted) return "wanted";
  if (listing.price_cents === 0) return "free";
  return "sale";
}

export default function PostListingForm({
  regions,
  existing,
}: {
  regions: MarketRegion[];
  existing?: ExistingListing;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isEdit = !!existing;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [kind, setKind] = useState<ListingKind>(
    existing ? kindOf(existing) : "sale"
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [stateCode, setStateCode] = useState(existing?.state_code ?? "");
  const [regionId, setRegionId] = useState(existing?.region_id ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [price, setPrice] = useState(
    existing && existing.price_cents !== null && existing.price_cents > 0
      ? (existing.price_cents / 100).toFixed(2)
      : ""
  );
  const [condition, setCondition] = useState(existing?.condition ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Photos already living in storage. Removing one here just drops the URL
  // from the listing; the file itself stays in the bucket.
  const [keptImages, setKeptImages] = useState<string[]>(
    existing?.images ?? []
  );
  const [converting, setConverting] = useState(false);

  const [allowMessages, setAllowMessages] = useState(
    existing?.allow_messages ?? true
  );
  const [showEmail, setShowEmail] = useState(existing?.show_email ?? false);
  const [contactPhone, setContactPhone] = useState(
    existing?.contact_phone ?? ""
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoCount = keptImages.length + photos.length;

  // States, in alphabetical order by name.
  const states = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of regions) seen.set(r.state_code, r.state_name);
    return [...seen.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [regions]);

  const stateRegions = useMemo(
    () => regions.filter((r) => r.state_code === stateCode),
    [regions, stateCode]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setCheckingAuth(false);
    })();
  }, [supabase]);

  // Remember the last area someone posted in — most people post repeatedly
  // from the same place, and retyping it every time is friction we don't need.
  // Never applied when editing: that listing already has an area.
  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = localStorage.getItem("ua:lastRegion");
      if (!saved) return;
      const parsed = JSON.parse(saved) as { stateCode: string; regionId: string };
      if (parsed.stateCode && regions.some((r) => r.id === parsed.regionId)) {
        setStateCode(parsed.stateCode);
        setRegionId(parsed.regionId);
      }
    } catch {
      // No saved area, or storage is blocked. Not a problem.
    }
  }, [regions, isEdit]);

  // Changing state clears a region that no longer belongs to it.
  useEffect(() => {
    if (!regionId) return;
    const stillValid = regions.some(
      (r) => r.id === regionId && r.state_code === stateCode
    );
    if (!stillValid) setRegionId("");
  }, [stateCode, regionId, regions]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const selected = Array.from(input.files ?? []);
    if (selected.length === 0) return;
    setError(null);

    const room = MAX_PHOTOS - photoCount;
    if (room <= 0) {
      setError(`That's the limit — ${MAX_PHOTOS} photos per listing.`);
      // Clear the picker so choosing the same file again still fires onChange.
      input.value = "";
      return;
    }

    setConverting(true);
    const added: Photo[] = [];
    const failures: string[] = [];

    for (const original of selected.slice(0, room)) {
      try {
        // Handles HEIC conversion, EXIF rotation and downscaling.
        const file = await prepareImage(original);
        added.push({ file, preview: URL.createObjectURL(file) });
      } catch (err) {
        failures.push(
          err instanceof Error
            ? err.message
            : `"${original.name}" couldn't be processed.`
        );
      }
    }

    if (added.length > 0) {
      setPhotos((prev) => [...prev, ...added]);
    }
    if (failures.length > 0) {
      setError(failures.join(" "));
    }

    setConverting(false);
    input.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      const [gone] = next.splice(index, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return next;
    });
  }

  async function submit() {
    setError(null);

    if (!title.trim()) {
      setError("Give your listing a title.");
      return;
    }
    if (!category) {
      setError("Pick a category.");
      return;
    }
    if (!regionId) {
      setError("Choose the area you're posting in.");
      return;
    }

    let priceCents: number | null = null;
    if (kind === "free") {
      priceCents = 0;
    } else if (kind === "sale") {
      const trimmed = price.trim();
      if (trimmed === "") {
        // Left blank on purpose = "contact for price".
        priceCents = null;
      } else {
        const parsed = parseFloat(trimmed);
        if (isNaN(parsed) || parsed < 0) {
          setError("Enter a valid price, or leave it blank for 'contact for price'.");
          return;
        }
        priceCents = Math.round(parsed * 100);
      }
    }

    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      if (!currentUser) {
        setError("You need to be signed in to post.");
        setBusy(false);
        return;
      }

      // Upload photos first — a listing with half its photos missing is
      // worse than a listing that failed to post at all.
      const imageUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${currentUser.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, photo.file);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage
          .from("listing-images")
          .getPublicUrl(path);
        imageUrls.push(publicUrl.publicUrl);
      }

      // Photos already on the listing keep their order, new ones go after.
      const allImages = [...keptImages, ...imageUrls];

      // Everything except identity, slug and status is written the same way
      // whether this is a new post or an edit.
      const fields = {
        region_id: regionId,
        // The trigger overwrites this from region_id, so it can't drift out
        // of sync. region_slug is only sent on insert, to satisfy its NOT NULL.
        state_code: stateCode,
        title: title.trim(),
        category,
        description: description.trim() || null,
        price_cents: priceCents,
        is_wanted: kind === "wanted",
        condition: kind === "wanted" ? null : condition || null,
        city: city.trim() || null,
        images: allImages.length ? allImages : null,
        allow_messages: allowMessages,
        show_email: showEmail,
        // Only stored when they deliberately opt in, so the listing page
        // never has to reach into the auth tables to display it.
        contact_email: showEmail ? currentUser.email ?? null : null,
        contact_phone: contactPhone.trim() || null,
      };

      let finalSlug: string;

      if (existing) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(fields)
          .eq("id", existing.id);
        if (updateError) throw updateError;
        finalSlug = existing.slug;
      } else {
        const listingSlug = `${slugify(title).slice(0, 60)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        const { data: created, error: insertError } = await supabase
          .from("listings")
          .insert({
            ...fields,
            region_slug: "",
            user_id: currentUser.id,
            slug: listingSlug,
            status: "active",
          })
          .select("slug")
          .single();
        if (insertError) throw insertError;
        finalSlug = created.slug as string;

        // Onboarding grant — server verifies ownership; idempotent.
        fetch("/api/bubbles/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "first_listing" }),
        }).catch(() => {});
      }

      try {
        localStorage.setItem(
          "ua:lastRegion",
          JSON.stringify({ stateCode, regionId })
        );
      } catch {
        // Storage blocked. Harmless.
      }

      router.push(`/listing/${finalSlug}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Something went wrong saving your changes."
            : "Something went wrong posting your listing."
      );
      setBusy(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-ocean-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
        <h2 className="font-display text-2xl text-white mb-2">
          Sign in to post
        </h2>
        <p className="text-ocean-400 mb-6">
          Posting is free. An account just keeps the site free of spam and lets
          buyers message you.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl border border-ocean-700/60 text-ocean-200 hover:text-white hover:border-ocean-600 transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-7"
    >
      {error && (
        <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300">
          {error}
        </div>
      )}

      {/* What kind of post */}
      <div>
        <label className="block text-sm text-ocean-300 mb-2">
          What are you posting?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "sale", label: "For sale" },
              { key: "free", label: "Free" },
              { key: "wanted", label: "Wanted" },
            ] as { key: ListingKind; label: string }[]
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setKind(option.key)}
              className={`rounded-xl px-4 py-3 text-sm font-medium border transition-colors ${
                kind === option.key
                  ? "bg-ocean-600 border-ocean-500 text-white"
                  : "bg-ocean-900/50 border-ocean-800/60 text-ocean-300 hover:text-white hover:border-ocean-600/70"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-ocean-300 mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={
            kind === "wanted"
              ? "Looking for a 40 gallon breeder"
              : "Blue dream neocaridina, adult breeders"
          }
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm text-ocean-300 mb-2">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Select a category…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Where */}
      <div>
        <label className="flex items-center gap-2 text-sm text-ocean-300 mb-2">
          <MapPin className="w-4 h-4 text-ocean-500" />
          Where are you?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              State…
            </option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            disabled={!stateCode}
            className={`${inputClass} disabled:opacity-50`}
          >
            <option value="" disabled>
              {stateCode ? "Area…" : "Pick a state first"}
            </option>
            {stateRegions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={60}
          placeholder="Your town (optional) — e.g. Roseville"
          className={`${inputClass} mt-3`}
        />
        <p className="text-xs text-ocean-500 mt-2">
          Your exact address is never shown. The town just helps buyers judge
          the drive.
        </p>
      </div>

      {/* Price + condition */}
      {kind !== "wanted" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {kind === "sale" && (
            <div>
              <label className="block text-sm text-ocean-300 mb-2">
                Price (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25.00"
                className={inputClass}
              />
              <p className="text-xs text-ocean-500 mt-2">
                Leave blank for &ldquo;contact for price&rdquo;.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm text-ocean-300 mb-2">
              Condition (optional)
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className={inputClass}
            >
              <option value="">Not specified</option>
              {CONDITIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Photos */}
      <div>
        <label className="block text-sm text-ocean-300 mb-2">
          Photos ({photoCount}/{MAX_PHOTOS})
        </label>

        {photoCount > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
            {keptImages.map((url, i) => (
              <div
                key={url}
                className="relative aspect-square rounded-xl overflow-hidden border border-ocean-800/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setKeptImages((prev) => prev.filter((u) => u !== url))
                  }
                  className="absolute top-1.5 right-1.5 rounded-full bg-ocean-950/80 p-1.5 text-ocean-200 hover:text-white transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ocean-950/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ocean-200">
                    Cover
                  </span>
                )}
              </div>
            ))}

            {photos.map((photo, i) => (
              <div
                key={photo.preview}
                className="relative aspect-square rounded-xl overflow-hidden border border-ocean-800/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={`Photo ${keptImages.length + i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-ocean-950/80 p-1.5 text-ocean-200 hover:text-white transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {keptImages.length === 0 && i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ocean-950/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ocean-200">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {photoCount < MAX_PHOTOS && (
          <label className="block cursor-pointer rounded-xl border border-dashed border-ocean-700/60 bg-ocean-900/40 hover:border-ocean-500 transition-colors overflow-hidden">
            {converting ? (
              <div className="h-32 flex flex-col items-center justify-center text-ocean-400">
                <Loader2 className="w-7 h-7 mb-2 animate-spin" />
                <span className="text-sm">Processing photos…</span>
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-ocean-500">
                <ImagePlus className="w-7 h-7 mb-2" />
                <span className="text-sm">
                  {photoCount === 0 ? "Add photos" : "Add more"}
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/*,image/heic,image/heif,.heic,.heif,.HEIC,.HEIF"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
          </label>
        )}
        <p className="text-xs text-ocean-500 mt-2">
          Listings with a clear photo get far more replies. The first one is the
          cover. iPhone HEIC photos are converted automatically.
        </p>
      </div>

      <div>
        <label className="block text-sm text-ocean-300 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder={
            kind === "wanted"
              ? "What you're after, size, budget, how far you'll travel."
              : "Size, age, how long you've had it, why you're rehoming it, pickup details."
          }
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Contact */}
      <fieldset className="rounded-2xl border border-ocean-800/60 bg-ocean-900/30 p-5">
        <legend className="px-2 text-sm text-ocean-300">
          How should people reach you?
        </legend>

        <label className="flex items-start gap-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowMessages}
            onChange={(e) => setAllowMessages(e.target.checked)}
            className="mt-1 accent-ocean-500"
          />
          <span>
            <span className="block text-ocean-200 text-sm">
              Messages on the site
            </span>
            <span className="block text-xs text-ocean-500">
              Recommended. Your email stays private.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showEmail}
            onChange={(e) => setShowEmail(e.target.checked)}
            className="mt-1 accent-ocean-500"
          />
          <span>
            <span className="block text-ocean-200 text-sm">
              Show my email on the listing
            </span>
            <span className="block text-xs text-ocean-500">
              Anyone can see it, scrapers included.
            </span>
          </span>
        </label>

        <div className="pt-2">
          <label className="block text-xs text-ocean-500 mb-2">
            Phone number (optional, shown publicly)
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            maxLength={30}
            placeholder="916-555-0148"
            className={inputClass}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy || converting}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-ocean-600 text-white font-medium hover:bg-ocean-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit
            ? busy
              ? "Saving…"
              : "Save changes"
            : busy
              ? "Posting…"
              : "Post it, free"}
        </button>

        {isEdit ? (
          <Link
            href="/my/listings"
            className="text-sm text-ocean-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
        ) : (
          <p className="text-xs text-ocean-500">
            Stays up for {LISTING_LIFETIME_DAYS} days. Renew or delete it any
            time.
          </p>
        )}
      </div>
    </form>
  );
}
