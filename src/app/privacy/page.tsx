import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Underground Aquarium collects, uses, and protects your information.",
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
        <p className="text-ocean-400 text-sm mb-10">Last updated: June 16, 2026</p>

        <div className="space-y-8 text-ocean-200 leading-relaxed">
          <section className="space-y-3">
            <p>
              This policy explains what information Underground Aquarium
              collects, how we use it, and the choices you have. By using the
              site you agree to the practices described here.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Information we collect
            </h2>
            <p>
              <span className="text-white font-medium">Account information.</span>{" "}
              When you sign up we collect your email address and the display name
              or username you choose.
            </p>
            <p>
              <span className="text-white font-medium">Content you create.</span>{" "}
              Listings, saved tanks, reviews, store submissions, comments, and
              similar content you post on the site.
            </p>
            <p>
              <span className="text-white font-medium">Payment information.</span>{" "}
              Purchases are processed by Stripe. We never see or store your full
              card details — Stripe handles that directly and securely.
            </p>
            <p>
              <span className="text-white font-medium">Location.</span> If you
              use the &ldquo;find shops near me&rdquo; feature, your device shares
              your location with your browser to calculate distances. We do not
              receive or store your location — it is used only on your device.
            </p>
            <p>
              <span className="text-white font-medium">Usage data.</span> Like
              most websites, our hosting providers automatically log basic
              technical information such as IP address, browser type, and pages
              visited, to keep the service secure and working.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              How we use your information
            </h2>
            <p>
              We use your information to operate your account, process
              transactions, send you transactional emails (such as order
              confirmations and notifications about your listings), keep the
              site secure, prevent abuse, and improve how it works.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              How we share information
            </h2>
            <p>
              <span className="text-white font-medium">Service providers.</span>{" "}
              We rely on trusted companies to run the site: Supabase (database
              and authentication), Vercel (hosting), Stripe (payments), and
              Resend (email delivery). They only access what they need to provide
              their service.
            </p>
            <p>
              <span className="text-white font-medium">Other users.</span> Some
              of what you post is public by design — your profile name, listings,
              reviews, and shared tanks are visible to other people on the site.
            </p>
            <p>
              <span className="text-white font-medium">Legal reasons.</span> We
              may disclose information if required by law or to protect the
              rights and safety of our users and the public.
            </p>
            <p>We do not sell your personal information.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Cookies</h2>
            <p>
              We use essential cookies to keep you signed in and to keep the site
              functioning. We do not use them for advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Your choices and rights
            </h2>
            <p>
              You can edit or delete content you have posted, and you can request
              deletion of your account and associated data by contacting us.
              Depending on where you live — including California — you may have
              the right to know what personal information we hold, to request its
              deletion, and to not be discriminated against for exercising those
              rights. To make a request, email us at the address below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Children</h2>
            <p>
              Underground Aquarium is not directed to children under 13, and we
              do not knowingly collect personal information from them. If you
              believe a child has provided us information, please contact us and
              we will delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Changes to this policy
            </h2>
            <p>
              We may update this policy from time to time. When we do, we will
              revise the &ldquo;last updated&rdquo; date above.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Contact</h2>
            <p>
              Questions about this policy or your data? Email us at{" "}
              <span className="text-white">[your contact email]</span>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}