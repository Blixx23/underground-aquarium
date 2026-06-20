"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Receipt, Truck, Wallet, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/sell/listings", label: "Listings", Icon: Package },
  { href: "/sell/sales", label: "Sales", Icon: Receipt },
  { href: "/sell/shipping", label: "Shipping", Icon: Truck },
  { href: "/sell/payouts", label: "Payouts", Icon: Wallet },
  { href: "/sell/finances", label: "Finances", Icon: BarChart3 },
];

export default function SellerTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 mb-8 border-b border-ocean-800/60">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-emerald-400 text-white"
                : "border-transparent text-ocean-400 hover:text-ocean-200"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
