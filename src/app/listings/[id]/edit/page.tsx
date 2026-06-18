"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Fish, Loader2, ImagePlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const supabase = useMemo(() => createClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");

  const [existingImages, setExistingImages] = useState<string[] | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      if (!active) return;
      setUser(currentUser);
      setCheckingAuth(false);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data: stores } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", currentUser.id);
      const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);

      if (storeIds.length === 0) {
        if (active) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      const { data: product } = await supabase
        .from("products")
        .select("name, slug, price, stock, description, images")
        .eq("id", id)
        .in("store_id", storeIds)
        .maybeSingle();

      if (!active) return;

      if (!product) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setName(product.name ?? "");
      setSlug(product.slug ?? "");
      setPrice(product.price != null ? String(product.price) : "");
      setStock(product.stock != null ? String(product.stock) : "");
      setDescription(product.description ?? "");
      const imgs = (product.images as string[] | null) ?? null;
      setExistingImages(imgs);
      setImagePreview(imgs?.[0] ?? null);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, id]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please give your listing a name.");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Please enter a valid price.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      if (!currentUser) {
        setError("You need to be signed in to edit a listing.");
        setSubmitting(false);
        return;
      }

      let images = existingImages;
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
        images = [publicUrlData.publicUrl];
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          price: priceNum,
          stock: stock === "" ? null : parseInt(stock, 10),
          images: images && images.length ? images : null,
        })
        .eq("id", id);
      if (updateError) throw updateError;

      router.push(`/marketplace/${slug}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong saving your changes."
      );
      setSubmitting(false);
    }
  }

  if (checkingAuth || loading) {
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
          <h1 className="font-display text-2xl text-white mb-2">Sign in to edit</h1>
          <p className="text-ocean-400 mb-6">You need to be signed in to edit a listing.</p>
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

  if (notFound) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">Listing not found</h1>
          <p className="text-ocean-400 mb-6">
            We couldn&apos;t find that listing, or it isn&apos;t one of yours.
          </p>
          <Link
            href="/profile"
            className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Back to your listings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          Edit Listing
        </p>
        <h1 className="font-display text-4xl text-white mb-3">Edit your listing</h1>
        <p className="text-ocean-400 mb-10">Update the details below and save your changes.</p>

        {error && (
          <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-sm text-ocean-300 mb-2">Photo</label>
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
            <label className="block text-sm text-ocean-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Tell buyers about it — size, care, what makes it special."
              className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || converting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Saving…" : "Save changes"}
            </button>
            <Link
              href="/profile"
              className="px-6 py-3 rounded-xl text-ocean-300 hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}