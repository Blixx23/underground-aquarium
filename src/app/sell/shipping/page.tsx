"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Truck, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import SellerTabs from "../SellerTabs";

export default function ShippingAddressPage() {
  const supabase = useMemo(() => createClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

      const { data: store } = await supabase
        .from("stores")
        .select(
          "id, ship_name, ship_street1, ship_street2, ship_city, ship_state, ship_zip, ship_country, ship_phone"
        )
        .eq("owner_id", currentUser.id)
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (store) {
        setStoreId(store.id);
        setName(store.ship_name ?? "");
        setStreet1(store.ship_street1 ?? "");
        setStreet2(store.ship_street2 ?? "");
        setCity(store.ship_city ?? "");
        setState(store.ship_state ?? "");
        setZip(store.ship_zip ?? "");
        setCountry(store.ship_country ?? "US");
        setPhone(store.ship_phone ?? "");
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!storeId) {
      setError("You'll be able to save once your shop exists — add a listing or set up payouts first.");
      return;
    }
    if (!name.trim() || !street1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Please fill in name, street, city, state, and ZIP.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("stores")
        .update({
          ship_name: name.trim(),
          ship_street1: street1.trim(),
          ship_street2: street2.trim() || null,
          ship_city: city.trim(),
          ship_state: state.trim(),
          ship_zip: zip.trim(),
          ship_country: country.trim() || "US",
          ship_phone: phone.trim() || null,
        })
        .eq("id", storeId);
      if (updateError) throw updateError;
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your address.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors";

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
          <Truck className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">Sign in</h1>
          <p className="text-ocean-400 mb-6">
            You need to be signed in to set your ship-from address.
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
        <SellerTabs />
        <h1 className="font-display text-4xl text-white mb-3">Ship-from address</h1>
        <p className="text-ocean-400 mb-10">
          This is where your packages ship from. Buyers never see it — it&apos;s used
          to create your shipping labels.
        </p>

        {error && (
          <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300 mb-6">
            {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-300 mb-6">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Address saved.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-ocean-300 mb-2">Full name or business name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chris Lewis"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">Street address</label>
            <input
              type="text"
              value={street1}
              onChange={(e) => setStreet1(e.target.value)}
              placeholder="123 Coral Reef Way"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">
              Apartment, suite, etc. (optional)
            </label>
            <input
              type="text"
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              placeholder="Apt 4B"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-ocean-300 mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sacramento"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-ocean-300 mb-2">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="CA"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-ocean-300 mb-2">ZIP code</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="95814"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-ocean-300 mb-2">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="US"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-123-4567"
              className={inputClass}
            />
            <p className="text-xs text-ocean-500 mt-2">
              Some carriers require a phone number on the label.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Saving…" : "Save address"}
          </button>
        </form>
      </div>
    </main>
  );
}
