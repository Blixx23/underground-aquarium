// Thin wrapper around the Shippo API for shipping rates + labels.

const SHIPPO_BASE = "https://api.goshippo.com";

// Shippo requires a non-empty email on addresses; used as a fallback.
const FALLBACK_EMAIL = "orders@undergroundaquarium.com";

export type ShipAddress = {
  name?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type Parcel = {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
};

// Shippo's label file types we support.
//  - PDF_4x6: clean 4x6 shipping label (thermal printers / print-to-fit)
//  - PDF:     full 8.5x11 sheet with the label in a corner
export type LabelFormat = "PDF_4x6" | "PDF";

export type RateQuote = {
  costCents: number;
  carrierName: string; // e.g. "USPS"
  service: string; // e.g. "Ground Advantage"
};

export type BoughtLabel = {
  trackingNumber: string;
  carrier: string; // our internal code: usps | ups | fedex | dhl | other
  labelUrl: string;
  costCents: number;
};

type ShippoRate = {
  object_id: string;
  amount: string;
  provider?: string;
  servicelevel?: { name?: string };
};

type ShippoResponse = {
  rates?: ShippoRate[];
  status?: string;
  tracking_number?: string;
  label_url?: string;
  messages?: { text?: string }[];
  detail?: string;
};

// Map Shippo's carrier name to the short codes our tracking links use.
function carrierCode(provider: string | undefined): string {
  const p = (provider ?? "").toLowerCase();
  if (p.includes("usps")) return "usps";
  if (p.includes("ups")) return "ups";
  if (p.includes("fedex")) return "fedex";
  if (p.includes("dhl")) return "dhl";
  return "other";
}

async function shippoPost(path: string, body: unknown): Promise<ShippoResponse> {
  const token = process.env.SHIPPO_API_TOKEN;
  if (!token) throw new Error("SHIPPO_API_TOKEN is not set.");

  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as ShippoResponse;
  if (!res.ok) {
    throw new Error(`Shippo error: ${data.detail ?? "request failed"}`);
  }
  return data;
}

function shipmentBody(from: ShipAddress, to: ShipAddress, parcel: Parcel) {
  return {
    address_from: {
      name: from.name ?? "",
      street1: from.street1,
      street2: from.street2 ?? "",
      city: from.city,
      state: from.state,
      zip: from.zip,
      country: from.country ?? "US",
      phone: from.phone ?? "",
      email: from.email || FALLBACK_EMAIL,
    },
    address_to: {
      name: to.name ?? "",
      street1: to.street1,
      street2: to.street2 ?? "",
      city: to.city,
      state: to.state,
      zip: to.zip,
      country: to.country ?? "US",
      phone: to.phone ?? "",
      email: to.email || FALLBACK_EMAIL,
    },
    parcels: [
      {
        length: String(parcel.lengthIn),
        width: String(parcel.widthIn),
        height: String(parcel.heightIn),
        distance_unit: "in",
        weight: String(parcel.weightOz),
        mass_unit: "oz",
      },
    ],
    async: false,
  };
}

function pickCheapest(rates: ShippoRate[]): ShippoRate {
  if (rates.length === 0) {
    throw new Error(
      "No shipping rates came back — double-check the addresses and package size."
    );
  }
  return rates.reduce((lo, r) =>
    parseFloat(r.amount) < parseFloat(lo.amount) ? r : lo
  );
}

// Look up the cheapest rate WITHOUT buying anything (for showing a price).
export async function getCheapestRate(
  from: ShipAddress,
  to: ShipAddress,
  parcel: Parcel
): Promise<RateQuote> {
  const shipment = await shippoPost("/shipments/", shipmentBody(from, to, parcel));
  const cheapest = pickCheapest(shipment.rates ?? []);
  return {
    costCents: Math.round(parseFloat(cheapest.amount) * 100),
    carrierName: cheapest.provider ?? "Carrier",
    service: cheapest.servicelevel?.name ?? "",
  };
}

// Buy the cheapest label and return tracking + cost.
// labelFormat controls the printout: 4x6 label (default) or full 8.5x11 sheet.
export async function buyCheapestLabel(
  from: ShipAddress,
  to: ShipAddress,
  parcel: Parcel,
  labelFormat: LabelFormat = "PDF_4x6"
): Promise<BoughtLabel> {
  const shipment = await shippoPost("/shipments/", shipmentBody(from, to, parcel));
  const cheapest = pickCheapest(shipment.rates ?? []);

  const tx = await shippoPost("/transactions/", {
    rate: cheapest.object_id,
    label_file_type: labelFormat,
    async: false,
  });

  if (tx.status !== "SUCCESS") {
    const msg =
      (tx.messages ?? []).map((m) => m.text).filter(Boolean).join("; ") ||
      "Label purchase failed.";
    throw new Error(msg);
  }

  return {
    trackingNumber: tx.tracking_number ?? "",
    carrier: carrierCode(cheapest.provider),
    labelUrl: tx.label_url ?? "",
    costCents: Math.round(parseFloat(cheapest.amount) * 100),
  };
}
