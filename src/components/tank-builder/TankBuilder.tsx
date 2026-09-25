"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Share2,
  Ruler,
  Sparkles,
  Thermometer,
  Wind,
  Flame,
  RotateCcw,
  ChevronDown,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildTank,
  galToL,
  gallonsFromInches,
  lToGal,
  scoreLabel,
  suggestTankmates,
  type Species,
  type StockItem,
  type Issue,
} from "@/lib/tankBuilder/engine";
import { byPopularity } from "@/lib/tankBuilder/popular";
import { buildPath, parseBuild } from "@/lib/tankBuilder/share";
import { nearestSize } from "@/lib/tankBuilder/sizes";
import { MAX_TANK_PHOTOS } from "@/lib/tanks/showcase";
import { checkWater, type WaterReading, type WaterLevel } from "@/lib/waterCheck/engine";
import TankVisual, { speciesColor } from "@/components/tank-builder/TankVisual";
import SuggestSpecies from "@/app/(tools)/species/SuggestSpecies";
import { RangeChart, ScoreDial } from "@/components/tank-builder/Insights";

const FREE_TANK_LIMIT = 4;
const MAX_PHOTOS = MAX_TANK_PHOTOS;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // input cap; images are resized/compressed below
const MAX_DIM = 1920; // longest edge after resize
const DRAFT_KEY = "ua.tankBuilder.draft.v1";
const QUICK_SIZES = [5, 10, 20, 29, 40, 55, 75, 125];

// Water reading form: which fields we show and how they're labelled.
type WaterFieldKey = "temp_f" | "ph" | "ammonia_ppm" | "nitrite_ppm" | "nitrate_ppm" | "gh" | "kh";

const EMPTY_WATER: Record<WaterFieldKey, string> = {
  temp_f: "",
  ph: "",
  ammonia_ppm: "",
  nitrite_ppm: "",
  nitrate_ppm: "",
  gh: "",
  kh: "",
};

