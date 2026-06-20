"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fish, Loader2, ImagePlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/marketplace/categories";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SellPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [shippingPrice, setShippingPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const [busy, setBusy] = useState<null | "publish" | "draft">(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, [supabase]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);

    let file = selected;
    const isHeic =
      /image\/hei[cf]/i.test(selected.type) || /\.(heic|heif)$/i.test(selected.name);

    if (isHeic) {
      setConverting(true);
      try {
        const heic2any = (await import("heic2any")).default;
        const result = await heic2any({
          blob: selected,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const blob = Array.isArray(result) ? result[0] : result;
        file = new File([blob], selected.name.replace(/\.(heic|heif)$/i, ".jpg"), {
          type: "image/jpeg",
        });
      } catch (err) {
        console.error("HEIC conversion failed:", err);
        setError("That photo couldn't be processed. Try a JPG or PNG instead.");
        setConverting(false);
        return;
      }
      setConverting(false);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setName("");
    setCategory("");
    setPrice("");
    setStock("");
    setDescription("");
    setShippingPrice("");
    setImageFile(null);
    setImagePreview(null);
  }

  async function save(asDraft: boolean) {
    setError(null);
    setDraftSaved(false);

    if (!name.trim()) {
      setError("Please give your listing a name.");
      return;
    }

    // Drafts can be incomplete; published listings can't.
    let priceNum = parseFloat(price);
    if (asDraft) {
      if (isNaN(priceNum) || priceNum < 0) priceNum = 0;
    } else {
      if (!category) {
        setError("Please choose a category.");
        return;
      }
      if (isNaN(priceNum) || priceNum < 0) {
        setError("Please enter a valid price.");
        return;
      }
    }

    setBusy(asDraft ? "draft" : "publish");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      if (!currentUser) {
        setError("You need to be signed in to create a listing.");
        setBusy(null);
        return;
      }

      let storeId: string;
      const { data: existingStore } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", currentUser.id)
        .limit(1)
        .maybeSingle();

      if (existingStore) {
        storeId = existingStore.id;
      } else {
        const username =
          currentUser.user_metadata?.username ||
          currentUser.email?.split("@")[0] ||
          "seller";
        const storeSlug = `${slugify(username)}-${currentUser.id.slice(0, 6)}`;
        const { data: newStore, error: storeError } = await supabase
          .from("stores")
          .insert({
            owner_id: currentUser.id,
            name: `${username}'s Shop`,
            slug: storeSlug,
          })
          .select("id")
          .single();
        if (storeError) throw storeError;
        storeId = newStore.id;
      }

      let imageUrls: string[] = [];
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${currentUser.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        imageUrls = [publicUrlData.publicUrl];
      }

      const productSlug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          store_id: storeId,
          name: name.trim(),
          slug: productSlug,
          category: category || "other",
          description: description.trim() || null,
          price: priceNum,
          stock: stock === "" ? null : parseInt(stock, 10),
          shipping_price: Math.max(0, parseFloat(shippingPrice) || 0),
          is_live_animal: false,
          is_active: !asDraft,
          is_draft: asDraft,
          images: imageUrls.length ? imageUrls : null,
          species_slug: null,
        })
        .select("slug")
        .single();
      if (productError) throw productError;

      if (asDraft) {
        setBusy(null);
        setDraftSaved(true);
        resetForm();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push(`/marketplace/${newProduct.slug}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong creating your listing."
      );
      setBusy(null);
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-ocean-500 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">Sign in to sell</h1>
          <p className="text-ocean-400 mb-6">
            You need an account to create a listing. It only takes a moment.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          New Listing
        </p>
        <h1 className="font-display text-4xl text-white mb-3">List something for sale</h1>
        <p className="text-ocean-400 mb-10">
          Fill in the details below and add a photo to make it shine.
        </p>

        {draftSaved && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-emerald-300 mb-6">
            Draft saved. You&apos;ll find it in your Seller Hub under Listings &rarr; Drafts.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300 mb-6">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm text-ocean-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aquascaping Driftwood Piece"
              className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white focus:outline-none focus:border-ocean-500 transition-colors"
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
            <p className="text-xs text-ocean-500 mt-2">
              Pick the closest fit. Use &ldquo;Other&rdquo; if nothing matches.
            </p>
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">Photo (optional)</label>
            <label className="block cursor-pointer rounded-xl border border-dashed border-ocean-700/60 bg-ocean-900/40 hover:border-ocean-500 transition-colors overflow-hidden">
              {converting ? (
                <div className="h-56 flex flex-col items-center justify-center text-ocean-400">
                  <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                  <span className="text-sm">Converting photo…</span>
                </div>
              ) : imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover" />
              ) : (
                <div className="h-56 flex flex-col items-center justify-center text-ocean-500">
                  <ImagePlus className="w-8 h-8 mb-2" />
                  <span className="text-sm">Click to add a photo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {imagePreview && !converting && (
              <p className="text-xs text-ocean-500 mt-2">
                Click the image to choose a different one.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-ocean-300 mb-2">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="45.00"
                className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-ocean-300 mb-2">Stock (optional)</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="1"
                className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">Shipping price (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={shippingPrice}
              onChange={(e) => setShippingPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
            />
            <p className="text-xs text-ocean-500 mt-2">
              What the buyer pays for shipping, added to their total at checkout. Leave at 0 for free shipping.
            </p>
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Tell buyers about it — size, care, what makes it special."
              className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy !== null || converting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy === "publish" && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy === "publish" ? "Publishing…" : "Publish listing"}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy !== null || converting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-ocean-700/60 bg-ocean-900/40 text-ocean-200 font-medium hover:text-white hover:border-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy === "draft" && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy === "draft" ? "Saving…" : "Save as draft"}
            </button>
          </div>
          <p className="text-xs text-ocean-500">
            Drafts stay private until you publish them. Only a name is required to save one.
          </p>
        </form>
      </div>
    </main>
  );
}
