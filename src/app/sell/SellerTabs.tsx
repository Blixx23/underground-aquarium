"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ListChecks, Package, Receipt, Truck, Wallet, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/sell/setup", label: "Setup", Icon: ListChecks },
  { href: "/sell/listings", label: "Listings", Icon: Package },
  { href: "/sell/sales", label: "Sales", Icon: Receipt },
  { href: "/sell/shipping", label: "Shipping", Icon: Truck },
  { href: "/sell/payouts", label: "Payouts", Icon: Wallet },
  { href: "/sell/finances", label: "Finances", Icon: BarChart3 },
];

export default function SellerTabs() {
  const pathname = usePathname();
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/sell/setup-status")
      .then((r) => r.json())
      .then((d) => {
        if (active) setNeedsSetup(d?.complete === false);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <nav className="flex items-center gap-1 mb-8 border-b border-ocean-800/60 overflow-x-auto">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href;
        const showDot = href === "/sell/setup" && needsSetup;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              active
                ? "border-emerald-400 text-white"
                : "border-transparent text-ocean-400 hover:text-ocean-200"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
            {showDot && (
              <span className="ml-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
