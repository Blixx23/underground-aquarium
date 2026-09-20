import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import EditStore from "@/app/stores/EditStore";
import StoreSpecialHours, { type SpecialDay } from "@/components/stores/StoreSpecialHours";

export const metadata: Metadata = { title: "Hours & details" };
export const dynamic = "force-dynamic";

export default async function ShopHoursPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase } = await requireOwnedStore(slug);
  const { data } = await supabase
    .from("store_special_hours")
    .select("id, day, closed, note")
    .eq("store_id", store.id)
    .gte("day", new Date().toISOString().slice(0, 10))
    .order("day");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 font-display text-lg text-white">Your details</h2>
        <p className="mb-3 text-sm text-ocean-400">
          Address, phone, website, hours and what you carry. This is what customers see first.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <EditStore
            store={{
              id: store.id,
              address: store.address,
              city: store.city,
              state: store.state,
              phone: store.phone,
              website: store.website,
              hours: store.hours,
              description: store.description,
              tags: store.tags,
            }}
            isOwner
          />
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Address" value={[store.address, store.city, store.state].filter(Boolean).join(", ")} />
            <Row label="Phone" value={store.phone} />
            <Row label="Website" value={store.website} />
            <Row label="Hours" value={store.hours} />
            <Row label="About" value={store.description} />
          </dl>
        </div>
      </div>

      <StoreSpecialHours storeId={store.id} initial={(data ?? []) as SpecialDay[]} isOwner />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-ocean-500">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-ocean-200">{value || <span className="text-ocean-600">Not set</span>}</dd>
    </div>
  );
}
