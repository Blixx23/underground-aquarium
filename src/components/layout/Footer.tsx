import Link from "next/link";
import { Fish, Github, Twitter, Mail } from "lucide-react";

const links = {
  Marketplace: [
    { label: "Browse Stores", href: "/marketplace" },
    { label: "Start Selling", href: "/sell" },
    { label: "Vendor Guide", href: "/vendor-guide" },
    { label: "Legal Notice", href: "/legal" },
  ],
  Resources: [
    { label: "Fish Species", href: "/species" },
    { label: "Glossary", href: "/glossary" },
    { label: "Blog", href: "/blog" },
    { label: "Events", href: "/events" },
  ],
  Community: [
    { label: "Forums", href: "/community" },
    { label: "Discord", href: "/discord" },
    { label: "Submit Event", href: "/events/submit" },
    { label: "About Us", href: "/about" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-ocean-800/40 bg-ocean-950">
      <div className="absolute inset-0 water-shimmer opacity-30 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-ocean-800 border border-ocean-600/40 flex items-center justify-center">
                <Fish className="w-4 h-4 text-ocean-300" />
              </div>
              <div>
                <span className="block text-xs font-display text-ocean-200 tracking-[0.15em]">
                  UNDERGROUND
                </span>
                <span className="block text-[10px] font-mono tracking-[0.3em] text-ocean-500">
                  AQUARIUM
                </span>
              </div>
            </Link>
            <p className="text-sm text-ocean-400 leading-relaxed">
              The hobbyist-first marketplace and community for freshwater aquarium enthusiasts.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                { icon: Twitter, href: "#" },
                { icon: Github, href: "#" },
                { icon: Mail, href: "mailto:hello@undergroundaquarium.com" },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href}
                  href={href}
                  className="w-8 h-8 rounded-lg bg-ocean-800/60 border border-ocean-700/40 flex items-center justify-center text-ocean-400 hover:text-ocean-200 hover:border-ocean-500/60 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-mono tracking-[0.2em] text-ocean-500 uppercase mb-5">
                {section}
              </p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-ocean-400 hover:text-ocean-200 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-ocean-800/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-ocean-600 font-mono">
            © {new Date().getFullYear()} UndergroundAquarium.com — Built for the hobby, by the hobby.
          </p>
          <div className="flex gap-6 text-xs text-ocean-600">
            <Link href="/privacy" className="hover:text-ocean-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-ocean-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/legal" className="hover:text-ocean-400 transition-colors">
              Vendor Legal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
