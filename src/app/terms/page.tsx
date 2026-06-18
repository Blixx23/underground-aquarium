import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Underground Aquarium.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
          Legal
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-ocean-400 text-sm mb-10">Last updated: June 16, 2026</p>

        <div className="space-y-8 text-ocean-200 leading-relaxed">
          <section className="space-y-3">
            <p>
              Welcome to Underground Aquarium. By creating an account or using
              the site, you agree to these terms. If you do not agree, please do
              not use the site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Eligibility</h2>
            <p>
              You must be at least 13 years old to use Underground Aquarium. To
              buy or sell in the marketplace, you must be old enough to enter
              into a binding contract where you live (generally 18).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Your account
            </h2>
            <p>
              You are responsible for keeping your login secure and for activity
              that happens under your account. Provide accurate information and
              keep it current.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Content you post
            </h2>
            <p>
              You keep ownership of the content you post — listings, tanks,
              reviews, photos, and so on. By posting it, you give us permission
              to display and distribute it as part of operating the site. You are
              responsible for what you post, and you agree not to post anything
              unlawful, deceptive, infringing, or harmful.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              The marketplace
            </h2>
            <p>
              Underground Aquarium is a venue that connects buyers and sellers.
              We are not a party to transactions between users, and we do not
              guarantee any listing, item, or sale. Sellers are solely
              responsible for their listings, for the legality of what they sell
              (including any rules that apply to shipping plants), and for
              fulfilling their orders.
            </p>
            <p>
              Live animals may not be listed or sold on Underground Aquarium.
              The marketplace is for aquatic plants, equipment, hardscape,
              decor, and other dry goods only.
            </p>
            <p>
              Payments are processed by Stripe. We charge a service fee on
              marketplace transactions, which is disclosed before checkout.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Reviews and store listings
            </h2>
            <p>
              Reviews must reflect a genuine experience. Store owners may claim
              their listing and respond to reviews, but may not post fake reviews
              or remove honest ones. We may edit or remove content that violates
              these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Care information
            </h2>
            <p>
              Our species profiles, tank tools, and other care content are
              provided for general guidance only. They are not a substitute for
              professional or veterinary advice. Always research the specific
              needs of any animal before you keep it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Our content
            </h2>
            <p>
              The site itself — its design, text, logos, and software — belongs
              to Underground Aquarium and may not be copied or reused without
              permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Disclaimers and liability
            </h2>
            <p>
              The site is provided &ldquo;as is&rdquo; without warranties of any
              kind. To the fullest extent allowed by law, Underground Aquarium is
              not liable for any indirect, incidental, or consequential damages
              arising from your use of the site or from transactions between
              users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Termination</h2>
            <p>
              We may suspend or close accounts that violate these terms or that
              create risk for the community.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Changes to these terms
            </h2>
            <p>
              We may update these terms from time to time. When we do, we will
              revise the &ldquo;last updated&rdquo; date above. Continued use of
              the site means you accept the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Governing law
            </h2>
            <p>
              These terms are governed by the laws of the State of{" "}
              <span className="text-white">California</span>, without regard to
              its conflict-of-laws rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Contact</h2>
            <p>
              Questions about these terms? Email us at{" "}
              <span className="text-white">Chris.m.lewis2020@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}