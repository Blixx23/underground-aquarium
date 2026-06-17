// One place that knows the carriers we support and how to build a
// "track my package" link for each. Used by both the seller's shipping
// form and the buyer's order page.

export const CARRIERS = [
  { value: "usps", label: "USPS" },
  { value: "ups", label: "UPS" },
  { value: "fedex", label: "FedEx" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "Other" },
] as const;

export function carrierLabel(value: string | null | undefined): string {
  return CARRIERS.find((c) => c.value === value)?.label ?? "Carrier";
}

// Returns a public tracking URL for known carriers, or null if we can't
// build one (e.g. "Other" or no number) — in which case we just show the number.
export function trackingUrl(
  carrier: string | null | undefined,
  number: string | null | undefined
): string | null {
  if (!number) return null;
  const n = encodeURIComponent(number);
  switch (carrier) {
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case "ups":
      return `https://www.ups.com/track?tracknum=${n}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "dhl":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    default:
      return null;
  }
}