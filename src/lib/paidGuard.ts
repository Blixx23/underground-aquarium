import { NextResponse } from "next/server";
import {
  PAID_MARKETPLACE_ENABLED,
  PAID_ORDER_WINDDOWN_ENABLED,
} from "@/lib/config";

/**
 * Drop this at the top of any API route that would START a new paid
 * transaction. Returns a 410 response when the paid marketplace is off,
 * or null when it's on and the route should carry on as normal.
 *
 *   const off = blockIfPaidMarketplaceOff();
 *   if (off) return off;
 */
export function blockIfPaidMarketplaceOff(): NextResponse | null {
  if (PAID_MARKETPLACE_ENABLED) return null;
  return NextResponse.json(
    {
      error:
        "Underground Aquarium is a free classifieds site now. Paid checkout is turned off — post your item for free instead.",
    },
    { status: 410 }
  );
}

/**
 * Same idea, but for routes that finish an order that was ALREADY paid for:
 * marking shipped, buying a label, confirming receipt, releasing a payout.
 * These stay open while PAID_ORDER_WINDDOWN_ENABLED is true so no money
 * gets stranded mid-flight.
 */
export function blockIfWinddownOff(): NextResponse | null {
  if (PAID_ORDER_WINDDOWN_ENABLED) return null;
  return NextResponse.json(
    { error: "Paid orders are fully closed out. This action is no longer available." },
    { status: 410 }
  );
}
