import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SellerTabs from "../SellerTabs";
import PrintButton from "./PrintButton";

type Order = {
  id: string;
  product_name: string | null;
  amount_total: number;
  platform_fee: number;
  shipping_label_cost: number | null;
  shipping_label_fee: number | null;
  status: string;
  created_at: string;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function FinancesPage() {
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

  let orders: Order[] = [];
  if (storeIds.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, product_name, amount_total, platform_fee, shipping_label_cost, shipping_label_fee, status, created_at"
      )
      .in("store_id", storeIds)
      .neq("status", "pending")
      .order("created_at", { ascending: false });
    orders = (data ?? []) as Order[];
  }

  const shippingOf = (o: Order) =>
    (o.shipping_label_cost ?? 0) + (o.shipping_label_fee ?? 0);
  const netOf = (o: Order) => o.amount_total - o.platform_fee - shippingOf(o);

  const grossSales = orders.reduce((s, o) => s + o.amount_total, 0);
  const totalFees = orders.reduce((s, o) => s + o.platform_fee, 0);
  const totalShipping = orders.reduce((s, o) => s + shippingOf(o), 0);
  const net = grossSales - totalFees - totalShipping;

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <SellerTabs />

        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-display text-3xl text-white">Finances</h1>
          {orders.length > 0 && <PrintButton />}
        </div>
        <p className="text-ocean-400 mb-8 text-sm">
          Money in and the costs that ran through the marketplace. This doesn&apos;t
          include what you paid for the items themselves.
        </p>

        {orders.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
            <Package className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-400 mb-6">No sales to report yet.</p>
            <Link
              href="/sell/sales"
              className="inline-flex items-center gap-2 text-ocean-300 hover:text-ocean-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sales
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-4">
                <p className="text-2xl font-display text-white">{money(grossSales)}</p>
                <p className="text-xs text-ocean-400 mt-1">Gross sales</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
                <p className="text-2xl font-display text-amber-300">
                  −{money(totalFees)}
                </p>
                <p className="text-xs text-ocean-400 mt-1">Marketplace fees</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
                <p className="text-2xl font-display text-amber-300">
                  −{money(totalShipping)}
                </p>
                <p className="text-xs text-ocean-400 mt-1">Shipping</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
                <p className="text-2xl font-display text-emerald-300">{money(net)}</p>
                <p className="text-xs text-ocean-400 mt-1">Net earnings</p>
              </div>
            </div>

            <div className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ocean-500 border-b border-ocean-800/60">
                    <th className="font-medium px-4 py-3">Date</th>
                    <th className="font-medium px-4 py-3">Item</th>
                    <th className="font-medium px-4 py-3 text-right">Sale</th>
                    <th className="font-medium px-4 py-3 text-right">Fee</th>
                    <th className="font-medium px-4 py-3 text-right">Shipping</th>
                    <th className="font-medium px-4 py-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-ocean-800/40 last:border-0"
                    >
                      <td className="px-4 py-3 text-ocean-400 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-ocean-200">
                        {o.product_name ?? "Item"}
                      </td>
                      <td className="px-4 py-3 text-right text-ocean-200">
                        {money(o.amount_total)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-300/90">
                        −{money(o.platform_fee)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-300/90">
                        −{money(shippingOf(o))}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-300">
                        {money(netOf(o))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-ocean-700/60 font-medium">
                    <td className="px-4 py-3 text-ocean-300" colSpan={2}>
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {money(grossSales)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-300">
                      −{money(totalFees)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-300">
                      −{money(totalShipping)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-300">
                      {money(net)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-xs text-ocean-600 mt-4">
              For your own records — not a tax document. Stripe handles official
              tax forms based on your payout account.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
