"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info,
  Fish,
  Save,
  Trash2,
  Globe,
  ImagePlus,
  Droplets,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildTank,
  type Species,
  type StockItem,
  type Issue,
} from "@/lib/tankBuilder/engine";
import {
  checkWater,
  type WaterReading,
  type WaterLevel,
} from "@/lib/waterCheck/engine";

const FREE_TANK_LIMIT = 4;
const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024; // generous input cap; we compress below
const MAX_DIM = 1920; // longest edge after resize

// Water reading form: which fields we show and how they're labelled.
type WaterFieldKey =
  | "temp_f"
  | "ph"
  | "ammonia_ppm"
  | "nitrite_ppm"
  | "nitrate_ppm"
  | "gh"
  | "kh";

const EMPTY_WATER: Record<WaterFieldKey, string> = {
  temp_f: "",
  ph: "",
  ammonia_ppm: "",
  nitrite_ppm: "",
  nitrate_ppm: "",
  gh: "",
  kh: "",
};

const WATER_FIELDS: {
  key: WaterFieldKey;
  label: string;
  unit: string;
  placeholder: string;
  step: string;
}[] = [
  { key: "temp_f", label: "Temperature", unit: "°F", placeholder: "e.g. 78", step: "1" },
  { key: "ph", label: "pH", unit: "", placeholder: "e.g. 7.2", step: "0.1" },
  { key: "ammonia_ppm", label: "Ammonia", unit: "ppm", placeholder: "e.g. 0", step: "0.25" },
  { key: "nitrite_ppm", label: "Nitrite", unit: "ppm", placeholder: "e.g. 0", step: "0.25" },
  { key: "nitrate_ppm", label: "Nitrate", unit: "ppm", placeholder: "e.g. 10", step: "5" },
  { key: "gh", label: "GH", unit: "dGH", placeholder: "e.g. 8", step: "1" },
  { key: "kh", label: "KH", unit: "dKH", placeholder: "e.g. 5", step: "1" },
];

// Format a saved reading's timestamp, e.g. "Jun 16, 2026 · 3:40 PM".
function fmtReadingDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

// One-line summary of whatever values a saved reading contains.
function readingSummary(r: {
  temp_f: number | null;
  ph: number | null;
  ammonia_ppm: number | null;
  nitrite_ppm: number | null;
  nitrate_ppm: number | null;
  gh: number | null;
  kh: number | null;
}): string {
  const parts: string[] = [];
  if (r.temp_f != null) parts.push(`Temp ${r.temp_f}°F`);
  if (r.ph != null) parts.push(`pH ${r.ph}`);
  if (r.ammonia_ppm != null) parts.push(`Ammonia ${r.ammonia_ppm} ppm`);
  if (r.nitrite_ppm != null) parts.push(`Nitrite ${r.nitrite_ppm} ppm`);
  if (r.nitrate_ppm != null) parts.push(`Nitrate ${r.nitrate_ppm} ppm`);
  if (r.gh != null) parts.push(`GH ${r.gh} dGH`);
  if (r.kh != null) parts.push(`KH ${r.kh} dKH`);
  return parts.length ? parts.join(" · ") : "No values recorded";
}

// Resize + compress an image to a small JPEG before upload.
// Throws if the file can't be decoded (caller falls back to the original).
async function compressImage(file: File): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("decode failed"));
    im.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
  );
  if (!blob) throw new Error("encode failed");
  return blob;
}

type SavedTank = {
  id: string;
  name: string;
  gallons: number | null;
  items: { slug: string; qty: number }[];
  updated_at: string;
  is_public: boolean;
  images: string[];
};

type WaterLog = {
  id: string;
  measured_at: string;
  temp_f: number | null;
  ph: number | null;
  ammonia_ppm: number | null;
  nitrite_ppm: number | null;
  nitrate_ppm: number | null;
  gh: number | null;
  kh: number | null;
  note: string | null;
};