const WATER_FIELDS: { key: WaterFieldKey; label: string; unit: string; placeholder: string; step: string }[] = [
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
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
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

const TANK_COLUMNS = "id,name,gallons,items,updated_at,is_public,images";

function readDraft(): { g?: string; unit?: "gal" | "L"; items?: { slug: string; qty: number }[]; name?: string } | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(v: unknown) {
  try {
    if (v == null) window.localStorage.removeItem(DRAFT_KEY);
    else window.localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
  } catch {
    /* private mode or storage full: the build just won't survive a refresh */
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function TankBuilder({
  species,
  initialGallons,
  embedded = false,
}: {
  species: Species[];
  /** Size guide pages open the builder already set to their size. */
  initialGallons?: number;
  /** On a guide page the page has its own h1, so the builder's title steps down. */
  embedded?: boolean;
}) {
  const [supabase] = useState(() => createClient());

  const [gallonsInput, setGallonsInput] = useState(initialGallons ? String(initialGallons) : "");
  const [unit, setUnit] = useState<"gal" | "L">("gal");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showDims, setShowDims] = useState(false);
  const [dims, setDims] = useState({ l: "", w: "", h: "" });
  const [toast, setToast] = useState<string | null>(null);
  // A fish that isn't in the library yet: the request form, prefilled.
  const [requestName, setRequestName] = useState<string | null>(null);
  const searchBox = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  // Which analysis is showing: fish compatibility or a water test.
  const [view, setView] = useState<"compatibility" | "water">("compatibility");
  const [water, setWater] = useState<Record<WaterFieldKey, string>>(EMPTY_WATER);
  const [note, setNote] = useState("");
  const [readings, setReadings] = useState<WaterLog[]>([]);
  const [readingMsg, setReadingMsg] = useState<string | null>(null);
  const [readingBusy, setReadingBusy] = useState(false);

  // Saved tanks
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [savedTanks, setSavedTanks] = useState<SavedTank[]>([]);
  const [tankName, setTankName] = useState("");
  const [currentTankId, setCurrentTankId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const rawSize = parseFloat(gallonsInput);
  const gallons = Number.isFinite(rawSize) && rawSize > 0 ? (unit === "L" ? lToGal(rawSize) : rawSize) : 0;
  const galShown = round1(gallons);

  const speciesBySlug = useMemo(() => {
    const m = new Map<string, Species>();
    for (const s of species) m.set(s.slug, s);
    return m;
  }, [species]);

  const toStock = useCallback(
    (items: { slug: string; qty: number }[]) =>
      items
        .map((it) => {
          const sp = speciesBySlug.get(it.slug);
          return sp ? { species: sp, qty: Math.max(1, Number(it.qty) || 1) } : null;
        })
        .filter((x): x is StockItem => x !== null),
    [speciesBySlug]
  );

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  }

  // Only this person's own tanks. Without the user filter the list also
  // pulled in everyone's public tanks, which counted toward the save limit.
  const refreshTanks = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from("tanks")
        .select(TANK_COLUMNS)
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      if (!error) setSavedTanks((data as SavedTank[]) ?? []);
    },
    [supabase]
  );

  const refreshReadings = useCallback(
    async (tankId: string) => {
      const { data, error } = await supabase
        .from("water_logs")
        .select("id,measured_at,temp_f,ph,ammonia_ppm,nitrite_ppm,nitrate_ppm,gh,kh,note")
        .eq("tank_id", tankId)
        .order("measured_at", { ascending: false })
        .limit(20);
      setReadings(error ? [] : ((data as WaterLog[]) ?? []));
    },
    [supabase]
  );

  // Who's signed in. getUser() alone can come back empty when another part of
  // the page (the navbar) is refreshing the session at the same moment, which
  // showed signed-in people a "Sign in" prompt. So fall back to the stored
  // session, and keep listening for auth changes the way the navbar does.
  const lastUid = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const apply = (u: { id: string } | null | undefined) => {
      if (!active) return;
      const id = u?.id ?? null;
      if (id !== lastUid.current) {
        lastUid.current = id;
        setUser(id ? { id } : null);
        if (id) refreshTanks(id);
        else setSavedTanks([]);
      }
      setAuthChecked(true);
    };
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) apply(data.user);
      else supabase.auth.getSession().then(({ data: s }) => apply(s.session?.user ?? null));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user || _event === "SIGNED_OUT") apply(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, refreshTanks]);

  useEffect(() => {
    if (currentTankId) refreshReadings(currentTankId);
    else setReadings([]);
    setReadingMsg(null);
  }, [currentTankId, refreshReadings]);

  const snapshotOf = useCallback(
    (g: string, u: string, items: { slug: string; qty: number }[], name: string, pub: boolean, imgs: string[]) =>
      JSON.stringify({ g, u, items, name: name.trim(), pub, imgs }),
    []
  );

  const loadTank = useCallback(
    (t: SavedTank) => {
      const g = t.gallons != null ? String(t.gallons) : "";
      const items = Array.isArray(t.items) ? t.items : [];
      setGallonsInput(g);
      setUnit("gal");
      setStock(toStock(items));
      setCurrentTankId(t.id);
      setTankName(t.name);
      setIsPublic(!!t.is_public);
      const imgs = Array.isArray(t.images) ? t.images : [];
      setImages(imgs);
      setSaveMsg(null);
      setPhotoMsg(null);
      setShowUpgrade(false);
      setSavedSnapshot(
        snapshotOf(g, "gal", toStock(items).map((s) => ({ slug: s.species.slug, qty: s.qty })), t.name, !!t.is_public, imgs)
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [toStock, snapshotOf]
  );

  // First load, once we know who's here: a shared link wins, then a saved
  // tank from a profile link, then whatever they were building last time.
  useEffect(() => {
    if (!authChecked || restored) return;
    setRestored(true);
    const search = window.location.search;
    const shared = parseBuild(search);
    const tankId = new URLSearchParams(search).get("tank");

    if (shared) {
      if (shared.gallons) setGallonsInput(String(shared.gallons));
      setStock(toStock(shared.items));
      // Tidy the address bar so a refresh keeps their edits instead of
      // reloading the original shared build.
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (tankId && user) {
      supabase
        .from("tanks")
        .select(TANK_COLUMNS)
        .eq("id", tankId)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) loadTank(data as SavedTank);
          window.history.replaceState({}, "", window.location.pathname);
        });
      return;
    }
    if (initialGallons) return;
    const d = readDraft();
    if (d) {
      if (d.g) setGallonsInput(d.g);
      if (d.unit === "L" || d.unit === "gal") setUnit(d.unit);
      if (Array.isArray(d.items)) setStock(toStock(d.items));
      if (d.name) setTankName(d.name);
    }
  }, [authChecked, restored, user, supabase, toStock, loadTank, initialGallons]);

  const items = useMemo(() => stock.map((s) => ({ slug: s.species.slug, qty: s.qty })), [stock]);

  // Keep an unsaved build safe across refreshes and page hops.
  useEffect(() => {
    if (!restored || currentTankId || initialGallons) return;
    if (!gallonsInput && items.length === 0 && !tankName) writeDraft(null);
    else writeDraft({ g: gallonsInput, unit, items, name: tankName });
  }, [restored, currentTankId, initialGallons, gallonsInput, unit, items, tankName]);

  const dirty =
    currentTankId != null && savedSnapshot !== snapshotOf(gallonsInput, unit, items, tankName, isPublic, images);

  // Close the search list on an outside tap.
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (searchBox.current && !searchBox.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const popular = useMemo(() => [...species].sort(byPopularity).slice(0, 60), [species]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const chosen = new Set(stock.map((s) => s.species.slug));
    if (!q) return popular.filter((s) => !chosen.has(s.slug)).slice(0, 8);
    const scored: { s: Species; r: number }[] = [];
    for (const s of species) {
      if (chosen.has(s.slug)) continue;
      const name = s.common_name.toLowerCase();
      const sci = (s.scientific_name ?? "").toLowerCase();
      let r = -1;
      if (name === q) r = 0;
      else if (name.startsWith(q)) r = 1;
      else if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) r = 2;
      else if (name.includes(q)) r = 3;
      else if ((s.also_known_as ?? []).some((a) => a.toLowerCase().includes(q))) r = 3;
      else if (sci.includes(q)) r = 4;
      else if ((s.group_name ?? "").toLowerCase().includes(q)) r = 5;
      if (r >= 0) scored.push({ s, r });
    }
    scored.sort((a, b) => a.r - b.r || byPopularity(a.s, b.s));
    return scored.slice(0, 10).map((x) => x.s);
  }, [query, species, stock, popular]);

  const result = useMemo(() => buildTank(gallons, stock), [gallons, stock]);
  const suggestions = useMemo(() => suggestTankmates(gallons, stock, species, 6), [gallons, stock, species]);

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

  const waterResult = useMemo(() => checkWater(reading, stock), [reading, stock]);

  function addSpecies(s: Species, qty?: number) {
    setStock((prev) =>
      prev.some((p) => p.species.slug === s.slug)
        ? prev
        : [...prev, { species: s, qty: qty ?? Math.max(1, s.min_group_size ?? 1) }]
    );
    setQuery("");
    setActiveIdx(0);
    setSearchOpen(false);
  }
  function setQty(slug: string, qty: number) {
    const n = Math.min(999, Math.max(1, Math.round(qty) || 1));
    setStock((prev) => prev.map((it) => (it.species.slug === slug ? { ...it, qty: n } : it)));
  }
  function remove(slug: string) {
    setStock((prev) => prev.filter((it) => it.species.slug !== slug));
  }
  function setWaterField(key: WaterFieldKey, value: string) {
    setWater((prev) => ({ ...prev, [key]: value }));
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchOpen(true);
      setActiveIdx((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      const pick = matches[activeIdx];
      if (pick) {
        e.preventDefault();
        addSpecies(pick);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      searchInput.current?.blur();
    }
  }

  function switchUnit(next: "gal" | "L") {
    if (next === unit) return;
    const v = parseFloat(gallonsInput);
    if (Number.isFinite(v) && v > 0) setGallonsInput(String(round1(next === "L" ? galToL(v) : lToGal(v))));
    setUnit(next);
  }

  function pickSize(g: number) {
    setUnit("gal");
    setGallonsInput(String(g));
  }

  const dimsGallons = useMemo(() => {
    const l = parseFloat(dims.l);
    const w = parseFloat(dims.w);
    const h = parseFloat(dims.h);
    // Inches for gallons; centimetres when the tank is in litres.
    if (unit === "L") return l > 0 && w > 0 && h > 0 ? lToGal((l * w * h) / 1000) : 0;
    return gallonsFromInches(l, w, h);
  }, [dims, unit]);

  async function shareBuild() {
    const url = `${window.location.origin}${buildPath(galShown || null, items)}`;
    const title = tankName.trim() || (galShown ? `${galShown} gallon tank build` : "My tank build");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: "Check out my tank build on Underground Aquarium", url });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied. Anyone with it can open this build.");
    } catch {
      flash("Couldn't copy the link.");
    }
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
          setPhotoMsg("That photo is too large (max 10 MB).");
          continue;
        }
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
        const { error } = await supabase.storage.from("tank-photos").upload(path, blob, { contentType });
        if (error) {
          setPhotoMsg("A photo failed to upload. Try again.");
          continue;
        }
        const { data } = supabase.storage.from("tank-photos").getPublicUrl(path);
        setImages((prev) => [...prev, data.publicUrl]);
        count++;
      }
      if (currentTankId) setPhotoMsg("Photos added. Save the tank to keep them.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  function ping(source: string) {
    fetch("/api/bubbles/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    }).catch(() => {});
  }

  async function saveTank(): Promise<string | null> {
    if (!user || busy) return null;
    setSaveMsg(null);
    setShowUpgrade(false);
    const name = tankName.trim() || (galShown ? `${galShown}-gallon tank` : "My Tank");

    if (!currentTankId && savedTanks.length >= FREE_TANK_LIMIT) {
      setShowUpgrade(true);
      return null;
    }

    setBusy(true);
    let savedId: string | null = currentTankId;
    // Tanks are stored in gallons, whatever unit the builder is showing.
    const g = galShown || null;
    try {
      if (currentTankId) {
        const { error } = await supabase
          .from("tanks")
          .update({ name, gallons: g, items, is_public: isPublic, images, updated_at: new Date().toISOString() })
          .eq("id", currentTankId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tanks")
          .insert({ user_id: user.id, name, gallons: g, items, is_public: isPublic, images })
          .select(TANK_COLUMNS)
          .single();
        if (error) throw error;
        savedId = (data as SavedTank).id;
        setCurrentTankId(savedId);
        writeDraft(null);
      }
      setTankName(name);
      setSavedSnapshot(snapshotOf(gallonsInput, unit, items, name, isPublic, images));
      setSaveMsg({ ok: true, text: "Saved." });
      ping("first_tank");
      if (stock.length > 0) ping("first_species");
      if (isPublic) ping("tank_shared");
      await refreshTanks(user.id);
    } catch {
      setSaveMsg({ ok: false, text: "Couldn't save. Please try again." });
      savedId = null;
    } finally {
      setBusy(false);
    }
    return savedId;
  }

  async function deleteTank(t: SavedTank) {
    if (busy || !user) return;
    if (!window.confirm(`Delete "${t.name}"? Its water test history goes with it.`)) return;
    setBusy(true);
    const { error } = await supabase.from("tanks").delete().eq("id", t.id).eq("user_id", user.id);
    if (error) flash("Couldn't delete that tank.");
    else {
      if (t.id === currentTankId) {
        setCurrentTankId(null);
        setSavedSnapshot(null);
      }
      await refreshTanks(user.id);
    }
    setBusy(false);
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
    if (error) setReadingMsg("Couldn't log the reading. Please try again.");
    else {
      setReadingMsg("Reading logged.");
      ping("first_water_test");
      ping("water_log_streak_week");
      setNote("");
      await refreshReadings(tid);
    }
    setReadingBusy(false);
  }

  // Save the build and log the current reading to it in one step, so logging a
  // water test never dead-ends when no tank has been saved yet.
  async function saveTankAndLog() {
    const id = await saveTank();
    if (id) await saveReading(id);
  }

  async function deleteReading(id: string) {
    if (readingBusy) return;
    if (!window.confirm("Delete this reading?")) return;
    setReadingBusy(true);
    const { error } = await supabase.from("water_logs").delete().eq("id", id);
    if (error) setReadingMsg("Couldn't delete that reading.");
    else if (currentTankId) await refreshReadings(currentTankId);
    setReadingBusy(false);
  }

  function newBuild() {
    if (dirty && !window.confirm("You have unsaved changes. Start a new build anyway?")) return;
    setCurrentTankId(null);
    setSavedSnapshot(null);
    setTankName("");
    setGallonsInput(initialGallons ? String(initialGallons) : "");
    setUnit("gal");
    setStock([]);
    setIsPublic(false);
    setImages([]);
    setSaveMsg(null);
    setPhotoMsg(null);
    setShowUpgrade(false);
    setWater(EMPTY_WATER);
    setNote("");
    writeDraft(null);
  }

  const conflicts = result.issues.filter((i) => i.level === "conflict");
  const cautions = result.issues.filter((i) => i.level === "caution");
  const hasStock = stock.length > 0;
  const fishCount = stock.reduce((n, s) => n + s.qty, 0);
  const flagged = useMemo(() => {
    const set = new Set<string>();
    for (const i of result.issues) if (i.level !== "note") for (const s of i.slugs ?? []) set.add(s);
    return set;
  }, [result.issues]);

  const tone: "good" | "warn" | "bad" | "none" = !hasStock
    ? "none"
    : conflicts.length > 0
    ? "bad"
    : cautions.length > 0 || result.score < 75
    ? "warn"
    : "good";
  const verdict = hasStock ? scoreLabel(result.score, conflicts.length) : "Add fish to score it";

  const stockingColor =
    result.stocking.level === "over" ? "bg-red-500" : result.stocking.level === "near" ? "bg-amber-500" : "bg-emerald-500";

  const guide = nearestSize(gallons);
  const guideClose =
    guide && gallons > 0 && Math.abs(guide.gallons - gallons) / guide.gallons <= 0.15 && !(embedded && guide.gallons === initialGallons);

  function issueStyle(level: Issue["level"]) {
    if (level === "conflict") return { box: "border-red-500/30 bg-red-500/[0.07]", icon: "text-red-400", I: AlertTriangle, tag: "Conflict" };
    if (level === "caution") return { box: "border-amber-500/30 bg-amber-500/[0.07]", icon: "text-amber-400", I: AlertTriangle, tag: "Check" };
    return { box: "border-white/10 bg-white/[0.04]", icon: "text-sky-300", I: Info, tag: "Tip" };
  }

  function findingStyle(level: WaterLevel) {
    if (level === "danger") return { box: "border-red-500/30 bg-red-500/5", icon: "text-red-400", I: AlertTriangle };
    if (level === "warning") return { box: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-400", I: AlertTriangle };
    if (level === "ok") return { box: "border-emerald-500/30 bg-emerald-500/5", icon: "text-emerald-400", I: CheckCircle2 };
    return { box: "border-white/10 bg-white/5", icon: "text-ocean-400", I: Info };
  }

  let waterBanner: { text: string; className: string; Icon: typeof CheckCircle2 } | null = null;
  if (waterResult.status === "danger") {
    waterBanner = { text: "Something needs attention now", className: "bg-red-500/10 border-red-500/30 text-red-300", Icon: AlertTriangle };
  } else if (waterResult.status === "warning") {
    waterBanner = { text: "A few things to keep an eye on", className: "bg-amber-500/10 border-amber-500/30 text-amber-300", Icon: Info };
  } else if (waterResult.status === "ok") {
    waterBanner = { text: "Your water looks healthy", className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300", Icon: CheckCircle2 };
  }

  const card = "rounded-2xl border border-white/10 bg-white/[0.03]";
  const label = "text-[11px] font-semibold uppercase tracking-wider text-ocean-400";

  const Root = embedded ? "div" : "main";

  return (
    <Root className="font-sans">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
            {embedded ? "Try it yourself" : "Free aquarium planner"}
          </p>
          {embedded ? (
            <h2 className="mt-1 font-display text-2xl text-white sm:text-3xl">
              Build your own {initialGallons ? `${initialGallons} gallon ` : ""}tank
            </h2>
          ) : (
            <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">Tank Builder</h1>
          )}
          <p className="mt-1 max-w-2xl text-[15px] text-ocean-200">
            Pick your tank size, add fish, and instantly see if they get along, how full the tank is, and the heater
            and filter you need.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={shareBuild}
            disabled={!hasStock && !gallons}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            <Share2 className="h-4 w-4" /> Share build
          </button>
          <button
            type="button"
            onClick={newBuild}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-ocean-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      {/* Saved-tank switcher */}
      {user && savedTanks.length > 0 && (
        <div className="mb-5">
          <p className={`${label} mb-2`}>Your tanks</p>
          <div className="flex snap-x gap-3 overflow-x-auto pb-1">
            {savedTanks.map((t) => {
              const active = t.id === currentTankId;
              return (
                <div key={t.id} className="relative shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (dirty && !window.confirm("You have unsaved changes. Switch tanks anyway?")) return;
                      loadTank(t);
                    }}
                    className={
                      "flex h-[5.5rem] w-44 overflow-hidden rounded-xl border text-left transition-colors " +
                      (active ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:border-white/25")
                    }
                  >
                    {t.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.images[0]} alt="" className="h-full w-14 shrink-0 object-cover" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col px-3 py-2.5 pr-7">
                      <span className="truncate text-sm font-medium text-white">{t.name}</span>
                      <span className="mt-0.5 text-xs text-ocean-400">
                        {t.gallons ? `${t.gallons} gal · ` : ""}
                        {t.items?.length ?? 0} species
                      </span>
                      {t.is_public && (
                        <span className="mt-auto inline-flex w-fit items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                          <Globe className="h-2.5 w-2.5" /> Public
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTank(t)}
                    aria-label={`Delete ${t.name}`}
                    disabled={busy}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg text-ocean-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* The tank itself, with the headline numbers on top */}
      <div className="relative mb-6">
        <TankVisual stock={stock} flagged={flagged} stockingPct={gallons > 0 ? result.stocking.pct : 0} />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2 sm:pointer-events-none sm:absolute sm:inset-x-0 sm:top-0 sm:mt-0 sm:p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur sm:bg-black/50">
              {galShown ? `${galShown} gal` : "No size yet"}
              {galShown && unit === "gal" ? ` · ${Math.round(galToL(galShown))} L` : ""}
            </span>
            {hasStock && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur sm:bg-black/50">
                {fishCount} {fishCount === 1 ? "animal" : "animals"} · {stock.length} species
              </span>
            )}
            {hasStock && gallons > 0 && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                  result.stocking.level === "over"
                    ? "bg-red-500/80 text-white"
                    : result.stocking.level === "near"
                    ? "bg-amber-400/90 text-ocean-950"
                    : "bg-emerald-500/80 text-ocean-950"
                }`}
              >
                {result.stocking.pct}% stocked
              </span>
            )}
          </div>
          {hasStock && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur ${
                tone === "good" ? "bg-emerald-400 text-ocean-950" : tone === "warn" ? "bg-amber-400 text-ocean-950" : "bg-red-500 text-white"
              }`}
            >
              {result.score}/100 · {verdict}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:gap-8">
        {/* ---------------- Build column ---------------- */}
        <div className="min-w-0 space-y-5">
          {/* Size */}
          <section className={`${card} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">1. Tank size</h2>
              <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs font-semibold" role="group" aria-label="Units">
                {(["gal", "L"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => switchUnit(u)}
                    className={`rounded-md px-2.5 py-1 ${unit === u ? "bg-emerald-500/20 text-emerald-200" : "text-ocean-300 hover:text-white"}`}
                    aria-pressed={unit === u}
                  >
                    {u === "gal" ? "Gallons" : "Litres"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-40">
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={gallonsInput}
                  onChange={(e) => setGallonsInput(e.target.value)}
                  placeholder={unit === "L" ? "e.g. 110" : "e.g. 29"}
                  aria-label={`Tank size in ${unit === "L" ? "litres" : "gallons"}`}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:bg-white/10 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ocean-400">
                  {unit === "L" ? "L" : "gal"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDims((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-3 text-sm text-ocean-200 hover:bg-white/5 hover:text-white"
                aria-expanded={showDims}
              >
                <Ruler className="h-4 w-4" /> Measure it
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_SIZES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => pickSize(g)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    unit === "gal" && rawSize === g
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                      : "border-white/10 text-ocean-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {g} gal
                </button>
              ))}
            </div>
            {showDims && (
              <div className="mt-4 rounded-xl border border-white/10 bg-ocean-950/50 p-3">
                <p className="mb-2 text-xs text-ocean-300">
                  Inside length × width × water height, in {unit === "L" ? "centimetres" : "inches"}.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {(["l", "w", "h"] as const).map((k, i) => (
                    <span key={k} className="flex items-center gap-2">
                      {i > 0 && <span className="text-ocean-500">×</span>}
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        value={dims[k]}
                        onChange={(e) => setDims((d) => ({ ...d, [k]: e.target.value }))}
                        placeholder={k === "l" ? "L" : k === "w" ? "W" : "H"}
                        aria-label={k === "l" ? "Length" : k === "w" ? "Width" : "Height"}
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none sm:text-sm"
                      />
                    </span>
                  ))}
                  {dimsGallons > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setGallonsInput(String(round1(unit === "L" ? galToL(dimsGallons) : dimsGallons)));
                        setShowDims(false);
                      }}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
                    >
                      Use {unit === "L" ? `${Math.round(galToL(dimsGallons))} L` : `${round1(dimsGallons)} gal`}
                    </button>
                  )}
                </div>
              </div>
            )}
            {guideClose && guide && (
              <Link
                href={`/tank-builder/${guide.slug}`}
                className="mt-3 block text-xs font-medium text-emerald-300 hover:text-emerald-200"
              >
                {guide.gallons} gallon tank guide: stocking ideas, heater and filter sizes →
              </Link>
            )}
          </section>

          {/* Fish */}
          <section className={`${card} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">2. Add fish</h2>
              {hasStock && (
                <a href="#tb-results" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 xl:hidden">
                  See results <ArrowDown className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <div className="relative" ref={searchBox}>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-400" />
              <input
                ref={searchInput}
                type="text"
                role="combobox"
                aria-expanded={searchOpen && matches.length > 0}
                aria-controls="tb-search-list"
                aria-autocomplete="list"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={onSearchKey}
                placeholder="Search fish, shrimp, snails…"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-11 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:bg-white/10 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchInput.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ocean-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searchOpen && (
                <div
                  id="tb-search-list"
                  role="listbox"
                  className="absolute z-30 mt-2 max-h-[22rem] w-full overflow-y-auto rounded-xl border border-ocean-700/70 bg-[#06182b] shadow-2xl shadow-black/70"
                >
                  {!query.trim() && matches.length > 0 && (
                    <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ocean-500">Popular picks</p>
                  )}
                  {matches.length === 0 ? (
                    <div className="px-4 py-4">
                      <p className="text-sm text-ocean-200">
                        “{query.trim()}” isn&apos;t in our library yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRequestName(query.trim());
                          setSearchOpen(false);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
                      >
                        <Plus className="h-4 w-4" /> Request it and earn bubbles
                      </button>
                    </div>
                  ) : (
                    matches.map((sp, i) => {
                      const tooSmall = gallons > 0 && sp.min_tank_gal != null && sp.min_tank_gal > gallons;
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === activeIdx}
                          key={sp.slug}
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => addSpecies(sp)}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                            i === activeIdx ? "bg-white/[0.07]" : ""
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] text-white">{sp.common_name}</span>
                            <span className="block truncate text-xs text-ocean-400">
                              {[sp.group_name, sp.max_size_in ? `${sp.max_size_in}"` : null, sp.min_tank_gal ? `${sp.min_tank_gal}+ gal` : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          {tooSmall ? (
                            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                              Needs {sp.min_tank_gal}+ gal
                            </span>
                          ) : (
                            <Plus className="h-4 w-4 shrink-0 text-ocean-400" />
                          )}
                        </button>
                      );
                    })
                  )}
                  {matches.length > 0 && query.trim().length >= 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRequestName(query.trim());
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-3 text-left text-sm text-emerald-300 hover:bg-white/[0.05]"
                    >
                      <Plus className="h-4 w-4" /> Not the one? Request “{query.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>

            {hasStock ? (
              <ul className="mt-4 space-y-2">
                {stock.map(({ species: sp, qty }, i) => {
                  const hot = flagged.has(sp.slug);
                  const short = sp.min_group_size != null && sp.min_group_size > 1 && qty < sp.min_group_size;
                  return (
                    <li
                      key={sp.slug}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 sm:px-4 ${
                        hot ? "border-amber-500/30 bg-amber-500/[0.05]" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: speciesColor(sp.slug, i) }} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/species/${sp.slug}`}
                          target="_blank"
                          className="group inline-flex max-w-full items-center gap-1 text-[15px] font-medium text-white hover:underline"
                        >
                          <span className="truncate">{sp.common_name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-ocean-500 opacity-0 group-hover:opacity-100" />
                        </Link>
                        <p className="truncate text-xs text-ocean-400">
                          {[
                            sp.max_size_in != null ? `${sp.max_size_in}" adult` : null,
                            sp.min_tank_gal != null ? `${sp.min_tank_gal}+ gal` : null,
                            short ? `keep ${sp.min_group_size}+` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQty(sp.slug, qty - 1)}
                          aria-label={`Fewer ${sp.common_name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ocean-200 hover:text-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          inputMode="numeric"
                          value={qty}
                          onChange={(e) => setQty(sp.slug, parseInt(e.target.value, 10))}
                          aria-label={`How many ${sp.common_name}`}
                          className={`h-8 w-11 rounded-lg border bg-transparent text-center text-base text-white focus:border-emerald-500/50 focus:outline-none sm:text-sm ${
                            short ? "border-amber-500/50" : "border-white/10"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setQty(sp.slug, qty + 1)}
                          aria-label={`More ${sp.common_name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ocean-200 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(sp.slug)}
                          aria-label={`Remove ${sp.common_name}`}
                          className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-ocean-400 hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-center">
                <Fish className="mx-auto mb-2 h-7 w-7 text-ocean-600" />
                <p className="font-medium text-white">Start with the fish you want most</p>
                <p className="mt-1 text-sm text-ocean-400">
                  Search above or tap the box for popular picks. Schooling fish come in at their minimum group size.
                </p>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-emerald-300" /> Tankmates that fit
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      type="button"
                      key={s.species.slug}
                      onClick={() => addSpecies(s.species, s.qty)}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">
                          {s.qty > 1 ? `${s.qty} × ` : ""}
                          {s.species.common_name}
                        </span>
                        <span className="block truncate text-xs text-ocean-400">{s.why}</span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-ocean-400 group-hover:text-emerald-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Save */}
          {user ? (
            <section className={`${card} p-4 sm:p-5`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">3. {currentTankId ? "Your saved tank" : "Save your build"}</h2>
                {dirty && <span className="text-xs font-medium text-amber-300">Unsaved changes</span>}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  maxLength={80}
                  placeholder="Name this tank (e.g. Living room 29)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => saveTank()}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {currentTankId ? "Update tank" : "Save tank"}
                </button>
              </div>

              <label className="mt-3 flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                <span className="flex items-center gap-1.5 text-sm text-ocean-200">
                  <Globe className="h-3.5 w-3.5" /> Show this tank on my profile and in the feed
                </span>
              </label>
              {isPublic && currentTankId && !dirty && (
                <Link
                  href={`/tanks/${currentTankId}`}
                  target="_blank"
                  className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300"
                >
                  View public page →
                </Link>
              )}

              <div className="mt-4">
                <p className={`${label} mb-2`}>Photos</p>
                <div className="flex flex-wrap gap-2">
                  {images.map((url) => (
                    <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Tank photo" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        aria-label="Remove photo"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_PHOTOS && (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-[11px] text-ocean-400 hover:border-white/40">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} disabled={uploading} />
                      {uploading ? (
                        <span>Uploading…</span>
                      ) : (
                        <>
                          <ImagePlus className="h-5 w-5" />
                          <span>Add</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                {photoMsg && <p className="mt-2 text-xs text-ocean-300">{photoMsg}</p>}
                <p className="mt-2 text-xs text-ocean-500">
                  Up to {MAX_PHOTOS} photos. Big photos are resized automatically. They show publicly once the tank is public.
                </p>
              </div>

              {saveMsg && <p className={`mt-3 text-sm ${saveMsg.ok ? "text-emerald-400" : "text-red-300"}`}>{saveMsg.text}</p>}
              {showUpgrade && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-sm font-medium text-amber-300">You&apos;ve saved {FREE_TANK_LIMIT} tanks</p>
                  <p className="mt-0.5 text-xs text-ocean-300">
                    That&apos;s the limit for now. Update or delete one of your tanks above to make room for a new build.
                  </p>
                </div>
              )}
            </section>
          ) : (
            <section className={`${card} flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5`}>
              <p className="text-sm text-ocean-200">
                Your build is kept on this device. Sign in to save it, add photos, share it on your profile and track water
                tests.
              </p>
              <Link
                href="/login?next=/tank-builder"
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
              >
                Sign in to save
              </Link>
            </section>
          )}
        </div>

        {/* ---------------- Analysis column ---------------- */}
        <div
          id="tb-results"
          className={`${card} min-w-0 scroll-mt-24 space-y-5 p-4 sm:p-5 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto`}
        >
          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1" role="tablist">
            {(
              [
                ["compatibility", "Compatibility", Fish],
                ["water", "Water test", Droplets],
              ] as const
            ).map(([key, text, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={
                  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors " +
                  (view === key ? "bg-emerald-500/15 text-emerald-200" : "text-ocean-300 hover:text-white")
                }
              >
                <Icon className="h-4 w-4" /> {text}
              </button>
            ))}
          </div>

          {view === "compatibility" ? (
            hasStock ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <ScoreDial score={result.score} label={verdict} tone={tone} />
                  <div className="flex gap-2 text-center text-xs">
                    <span className="rounded-lg border border-red-500/25 bg-red-500/[0.07] px-3 py-2">
                      <span className="block text-lg font-semibold text-red-300">{conflicts.length}</span>
                      <span className="text-ocean-300">conflicts</span>
                    </span>
                    <span className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2">
                      <span className="block text-lg font-semibold text-amber-300">{cautions.length}</span>
                      <span className="text-ocean-300">to check</span>
                    </span>
                  </div>
                </div>

                {result.issues.length > 0 ? (
                  <ul className="space-y-2">
                    {result.issues.map((issue, i) => {
                      const st = issueStyle(issue.level);
                      return (
                        <li key={i} className={"flex gap-3 rounded-xl border p-3.5 " + st.box}>
                          <st.I className={"mt-0.5 h-5 w-5 shrink-0 " + st.icon} />
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-white">{issue.title}</p>
                            <p className="mt-0.5 text-sm leading-relaxed text-ocean-200">{issue.detail}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <p className="text-sm text-ocean-100">
                      No problems found with this combination. Every fish has its own personality, so watch the first few
                      weeks.
                    </p>
                  </div>
                )}

                {gallons > 0 ? (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">How full is it?</h3>
                        <span className="text-sm text-white tabular-nums">
                          {result.stocking.pct}% · {result.stocking.label}
                        </span>
                      </div>
                      <div className="relative mb-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={"h-full rounded-full transition-all duration-500 " + stockingColor}
                          style={{ width: `${Math.min(result.stocking.pct, 100)}%` }}
                        />
                        <span className="absolute inset-y-0 left-[90%] w-px bg-white/30" title="Near capacity" />
                      </div>
                      <p className="text-xs leading-relaxed text-ocean-400">{result.stocking.reasoning}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-white">Gear for {galShown} gallons</h3>
                      <dl className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                          <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ocean-400">
                            <Flame className="h-3 w-3" /> Heater
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-white">
                            {result.equipment.heaterNeeded
                              ? `${result.equipment.heaterWattsLow}-${result.equipment.heaterWattsHigh} W`
                              : "Not needed"}
                          </dd>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                          <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ocean-400">
                            <Wind className="h-3 w-3" /> Filter
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-white">
                            {result.equipment.filterGphLow}-{result.equipment.filterGphHigh} GPH
                          </dd>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                          <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ocean-400">
                            <Thermometer className="h-3 w-3" /> Set to
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-white">
                            {result.equipment.setPointF ? `${result.equipment.setPointF}°F` : "--"}
                          </dd>
                        </div>
                      </dl>
                      {result.equipment.heaterNote && (
                        <p className="mt-3 text-xs leading-relaxed text-ocean-300">{result.equipment.heaterNote}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-ocean-300">
                    Add your tank size to see how full it is and what heater and filter you need.
                  </p>
                )}

                <details className="group rounded-xl border border-white/10 bg-white/5 p-4" open={stock.length > 1}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-white">
                    Water each fish likes
                    <ChevronDown className="h-4 w-4 text-ocean-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-4 space-y-5">
                    <RangeChart
                      title="Temperature"
                      unit="°F"
                      min={60}
                      max={90}
                      stock={stock}
                      lo={(s) => s.temp_min_f}
                      hi={(s) => s.temp_max_f}
                      shared={result.water.temp}
                    />
                    <RangeChart
                      title="pH"
                      unit=""
                      min={5}
                      max={9}
                      step={0.1}
                      stock={stock}
                      lo={(s) => s.ph_min}
                      hi={(s) => s.ph_max}
                      shared={result.water.ph}
                    />
                  </div>
                </details>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <Fish className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
                <p className="mb-1 font-medium text-white">Add fish to get your score</p>
                <p className="text-sm text-ocean-400">
                  Compatibility, stocking level, heater and filter sizes, and the water each fish likes all show up here as
                  you build.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-1 text-sm font-semibold text-white">Enter your test results</h3>
                <p className="mb-4 text-xs leading-relaxed text-ocean-400">
                  Fill in whatever your kit tests. You don&apos;t need every box, and the read-out updates as you type.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {WATER_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label htmlFor={`tb-w-${f.key}`} className="mb-1 block text-[11px] uppercase tracking-wide text-ocean-400">
                        {f.label}
                      </label>
                      <div className="relative">
                        <input
                          id={`tb-w-${f.key}`}
                          type="number"
                          inputMode="decimal"
                          step={f.step}
                          value={water[f.key]}
                          onChange={(e) => setWaterField(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className={
                            "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:bg-white/10 focus:outline-none sm:text-sm " +
                            (f.unit ? "pr-12" : "")
                          }
                        />
                        {f.unit && (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ocean-500">
                            {f.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {!hasStock && (
                  <p className="mt-4 text-xs leading-relaxed text-ocean-500">
                    Add fish and the pH and temperature checks will also tell you how well your water suits them.
                  </p>
                )}
              </div>

              {waterBanner && (
                <div className={"flex items-center gap-2 rounded-xl border px-4 py-3 " + waterBanner.className}>
                  <waterBanner.Icon className="h-5 w-5 shrink-0" />
                  <span className="font-medium">{waterBanner.text}</span>
                </div>
              )}

              {waterResult.status === "empty" ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                  <Droplets className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
                  <p className="mb-1 font-medium text-white">Enter a reading to begin</p>
                  <p className="text-sm text-ocean-400">
                    Fill in at least one value and you&apos;ll get a plain-English read on what&apos;s happening and how to
                    fix it.
                  </p>
                </div>
              ) : waterResult.findings.length > 0 ? (
                <div className="space-y-2">
                  {waterResult.findings.map((f, i) => {
                    const st = findingStyle(f.level);
                    return (
                      <div key={i} className={"flex gap-3 rounded-xl border p-4 " + st.box}>
                        <st.I className={"mt-0.5 h-5 w-5 shrink-0 " + st.icon} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-white">{f.title}</p>
                            <span className="shrink-0 whitespace-nowrap text-xs text-ocean-400">{f.value}</span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-ocean-200">{f.whatsHappening}</p>
                          <p className="mt-2 text-xs leading-relaxed text-ocean-400">
                            <span className="font-medium text-ocean-200">How to fix: </span>
                            {f.howToFix}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <p className="text-sm text-ocean-100">Nothing to flag from what you&apos;ve entered.</p>
                </div>
              )}

              {!user ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-ocean-300">
                  <Link href="/login?next=/tank-builder" className="font-medium text-emerald-400 hover:text-emerald-300">
                    Sign in
                  </Link>{" "}
                  to log readings and track your water over time.
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="mb-1 text-sm font-semibold text-white">
                    {currentTankId ? "Log this reading" : "Track this over time"}
                  </h3>
                  <p className="mb-3 text-xs text-ocean-400">
                    {currentTankId
                      ? `Adds a dated entry to “${tankName.trim() || "My Tank"}” so you can watch changes over time.`
                      : "Readings attach to a saved tank. This saves your build and logs the reading in one step."}
                  </p>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={200}
                    placeholder="Optional note (e.g. after a 30% water change)"
                    className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none sm:text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => (currentTankId ? saveReading() : saveTankAndLog())}
                      disabled={busy || readingBusy || waterResult.status === "empty"}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {currentTankId ? "Log reading" : "Save tank & log reading"}
                    </button>
                    {readingMsg && <span className="text-xs text-ocean-300">{readingMsg}</span>}
                  </div>
                </div>
              )}

              {user && currentTankId && readings.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-white">Recent readings</h3>
                  <div className="space-y-2">
                    {readings.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-ocean-400">{fmtReadingDate(r.measured_at)}</p>
                          <p className="mt-0.5 break-words text-sm text-white">{readingSummary(r)}</p>
                          {r.note && <p className="mt-1 break-words text-xs italic text-ocean-400">{r.note}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteReading(r.id)}
                          aria-label="Delete reading"
                          disabled={readingBusy}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ocean-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {requestName !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setRequestName(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Request a species"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl border border-ocean-700/70 bg-[#06182b] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/80 sm:rounded-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Request a fish</p>
                <p className="text-sm text-ocean-300">
                  We&apos;ll add it to the library and the Tank Builder. You get bubbles and a trophy when it&apos;s in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestName(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ocean-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SuggestSpecies key={requestName} initialName={requestName} defaultOpen compact />
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8" role="status">
          <span className="rounded-full bg-ocean-700 px-4 py-2 text-sm font-medium text-white shadow-xl shadow-black/50">
            {toast}
          </span>
        </div>
      )}
    </Root>
  );
}
