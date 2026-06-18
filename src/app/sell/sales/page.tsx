import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ArrowLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { trackingUrl, carrierLabel } from "@/lib/shipping/carriers";
import BuyLabelButton from "./BuyLabelButton";

type ShippingAddress = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

type Sale = {
  id: string;
  product_name: string | null;
  amount_total: number;
  platform_fee: number;
  status: string;
  created_at: string;
  shipped_at: string | null;
  released_at: string | null;
  shipping_address: ShippingAddress | null;
  tracking: string | null;
  tracking_carrier: string | null;
  shipping_label_cost: number | null;
  shipping_label_fee: number | null;
  shipping_label_url: string | null;
};

const statusStyles: Record<string, string> = {
  released: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  shipped: "bg-ocean-500/15 text-ocean-200 border-ocean-500/30",
  paid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending: "bg-ocean-700/30 text-ocean-300 border-ocean-700/40",
};

const statusLabels: Record<string, string> = {
  released: "Paid out",
  shipped: "Shipped",
  paid: "Ready to ship",
  pending: "Pending",
};

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id);

  const storeIds = (stores ?? []).map((s) => s.id);

  let sales: Sale[] = [];
  if (storeIds.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, product_name, amount_total, platform_fee, status, created_at, shipped_at, released_at, shipping_address, tracking, tracking_carrier, shipping_label_cost, shipping_label_fee, shipping_label_url"
      )
      .in("store_id", storeIds)
      .order("created_at", { ascending: false });
    sales = (data ?? []) as Sale[];
  }

  // What the seller actually keeps: total minus our commission, minus the
  // carrier label cost and your flat label fee (both 0 until a label is bought).
  const sellerCut = (s: Sale) =>
    s.amount_total -
    s.platform_fee -
    (s.shipping_label_cost ?? 0) -
    (s.shipping_label_fee ?? 0);

  const releasedTotal = sales
    .filter((s) => s.status === "released")
    .reduce((sum, s) => sum + sellerCut(s), 0);

  const heldTotal = sales
    .filter((s) => s.status === "paid" || s.status === "shipped")
    .reduce((sum, s) => sum + sellerCut(s), 0);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          Your shop
        </p>
        <h1 className="font-display text-3xl text-white mb-8">Sales</h1>

        {sales.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
            <Package className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-400 mb-6">No sales yet.</p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-ocean-300 hover:text-ocean-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to your listings
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
                <p className="text-2xl font-display text-emerald-300">
                  ${(releasedTotal / 100).toFixed(2)}
                </p>
                <p className="text-sm text-ocean-400">paid out to you</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
                <p className="text-2xl font-display text-amber-300">
                  ${(heldTotal / 100).toFixed(2)}
                </p>
                <p className="text-sm text-ocean-400">
                  held — releases when buyers confirm or the window passes
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {sales.map((sale) => {
                const url = trackingUrl(sale.tracking_carrier, sale.tracking);
                return (
                  <li
                    key={sale.id}
                    className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-5 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white font-medium">
                          {sale.product_name ?? "Item"}
                        </p>
                        <p className="text-sm text-ocean-400">
                          {new Date(sale.created_at).toLocaleDateString()} · $
                          {(sale.amount_total / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-emerald-300/80 mt-0.5">
                          You keep ${(sellerCut(sale) / 100).toFixed(2)} after fees
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${
                            statusStyles[sale.status] ??
                            "bg-ocean-700/30 text-ocean-300 border-ocean-700/40"
                          }`}
                        >
                          {statusLabels[sale.status] ?? sale.status}
                        </span>
                        {sale.status === "shipped" && sale.shipped_at && (
                          <span className="text-[11px] text-ocean-400">
                            Shipped {new Date(sale.shipped_at).toLocaleDateString()}
                          </span>
                        )}
                        {sale.status === "released" && sale.released_at && (
                          <span className="text-[11px] text-emerald-300/80">
                            Paid out {new Date(sale.released_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {sale.status === "paid" && <BuyLabelButton orderId={sale.id} />}

                    {(sale.shipping_address?.address ||
                      sale.tracking ||
                      sale.shipping_label_url) && (
                      <div className="mt-3 pt-3 border-t border-ocean-800/60 text-sm space-y-1">
                        {sale.shipping_address?.address && (
                          <div>
                            <span className="text-ocean-500">Ship to: </span>
                            <span className="text-ocean-200">
                              {sale.shipping_address.name}
                              {" — "}
                              {[
                                sale.shipping_address.address.line1,
                                sale.shipping_address.address.line2,
                                sale.shipping_address.address.city,
                                sale.shipping_address.address.state,
                                sale.shipping_address.address.postal_code,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {sale.tracking && (
                          <div>
                            <span className="text-ocean-500">Tracking: </span>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ocean-200 hover:text-ocean-100 underline"
                              >
                                {carrierLabel(sale.tracking_carrier)} · {sale.tracking}
                              </a>
                            ) : (
                              <span className="text-ocean-200">
                                {carrierLabel(sale.tracking_carrier)} · {sale.tracking}
                              </span>
                            )}
                          </div>
                        )}
                        {sale.shipping_label_url && (
                          <div>
                            <a
                              href={sale.shipping_label_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-ocean-200 hover:text-ocean-100 underline"
                            >
                              <FileText className="w-3.5 h-3.5" /> Print shipping label
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
