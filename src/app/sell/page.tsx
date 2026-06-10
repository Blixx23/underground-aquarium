"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fish, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

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
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [isLiveAnimal, setIsLiveAnimal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, [supabase]);

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
        setError("You need to be signed in to create a listing.");
        setSubmitting(false);
        return;
      }

      // Get or create the seller's store
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

      // Create the product
      const productSlug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          store_id: storeId,
          name: name.trim(),
          slug: productSlug,
          description: description.trim() || null,
          price: priceNum,
          stock: stock === "" ? null : parseInt(stock, 10),
          is_live_animal: isLiveAnimal,
          is_active: true,
        })
        .select("slug")
        .single();
      if (productError) throw productError;

      router.push(`/marketplace/${newProduct.slug}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong creating your listing."
      );
      setSubmitting(false);
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
          Fill in the details below. Photos come next — for now, let&apos;s get the listing up.
        </p>

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
              placeholder="Galaxy Koi Betta"
              className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
            />
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

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isLiveAnimal}
              onChange={(e) => setIsLiveAnimal(e.target.checked)}
              className="w-4 h-4 rounded border-ocean-700 bg-ocean-900 accent-brine-500"
            />
            <span className="text-sm text-ocean-300">This is a live animal</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Creating…" : "Create listing"}
          </button>
        </form>
      </div>
    </main>
  );
}