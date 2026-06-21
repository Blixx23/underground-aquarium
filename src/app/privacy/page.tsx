import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Underground Aquarium collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
          Legal
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-ocean-400 text-sm mb-10">Last updated: June 20, 2026</p>

        <div className="space-y-8 text-ocean-200 leading-relaxed">
          <section className="space-y-3">
            <p>
              This Privacy Policy explains how Underground Aquarium
              (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects,
              uses, and shares information when you use our website, marketplace,
              and community features (the &ldquo;Service&rdquo;). By using the
              Service, you agree to this policy and to our{" "}
              <Link href="/terms" className="text-white hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Who can use the Service
            </h2>
            <p>
              Underground Aquarium is for people 18 and older. We do not
              knowingly collect personal information from anyone under 18. If we
              learn that we have, we will delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Information we collect
            </h2>
            <p>
              <span className="text-white">Information you give us.</span> When
              you create an account we collect your email, username, and password
              (passwords are stored in hashed form by our authentication
              provider). You may add profile details such as a display name, bio,
              location, and website. We also collect the content you create —
              listings and photos, tanks, reviews, club information, forum posts,
              and messages.
            </p>
            <p>
              <span className="text-white">Transaction information.</span> When
              you buy or sell, we collect order details such as the items,
              amounts, and the shipping address provided at checkout, plus a
              seller&apos;s ship-from address used to create shipping labels.
            </p>
            <p>
              <span className="text-white">Payment information.</span> Payments
              and payouts are handled by Stripe. We do not collect or store your
              full card number. Stripe may collect identity and bank details
              directly from sellers and clubs to enable payouts, under
              Stripe&apos;s own privacy policy.
            </p>
            <p>
              <span className="text-white">Club information.</span> If you join or
              run a club, contact details you provide (such as name, email, and
              phone) may be visible to that club&apos;s officers so they can
              manage membership.
            </p>
            <p>
              <span className="text-white">Location information.</span> To power
              features like &ldquo;near me&rdquo; events and store discovery, we
              convert addresses you provide into approximate coordinates using a
              geocoding service (OpenStreetMap&apos;s Nominatim).
            </p>
            <p>
              <span className="text-white">Information collected
              automatically.</span> Like most websites, we and our hosting
              providers automatically receive technical data such as your device
              and browser type, IP address, and basic usage logs, and we use
              cookies needed to keep you signed in.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              How we use information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-ocean-300">
              <li>provide, operate, and improve the Service;</li>
              <li>
                process orders, enable payouts, and collect applicable fees;
              </li>
              <li>
                send transactional messages such as order updates and account
                notices;
              </li>
              <li>run community features like profiles, clubs, and events;</li>
              <li>
                keep the Service safe — detecting and preventing fraud, abuse, and
                violations of our Terms; and
              </li>
              <li>comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              How we share information
            </h2>
            <p>
              <span className="text-white">Service providers.</span> We share data
              with the providers that run our platform, only as needed to operate
              the Service: Supabase (database, accounts, and storage), Stripe
              (payments and payouts), Resend (email delivery), Vercel (hosting),
              and OpenStreetMap&apos;s Nominatim (geocoding).
            </p>
            <p>
              <span className="text-white">Other users.</span> Some information is
              public by design — your profile, listings, storefront, and
              community posts can be seen by others. To complete a sale, the
              information needed to fulfill the order (such as a shipping address)
              is shared with the seller.
            </p>
            <p>
              <span className="text-white">Legal and safety.</span> We may
              disclose information if required by law or to protect the rights,
              safety, or property of our users, the public, or Underground
              Aquarium.
            </p>
            <p>
              <span className="text-white">Business transfers.</span> If we are
              involved in a merger, acquisition, or sale of assets, information may
              be transferred as part of that deal.
            </p>
            <p>
              <span className="text-white">We do not sell your personal
              information</span> or share it for cross-context behavioral
              advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Cookies
            </h2>
            <p>
              We use cookies that are necessary to sign you in and keep your
              session active. We do not currently use advertising cookies. If we
              add analytics or other non-essential cookies in the future, we will
              update this policy and provide choices where required.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              How long we keep information
            </h2>
            <p>
              We keep your information for as long as your account is active and
              as needed to provide the Service. We may retain certain records —
              such as completed orders and payout history — for longer when needed
              for legal, tax, accounting, or fraud-prevention purposes, even after
              a listing or account is removed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Your choices and rights
            </h2>
            <p>
              You can review and update much of your information in your account
              settings, and you can request to access, correct, delete, or receive
              a copy of your personal information by emailing us. Depending on
              where you live, you may have additional rights under laws such as the
              California Consumer Privacy Act — including the right to know what we
              collect, to delete it, to correct it, and not to be discriminated
              against for exercising your rights. We will verify and respond to
              requests as the law requires.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Security</h2>
            <p>
              We protect your information with measures such as encrypted
              connections (HTTPS), access controls at the database level, and
              limiting who can reach your data. No method of transmission or
              storage is completely secure, so we cannot guarantee absolute
              security, but we work to protect your information and to respond
              appropriately if a problem occurs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Third-party links
            </h2>
            <p>
              The Service may link to third-party sites and services we do not
              control. Their privacy practices are governed by their own policies,
              and we encourage you to review them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we
              will revise the &ldquo;last updated&rdquo; date above and, for
              material changes, provide additional notice. Continued use of the
              Service after changes take effect means you accept the updated
              policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Contact</h2>
            <p>
              Questions or requests about your privacy? Email us at{" "}
              <span className="text-white">Chris.m.lewis2020@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
