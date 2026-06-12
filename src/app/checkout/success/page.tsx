import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  let productName: string | null = null;
  let amount: number | null = null;

  if (orderId) {
    const supabase = await createClient();
    const { data: order } = await supabase
      .from("orders")
      .select("product_name, amount_total")
      .eq("id", orderId)
      .maybeSingle();
    if (order) {
      productName = order.product_name as string | null;
      amount = order.amount_total as number | null;
    }
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="font-display text-3xl text-white mb-3">Thank you!</h1>
        <p className="text-ocean-400 mb-2">
          Your payment went through and your order is confirmed.
        </p>
        {productName && (
          <p className="text-ocean-200 mb-8">
            {productName}
            {typeof amount === "number" && (
              <span className="text-ocean-400"> — ${(amount / 100).toFixed(2)}</span>
            )}
          </p>
        )}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to the marketplace
        </Link>
      </div>
    </main>
  );
}