export default function TankBuilder({ species }: { species: Species[] }) {
  const [supabase] = useState(() => createClient());

  const [gallonsInput, setGallonsInput] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [query, setQuery] = useState("");

  // Which analysis is showing: fish compatibility or a water test.
  const [view, setView] = useState<"compatibility" | "water">("compatibility");
  // Water reading inputs (kept as strings so boxes can be left blank).
  const [water, setWater] = useState<Record<WaterFieldKey, string>>(EMPTY_WATER);
  // Logging a reading
  const [note, setNote] = useState("");
  const [readings, setReadings] = useState<WaterLog[]>([]);
  const [readingMsg, setReadingMsg] = useState<string | null>(null);
  const [readingBusy, setReadingBusy] = useState(false);

  // Saved-tanks state
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [savedTanks, setSavedTanks] = useState<SavedTank[]>([]);
  const [tankName, setTankName] = useState("");
  const [currentTankId, setCurrentTankId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deepLinkDone, setDeepLinkDone] = useState(false);

  const gallons = parseFloat(gallonsInput) || 0;

  const speciesBySlug = useMemo(() => {
    const m = new Map<string, Species>();
    for (const s of species) m.set(s.slug, s);
    return m;
  }, [species]);

  const refreshTanks = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("tanks")
        .select("id,name,gallons,items,updated_at,is_public,images")
        .order("updated_at", { ascending: false });
      setSavedTanks((data as SavedTank[]) ?? []);
    } catch {
      // RLS returns nothing for signed-out users; ignore
    }
  }, [supabase]);

  const refreshReadings = useCallback(
    async (tankId: string) => {
      try {
        const { data } = await supabase
          .from("water_logs")
          .select(
            "id,measured_at,temp_f,ph,ammonia_ppm,nitrite_ppm,nitrate_ppm,gh,kh,note"
          )
          .eq("tank_id", tankId)
          .order("measured_at", { ascending: false })
          .limit(20);
        setReadings((data as WaterLog[]) ?? []);
      } catch {
        setReadings([]);
      }
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) {
        setUser({ id: data.user.id });
        refreshTanks();
      }
    });
    return () => {
      active = false;
    };
  }, [supabase, refreshTanks]);

  // Load (or clear) the reading history whenever the active tank changes.
  useEffect(() => {
    if (currentTankId) {
      refreshReadings(currentTankId);
    } else {
      setReadings([]);
    }
    setReadingMsg(null);
  }, [currentTankId, refreshReadings]);

  const loadTank = useCallback(
    (t: SavedTank) => {
      setGallonsInput(t.gallons != null ? String(t.gallons) : "");
      const items = Array.isArray(t.items) ? t.items : [];
      setStock(
        items
          .map((it) => {
            const sp = speciesBySlug.get(it.slug);
            return sp ? { species: sp, qty: it.qty } : null;
          })
          .filter((x): x is StockItem => x !== null)
      );
      setCurrentTankId(t.id);
      setTankName(t.name);
      setIsPublic(!!t.is_public);
      setImages(Array.isArray(t.images) ? t.images : []);
      setSaveMsg(null);
      setPhotoMsg(null);
      setShowUpgrade(false);
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [speciesBySlug]
  );

  // Auto-load a tank when arriving from a profile link (/tank-builder?tank=ID)
  useEffect(() => {
    if (deepLinkDone || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("tank");
    if (!id) {
      setDeepLinkDone(true);
      return;
    }
    if (savedTanks.length === 0) return; // wait until tanks have loaded
    const t = savedTanks.find((x) => x.id === id);
    if (t) {
      loadTank(t);
      window.history.replaceState({}, "", "/tank-builder");
    }
    setDeepLinkDone(true);
  }, [savedTanks, deepLinkDone, loadTank]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(stock.map((s) => s.species.slug));
    return species
      .filter(
        (s) =>
          !chosen.has(s.slug) &&
          (s.common_name.toLowerCase().includes(q) ||
            (s.scientific_name ?? "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [query, species, stock]);

  const result = useMemo(() => buildTank(gallons, stock), [gallons, stock]);

  // Build a numeric reading from the form, then run the water check live.
  const reading: WaterReading = useMemo(() => {
    const num = (s: string): number | null => {
      const t = s.trim();
      if (t === "") return null;
      const n = parseFloat(t);
      return Number.isNaN(n) ? null : n;
    };
    return {
      temp_f: num(water.temp_f),
      ph: num(water.ph),
      ammonia_ppm: num(water.ammonia_ppm),
      nitrite_ppm: num(water.nitrite_ppm),
      nitrate_ppm: num(water.nitrate_ppm),
      gh: num(water.gh),
      kh: num(water.kh),
    };
  }, [water]);

  const waterResult = useMemo(
    () => checkWater(reading, stock),
    [reading, stock]
  );

  function addSpecies(s: Species) {
    setStock((prev) => [...prev, { species: s, qty: 1 }]);
    setQuery("");
  }
  function setQty(slug: string, qty: number) {
    setStock((prev) =>
      prev.map((it) =>
        it.species.slug === slug ? { ...it, qty: Math.max(1, qty) } : it
      )
    );
  }
  function remove(slug: string) {
    setStock((prev) => prev.filter((it) => it.species.slug !== slug));
  }
  function setWaterField(key: WaterFieldKey, value: string) {
    setWater((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0) return;
    setPhotoMsg(null);
    setUploading(true);
    let count = images.length;
    try {
      for (const file of files) {
        if (count >= MAX_PHOTOS) {
          setPhotoMsg(`Up to ${MAX_PHOTOS} photos per tank.`);
          break;
        }
        if (!file.type.startsWith("image/")) {
          setPhotoMsg("Images only, please.");
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setPhotoMsg("That photo is too large (max 25 MB).");
          continue;
        }

        // Resize/compress; fall back to the original if it can't be decoded
        let blob: Blob = file;
        let ext = "jpg";
        let contentType = "image/jpeg";
        try {
          blob = await compressImage(file);
        } catch {
          blob = file;
          ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          contentType = file.type || "image/jpeg";
        }

        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("tank-photos")
          .upload(path, blob, { contentType });
        if (error) {
          setPhotoMsg("A photo failed to upload — try again.");
          continue;
        }
        const { data } = supabase.storage
          .from("tank-photos")
          .getPublicUrl(path);
        setImages((prev) => [...prev, data.publicUrl]);
        count++;
      }
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function saveTank(): Promise<string | null> {
    if (!user || busy) return null;
    setSaveMsg(null);
    setShowUpgrade(false);
    const items = stock.map((s) => ({ slug: s.species.slug, qty: s.qty }));
    const name = tankName.trim() || "My Tank";

    // Cap saved tanks so the picker row stays tidy. Updating an existing tank
    // is always allowed.
    if (!currentTankId && savedTanks.length >= FREE_TANK_LIMIT) {
      setShowUpgrade(true);
      return null;
    }

    setBusy(true);
    let savedId: string | null = currentTankId;
    try {
      if (currentTankId) {
        const { error } = await supabase
          .from("tanks")
          .update({
            name,
            gallons: gallons || null,
            items,
            is_public: isPublic,
            images,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentTankId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tanks")
          .insert({
            user_id: user.id,
            name,
            gallons: gallons || null,
            items,
            is_public: isPublic,
            images,
          })
          .select("id,name,gallons,items,updated_at,is_public,images")
          .single();
        if (error) throw error;
        if (data) {
          savedId = (data as SavedTank).id;
          setCurrentTankId(savedId);
        }
      }
      setSaveMsg("Saved.");
      // Onboarding bubble grants — server verifies; idempotent, fire-and-forget.
      fetch("/api/bubbles/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "first_tank" }),
      }).catch(() => {});
      if (stock.length > 0) {
        fetch("/api/bubbles/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "first_species" }),
        }).catch(() => {});
      }
      if (isPublic) {
        fetch("/api/bubbles/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "tank_shared" }),
        }).catch(() => {});
      }
      await refreshTanks();
    } catch {
      setSaveMsg("Couldn't save — please try again.");
      savedId = null;
    } finally {
      setBusy(false);
    }
    return savedId;
  }

  async function deleteTank(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await supabase.from("tanks").delete().eq("id", id);
      if (id === currentTankId) {
        setCurrentTankId(null);
      }
      await refreshTanks();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  async function saveReading(tankId?: string) {
    const tid = tankId ?? currentTankId;
    if (!user || !tid || readingBusy) return;
    if (waterResult.status === "empty") {
      setReadingMsg("Enter at least one value first.");
      return;
    }
    setReadingBusy(true);
    setReadingMsg(null);
    try {
      const { error } = await supabase.from("water_logs").insert({
        tank_id: tid,
        user_id: user.id,
        measured_at: new Date().toISOString(),
        temp_f: reading.temp_f,
        ph: reading.ph,
        ammonia_ppm: reading.ammonia_ppm,
        nitrite_ppm: reading.nitrite_ppm,
        nitrate_ppm: reading.nitrate_ppm,
        gh: reading.gh,
        kh: reading.kh,
        note: note.trim() || null,
      });
      if (error) throw error;
      setReadingMsg("Reading logged.");
      fetch("/api/bubbles/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "first_water_test" }),
      }).catch(() => {});
      fetch("/api/bubbles/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "water_log_streak_week" }),
      }).catch(() => {});
      setNote("");
      await refreshReadings(tid);
    } catch {
      setReadingMsg("Couldn't log the reading — please try again.");
    } finally {
      setReadingBusy(false);
    }
  }

  // Save the build and log the current reading to it in one step, so logging a
  // water test never dead-ends when no tank has been saved yet.
  async function saveTankAndLog() {
    const id = await saveTank();
    if (id) await saveReading(id);
  }

  async function deleteReading(id: string) {
    if (readingBusy) return;
    setReadingBusy(true);
    try {
      await supabase.from("water_logs").delete().eq("id", id);
      if (currentTankId) await refreshReadings(currentTankId);
    } catch {
      // ignore
    } finally {
      setReadingBusy(false);
    }
  }

  function newBuild() {
    setCurrentTankId(null);
    setTankName("");
    setGallonsInput("");
    setStock([]);
    setIsPublic(false);
    setImages([]);
    setSaveMsg(null);
    setPhotoMsg(null);
    setShowUpgrade(false);
    setWater(EMPTY_WATER);
    setNote("");
  }

  const conflicts = result.issues.filter((i) => i.level === "conflict");
  const cautions = result.issues.filter((i) => i.level === "caution");
  const hasStock = stock.length > 0;

  let banner = { text: "", className: "", Icon: CheckCircle2 };
  if (hasStock && conflicts.length > 0) {
    banner = {
      text: `${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""} to resolve`,
      className: "bg-red-500/10 border-red-500/30 text-red-300",
      Icon: AlertTriangle,
    };
  } else if (hasStock && cautions.length > 0) {
    banner = {
      text: `Workable — ${cautions.length} thing${cautions.length > 1 ? "s" : ""} to check`,
      className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      Icon: Info,
    };
  } else if (hasStock) {
    banner = {
      text: "Looks compatible",
      className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      Icon: CheckCircle2,
    };
  }

  const stockingColor =
    result.stocking.level === "over"
      ? "bg-red-500"
      : result.stocking.level === "near"
      ? "bg-amber-500"
      : "bg-emerald-500";

  function issueStyle(level: Issue["level"]) {
    if (level === "conflict")
      return { box: "border-red-500/30 bg-red-500/5", icon: "text-red-400", I: AlertTriangle };
    if (level === "caution")
      return { box: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-400", I: AlertTriangle };
    return { box: "border-white/10 bg-white/5", icon: "text-ocean-400", I: Info };
  }

  // Same colour language as compatibility, plus an "ok" (emerald) state.
  function findingStyle(level: WaterLevel) {
    if (level === "danger")
      return { box: "border-red-500/30 bg-red-500/5", icon: "text-red-400", I: AlertTriangle };
    if (level === "warning")
      return { box: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-400", I: AlertTriangle };
    if (level === "ok")
      return { box: "border-emerald-500/30 bg-emerald-500/5", icon: "text-emerald-400", I: CheckCircle2 };
    return { box: "border-white/10 bg-white/5", icon: "text-ocean-400", I: Info };
  }

  let waterBanner: { text: string; className: string; Icon: typeof CheckCircle2 } | null = null;
  if (waterResult.status === "danger") {
    waterBanner = {
      text: "Something needs attention now",
      className: "bg-red-500/10 border-red-500/30 text-red-300",
      Icon: AlertTriangle,
    };
  } else if (waterResult.status === "warning") {
    waterBanner = {
      text: "A few things to keep an eye on",
      className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      Icon: Info,
    };
  } else if (waterResult.status === "ok") {
    waterBanner = {
      text: "Your water looks healthy",
      className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      Icon: CheckCircle2,
    };
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 max-w-2xl">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
            Tank Builder
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Plan a tank
          </h1>
          <p className="text-ocean-300">
            Set your size and add the fish you have in mind. Live compatibility,
            stocking, and equipment guidance show on the right — plus a Water tab
            to check your parameters and track them over time.
          </p>
        </div>

        {/* Saved-tank switcher (tap to load) */}
        {user && savedTanks.length > 0 && (
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-wide text-ocean-400 mb-2">
              Your tanks
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
              <button
                onClick={newBuild}
                className={
                  "shrink-0 snap-start w-44 h-28 flex flex-col justify-center rounded-xl border border-dashed px-3.5 py-3 text-left transition-colors " +
                  (!currentTankId
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-white/15 hover:border-white/30")
                }
              >
                <span className="flex items-center gap-2 text-sm font-medium text-ocean-200">
                  <Plus className="w-4 h-4" /> New tank
                </span>
                <span className="block text-ocean-500 text-xs mt-0.5">
                  Start a fresh build
                </span>
              </button>
              {savedTanks.map((t) => {
                const active = t.id === currentTankId;
                return (
                  <div key={t.id} className="relative shrink-0 snap-start">
                    <button
                      onClick={() => loadTank(t)}
                      className={
                        "w-44 h-28 flex flex-col text-left rounded-xl border px-3.5 py-3 pr-8 transition-colors " +
                        (active
                          ? "bg-emerald-500/10 border-emerald-500/40"
                          : "bg-white/5 border-white/10 hover:border-white/20")
                      }
                    >
                      <span className="block text-white text-sm font-medium truncate">
                        {t.name}
                      </span>
                      <span className="block text-ocean-400 text-xs mt-0.5">
                        {t.gallons ? `${t.gallons} gal · ` : ""}
                        {t.items?.length ?? 0} species
                      </span>
                      <span className="mt-auto pt-2 h-5 flex items-end">
                        {t.is_public && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                            <Globe className="w-2.5 h-2.5" /> Posted
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteTank(t.id)}
                      aria-label="Delete tank"
                      disabled={busy}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg text-ocean-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* ---------------- Build column ---------------- */}
          <div className="space-y-6">
            {/* Tank size */}
            <div>
              <label className="block text-sm text-ocean-300 mb-2">Tank size</label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={gallonsInput}
                  onChange={(e) => setGallonsInput(e.target.value)}
                  placeholder="e.g. 29"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 pr-16 text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40 focus:bg-white/10 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ocean-400 text-sm">
                  gallons
                </span>
              </div>
            </div>

            {/* Add fish */}
            <div>
              <label className="block text-sm text-ocean-300 mb-2">Add fish</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search species to add…"
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-12 pr-11 py-3.5 text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40 focus:bg-white/10 transition-colors"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ocean-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {matches.length > 0 && (
                  <div className="absolute z-10 mt-2 w-full rounded-xl bg-ocean-950 border border-white/10 shadow-xl overflow-hidden">
                    {matches.map((sp) => (
                      <button
                        key={sp.slug}
                        onClick={() => addSpecies(sp)}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
                      >
                        <span className="text-white text-sm">{sp.common_name}</span>
                        <span className="text-ocean-500 text-xs italic truncate">
                          {sp.scientific_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected fish */}
              {hasStock ? (
                <div className="space-y-2 mt-4">
                  {stock.map(({ species: sp, qty }) => (
                    <div
                      key={sp.slug}
                      className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">
                          {sp.common_name}
                        </p>
                        <p className="text-ocean-400 text-xs">
                          {sp.max_size_in != null ? `${sp.max_size_in}"` : "—"}
                          {sp.min_tank_gal != null ? ` · ${sp.min_tank_gal} gal min` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setQty(sp.slug, qty - 1)}
                          aria-label="Decrease"
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-ocean-200 hover:text-white flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-white text-sm">{qty}</span>
                        <button
                          onClick={() => setQty(sp.slug, qty + 1)}
                          aria-label="Increase"
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-ocean-200 hover:text-white flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => remove(sp.slug)}
                          aria-label="Remove"
                          className="w-7 h-7 rounded-lg text-ocean-400 hover:text-white hover:bg-white/10 flex items-center justify-center ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center mt-4">
                  <Fish className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
                  <p className="text-white font-medium mb-1">Start adding fish</p>
                  <p className="text-ocean-400 text-sm">
                    Search above to drop your first species in and the checks begin.
                  </p>
                </div>
              )}
            </div>

            {/* Save the tank */}
            {user ? (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-[11px] uppercase tracking-wide text-ocean-400 mb-2">
                  {currentTankId ? "Editing this tank" : "Save your build"}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
                  <input
                    type="text"
                    value={tankName}
                    onChange={(e) => setTankName(e.target.value)}
                    placeholder="Name this tank (e.g. 29-gal community)"
                    className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
                  />
                  <button
                    onClick={saveTank}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 text-ocean-950 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Save className="w-4 h-4" />
                    {currentTankId ? "Update tank" : "Save tank"}
                  </button>
                </div>

                <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <span className="flex items-center gap-1.5 text-sm text-ocean-300">
                    <Globe className="w-3.5 h-3.5" />
                    Share this tank with the community
                  </span>
                </label>
                {isPublic && currentTankId && (
                  <Link
                    href={`/tanks/${currentTankId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    View public page →
                  </Link>
                )}

                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wide text-ocean-400 mb-2">
                    Photos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((url) => (
                      <div
                        key={url}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Tank photo" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePhoto(url)}
                          aria-label="Remove photo"
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5 text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_PHOTOS && (
                      <label className="w-20 h-20 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 text-ocean-400 text-[10px] gap-1">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handlePhotoSelect}
                          disabled={uploading}
                        />
                        {uploading ? (
                          <span>Uploading…</span>
                        ) : (
                          <>
                            <ImagePlus className="w-5 h-5" />
                            <span>Add</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                  {photoMsg && <p className="text-[11px] text-ocean-500 mt-2">{photoMsg}</p>}
                  <p className="text-[11px] text-ocean-500 mt-2">
                    Up to {MAX_PHOTOS} photos. Big photos are resized automatically; they
                    show publicly once the tank is posted.
                  </p>
                </div>

                {saveMsg && <p className="text-xs text-emerald-400 mt-2">{saveMsg}</p>}
                {showUpgrade && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                    <p className="text-amber-300 text-sm font-medium">
                      You&apos;ve saved {FREE_TANK_LIMIT} tanks
                    </p>
                    <p className="text-ocean-300 text-xs mt-0.5">
                      That&apos;s the limit for now — keeps things tidy. Update or delete
                      one of your tanks above to make room for a new build.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-ocean-300">
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                  Sign in
                </Link>{" "}
                to save your tank builds and track water over time.
              </div>
            )}
          </div>

          {/* ---------------- Analysis column ---------------- */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="grid grid-cols-2 rounded-xl bg-white/5 border border-white/10 p-1">
              <button
                onClick={() => setView("compatibility")}
                className={
                  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors " +
                  (view === "compatibility"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-ocean-300 hover:text-white")
                }
              >
                <Fish className="w-4 h-4" />
                Compatibility
              </button>
              <button
                onClick={() => setView("water")}
                className={
                  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors " +
                  (view === "water"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-ocean-300 hover:text-white")
                }
              >
                <Droplets className="w-4 h-4" />
                Water
              </button>
            </div>

            {view === "compatibility" ? (
              hasStock ? (
                <div className="space-y-6">
                  <div className={"flex items-center gap-2 rounded-xl border px-4 py-3 " + banner.className}>
                    <banner.Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{banner.text}</span>
                  </div>

                  {gallons > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400">
                          Stocking
                        </h2>
                        <span className="text-white text-sm">
                          {result.stocking.pct}% · {result.stocking.label}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden mb-3">
                        <div
                          className={"h-full rounded-full " + stockingColor}
                          style={{ width: `${Math.min(result.stocking.pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-ocean-400 text-xs leading-relaxed">
                        {result.stocking.reasoning}
                      </p>
                    </div>
                  )}

                  {gallons > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                      <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
                        Equipment for {gallons} gallons
                      </h2>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
                          <dt className="text-[11px] uppercase tracking-wide text-ocean-400 mb-0.5">
                            Heater
                          </dt>
                          <dd className="text-white text-sm">
                            {result.equipment.heaterWattsLow}–
                            {result.equipment.heaterWattsHigh} W
                          </dd>
                        </div>
                        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
                          <dt className="text-[11px] uppercase tracking-wide text-ocean-400 mb-0.5">
                            Filter flow
                          </dt>
                          <dd className="text-white text-sm">
                            {result.equipment.filterGphLow}–
                            {result.equipment.filterGphHigh} GPH
                          </dd>
                        </div>
                      </div>
                      {result.equipment.heaterNote && (
                        <p className="text-ocean-400 text-xs mt-3">
                          {result.equipment.heaterNote}
                        </p>
                      )}
                    </div>
                  )}

                  {result.issues.length > 0 ? (
                    <div className="space-y-2">
                      {result.issues.map((issue, i) => {
                        const st = issueStyle(issue.level);
                        return (
                          <div key={i} className={"rounded-xl border p-4 flex gap-3 " + st.box}>
                            <st.I className={"w-5 h-5 shrink-0 mt-0.5 " + st.icon} />
                            <div>
                              <p className="text-white text-sm font-medium">{issue.title}</p>
                              <p className="text-ocean-300 text-sm mt-0.5 leading-relaxed">
                                {issue.detail}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                      <p className="text-ocean-200 text-sm">
                        No conflicts found for this combination. Always double-check
                        individual temperaments — every fish has its own personality.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
                  <Fish className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
                  <p className="text-white font-medium mb-1">Add fish to see compatibility</p>
                  <p className="text-ocean-400 text-sm">
                    Search on the left to add a species, and the compatibility, stocking,
                    and equipment checks appear here.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {/* Reading form */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-1">
                    Water test
                  </h2>
                  <p className="text-ocean-400 text-xs mb-4 leading-relaxed">
                    Enter whatever you have from your test kit — you don&apos;t need to
                    fill in every box. The read-out updates as you type.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {WATER_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label className="block text-[11px] uppercase tracking-wide text-ocean-400 mb-1">
                          {f.label}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            step={f.step}
                            value={water[f.key]}
                            onChange={(e) => setWaterField(f.key, e.target.value)}
                            placeholder={f.placeholder}
                            className={
                              "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-500 focus:outline-none focus:border-emerald-500/40 focus:bg-white/10 transition-colors " +
                              (f.unit ? "pr-12" : "")
                            }
                          />
                          {f.unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-500 text-xs pointer-events-none">
                              {f.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!hasStock && (
                    <p className="text-[11px] text-ocean-500 mt-4 leading-relaxed">
                      Add fish on the left and the pH and temperature checks will also tell
                      you how well your water suits them.
                    </p>
                  )}
                </div>

                {waterBanner && (
                  <div className={"flex items-center gap-2 rounded-xl border px-4 py-3 " + waterBanner.className}>
                    <waterBanner.Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{waterBanner.text}</span>
                  </div>
                )}

                {waterResult.status === "empty" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
                    <Droplets className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
                    <p className="text-white font-medium mb-1">Enter a reading to begin</p>
                    <p className="text-ocean-400 text-sm">
                      Fill in at least one value above and you&apos;ll get a plain-English
                      read on what&apos;s happening and how to fix it.
                    </p>
                  </div>
                ) : waterResult.findings.length > 0 ? (
                  <div className="space-y-2">
                    {waterResult.findings.map((f, i) => {
                      const st = findingStyle(f.level);
                      return (
                        <div key={i} className={"rounded-xl border p-4 flex gap-3 " + st.box}>
                          <st.I className={"w-5 h-5 shrink-0 mt-0.5 " + st.icon} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-white text-sm font-medium">{f.title}</p>
                              <span className="text-ocean-400 text-xs shrink-0 whitespace-nowrap">
                                {f.value}
                              </span>
                            </div>
                            <p className="text-ocean-300 text-sm mt-1 leading-relaxed">
                              {f.whatsHappening}
                            </p>
                            <p className="text-ocean-400 text-xs mt-2 leading-relaxed">
                              <span className="text-ocean-300 font-medium">How to fix: </span>
                              {f.howToFix}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                    <p className="text-ocean-200 text-sm">
                      Nothing to flag from what you&apos;ve entered.
                    </p>
                  </div>
                )}

                {/* Log to a tank's history */}
                {!user ? (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-ocean-300">
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                      Sign in
                    </Link>{" "}
                    to log readings and track your water over time.
                  </div>
                ) : currentTankId ? (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-1">
                      Log this reading
                    </h2>
                    <p className="text-ocean-500 text-xs mb-3">
                      Adds a dated entry to “{tankName.trim() || "My Tank"}” so you can
                      track changes over time. (Different from saving the tank itself.)
                    </p>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note (e.g. after a 30% water change)"
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40 mb-3"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveReading()}
                        disabled={readingBusy || waterResult.status === "empty"}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Log reading
                      </button>
                      {readingMsg && <span className="text-xs text-ocean-400">{readingMsg}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-1">
                      Track this over time
                    </h2>
                    <p className="text-ocean-400 text-sm mb-3">
                      Readings attach to a saved tank so you can watch your parameters
                      change. This saves your build and logs the reading in one step.
                    </p>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note (e.g. after a 30% water change)"
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40 mb-3"
                    />
                    <button
                      onClick={saveTankAndLog}
                      disabled={busy || readingBusy || waterResult.status === "empty"}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-ocean-950 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save tank &amp; log reading
                    </button>
                    <p className="text-[11px] text-ocean-500 mt-2">
                      Saves as “{tankName.trim() || "My Tank"}”.
                    </p>
                    {readingMsg && <p className="text-xs text-ocean-400 mt-1">{readingMsg}</p>}
                  </div>
                )}

                {/* Recent readings */}
                {user && currentTankId && readings.length > 0 && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                    <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-3">
                      Recent readings
                    </h2>
                    <div className="space-y-2">
                      {readings.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-ocean-400 text-xs">{fmtReadingDate(r.measured_at)}</p>
                            <p className="text-white text-sm mt-0.5 break-words">
                              {readingSummary(r)}
                            </p>
                            {r.note && (
                              <p className="text-ocean-400 text-xs mt-1 italic break-words">
                                {r.note}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteReading(r.id)}
                            aria-label="Delete reading"
                            disabled={readingBusy}
                            className="w-8 h-8 rounded-lg text-ocean-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
