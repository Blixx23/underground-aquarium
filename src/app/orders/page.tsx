import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { trackingUrl, carrierLabel } from "@/lib/shipping/carriers";
import ConfirmReceivedButton from "./ConfirmButton";

type Order = {
  id: string;
  product_name: string | null;
  amount_total: number;
  status: string;
  created_at: string;
  tracking: string | null;
  tracking_carrier: string | null;
};

const statusStyles: Record<string, string> = {
  released: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  paid: "bg-ocean-500/15 text-ocean-200 border-ocean-500/30",
  shipped: "bg-ocean-500/15 text-ocean-200 border-ocean-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const statusLabels: Record<string, string> = {
  released: "Completed",
  paid: "Paid",
  shipped: "Shipped",
  pending: "Pending",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("orders")
    .select(
      "id, product_name, amount_total, status, created_at, tracking, tracking_carrier"
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as Order[];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          Your account
        </p>
        <h1 className="font-display text-3xl text-white mb-8">My orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
            <Package className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-400 mb-6">You haven&apos;t bought anything yet.</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-ocean-300 hover:text-ocean-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Browse the marketplace
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => {
              const canConfirm =
                order.status === "paid" || order.status === "shipped";
              const url = trackingUrl(order.tracking_carrier, order.tracking);
              return (
                <li
                  key={order.id}
                  className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">
                        {order.product_name ?? "Item"}
                      </p>
                      <p className="text-sm text-ocean-400">
                        {new Date(order.created_at).toLocaleDateString()} · $
                        {(order.amount_total / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${
                          statusStyles[order.status] ??
                          "bg-ocean-700/30 text-ocean-300 border-ocean-700/40"
                        }`}
                      >
                        {statusLabels[order.status] ?? order.status}
                      </span>
                      {canConfirm && <ConfirmReceivedButton orderId={order.id} />}
                    </div>
                  </div>

                  {order.tracking && (
                    <div className="mt-3 pt-3 border-t border-ocean-800/60 text-sm">
                      <span className="text-ocean-500">Tracking: </span>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ocean-200 hover:text-ocean-100 underline inline-flex items-center gap-1"
                        >
                          {carrierLabel(order.tracking_carrier)} · {order.tracking}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-ocean-200">
                          {carrierLabel(order.tracking_carrier)} · {order.tracking}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
