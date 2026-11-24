import { Smartphone, Bell, Droplets, MessageCircle } from "lucide-react";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/config";

// Official badges, linked from Apple's and Google's own badge servers as they
// ask, so the artwork is always the current approved version.
const APPLE_BADGE =
  "https://tools.applemarketingtools.com/api/badges/download-on-the-app-store/black/en-us";
const PLAY_BADGE =
  "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png";

function ComingSoon({ label }: { label: string }) {
  return (
    <span className="inline-flex h-[52px] items-center rounded-xl border border-dashed border-ocean-600/60 px-5 text-sm text-ocean-300">
      {label} app coming soon
    </span>
  );
}

/**
 * "Get the app" band for the home page. Stays hidden until at least one store
 * link is set in config, and is always hidden inside the app itself.
 */
export default function GetTheApp() {
  if (!APP_STORE_URL && !GOOGLE_PLAY_URL) return null;
  return (
    <section className="web-only mx-auto max-w-7xl px-5 py-12 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-ocean-700/50 bg-gradient-to-br from-ocean-800/80 via-ocean-900 to-ocean-950 p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-[90px]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-emerald-300">
              <Smartphone className="h-3.5 w-3.5" />
              Download our app
            </div>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Underground Aquarium in your pocket
            </h2>
            <ul className="mt-4 space-y-2 text-ocean-200">
              <li className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-400" />
                Alerts when the fish you want is listed near you
              </li>
              <li className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-sky-400" />
                Check your water right from the tank
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-ocean-300" />
                Message sellers and friends on the go
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {APP_STORE_URL ? (
              <a href={APP_STORE_URL} target="_blank" rel="noopener" aria-label="Download on the App Store">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={APPLE_BADGE} alt="Download on the App Store" className="h-[52px] w-auto" loading="lazy" />
              </a>
            ) : (
              <ComingSoon label="iPhone" />
            )}
            {GOOGLE_PLAY_URL ? (
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener" aria-label="Get it on Google Play">
                {/* Google's badge has built-in padding, so it's drawn taller to match Apple's. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PLAY_BADGE} alt="Get it on Google Play" className="-my-[10px] h-[76px] w-auto" loading="lazy" />
              </a>
            ) : (
              <ComingSoon label="Android" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
