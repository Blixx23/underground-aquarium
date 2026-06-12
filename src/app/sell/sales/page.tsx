import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_FEE_LABEL } from "@/lib/config";

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
  shipping_address: ShippingAddress | null;
};

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  shipped: "bg-ocean-500/15 text-ocean-200 border-ocean-500/30",
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
        "id, product_name, amount_total, platform_fee, status, created_at, shipping_address"
      )
      .in("store_id", storeIds)
      .order("created_at", { ascending: false });
    sales = (data ?? []) as Sale[];
  }

  const paid = sales.filter((s) => s.status === "paid");
  const totalEarned = paid.reduce(
    (sum, s) => sum + (s.amount_total - s.platform_fee),
    0
  );

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
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
              <p className="text-sm text-ocean-400">
                {paid.length} paid {paid.length === 1 ? "sale" : "sales"}
              </p>
              <p className="text-2xl font-display text-emerald-300">
                ${(totalEarned / 100).toFixed(2)}{" "}
                <span className="text-sm font-sans text-ocean-400">earned</span>
              </p>
            </div>

            <ul className="space-y-4">
              {sales.map((sale) => (
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
                        You earn $
                        {((sale.amount_total - sale.platform_fee) / 100).toFixed(2)}{" "}
                        after {PLATFORM_FEE_LABEL} fee
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border capitalize ${
                        statusStyles[sale.status] ??
                        "bg-ocean-700/30 text-ocean-300 border-ocean-700/40"
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>

                  {sale.shipping_address?.address && (
                    <div className="mt-3 pt-3 border-t border-ocean-800/60 text-sm">
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
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}