import type { Metadata } from "next";
import Link from "next/link";

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
        <p className="text-ocean-400 text-sm mb-10">Last updated: June 20, 2026</p>

        <div className="space-y-8 text-ocean-200 leading-relaxed">
          <section className="space-y-3">
            <p>
              Welcome to Underground Aquarium. These Terms of Service (the
              &ldquo;Terms&rdquo;) are a binding agreement between you and
              Underground Aquarium (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;) covering your use of our website, marketplace,
              and community features (together, the &ldquo;Service&rdquo;). By
              creating an account or using the Service, you agree to these Terms
              and to our{" "}
              <Link href="/privacy" className="text-white hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Eligibility</h2>
            <p>
              You must be at least 18 years old to create an account or use the
              Service. By using Underground Aquarium, you represent that you are
              18 or older and able to enter into a binding contract. The Service
              is not directed to anyone under 18, and we do not knowingly allow
              people under 18 to register.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Your account
            </h2>
            <p>
              You are responsible for keeping your login credentials secure and
              for all activity that happens under your account. Provide accurate
              information, keep it current, and let us know promptly if you
              believe your account has been compromised. You may not share your
              account, create more than one account to evade restrictions, or
              impersonate anyone else.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Acceptable use and community conduct
            </h2>
            <p>
              Underground Aquarium is a community built on good faith. When you
              post, comment, message, or otherwise participate, you agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-ocean-300">
              <li>
                post content that is unlawful, fraudulent, deceptive, infringing,
                defamatory, hateful, harassing, threatening, or sexually explicit;
              </li>
              <li>
                harass, bully, dox, or threaten other members, or incite others
                to do so;
              </li>
              <li>
                spam, advertise off-platform schemes, or post repetitive or
                misleading content;
              </li>
              <li>
                impersonate another person, business, or Underground Aquarium
                itself;
              </li>
              <li>
                attempt to access accounts or data that are not yours, scrape the
                Service, or interfere with its operation or security; or
              </li>
              <li>
                use the Service to break any applicable law or regulation.
              </li>
            </ul>
            <p>
              We may remove content, limit features, or suspend accounts that
              violate these rules or that put the community at risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Content you post
            </h2>
            <p>
              You keep ownership of the content you post — listings, tanks,
              reviews, forum posts, photos, club information, and so on. By
              posting it, you grant us a non-exclusive, worldwide, royalty-free
              license to host, store, display, reproduce, and distribute that
              content as needed to operate and promote the Service. This license
              ends when you delete the content or your account, except for
              content others have already shared or that we must keep for legal
              or record-keeping reasons.
            </p>
            <p>
              You are responsible for the content you post and represent that you
              have the rights to share it. We do not claim ownership of your
              content, and we are not obligated to monitor it, but we may review
              and remove content that violates these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              The marketplace
            </h2>
            <p>
              Underground Aquarium is a venue that connects buyers and sellers.
              We are not the buyer or seller in any transaction, we do not take
              title to any item, and we do not guarantee any listing, item,
              quality, or sale. Sellers are solely responsible for their
              listings, for the accuracy of what they describe, for the legality
              of what they sell (including any rules that apply to shipping live
              plants across state lines), and for fulfilling and shipping their
              orders.
            </p>
            <p>
              Live animals may not be listed or sold on Underground Aquarium. The
              marketplace is for aquatic plants, equipment, hardscape, decor, and
              other dry goods only. We may remove listings and restrict or
              prohibit additional categories of items at our discretion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Buying and selling
            </h2>
            <p>
              When you buy an item, your contract for that item is with the
              seller, not with us. Returns, refunds, and disputes are handled
              between the buyer and the seller; we may help facilitate a
              resolution but we are not obligated to and we are not responsible
              for the outcome.
            </p>
            <p>
              To sell, you must connect a payout account and complete the setup
              steps we require before your listings can go live. You agree to
              describe items honestly, honor your listings, ship promptly, and
              comply with all laws and taxes that apply to your sales. You are
              responsible for determining, collecting, and remitting any taxes on
              your sales.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Fees and payments
            </h2>
            <p>
              Payments are processed by Stripe, and your use of payments is
              subject to Stripe&apos;s terms. We charge a service fee on
              marketplace transactions and a fee on club dues we help collect;
              applicable fees are disclosed before you complete a transaction. We
              may change our fees going forward, and we will give notice of
              material changes. Payouts to sellers and clubs are made through
              Stripe once the applicable conditions are met.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Clubs and dues
            </h2>
            <p>
              Clubs are operated by their own officers and members, not by
              Underground Aquarium. If you run or join a club, you are
              responsible for how you use member information and for following
              your club&apos;s own rules and any laws that apply to it. Dues and
              payments collected through the Service are handled the same way as
              marketplace payments and are subject to the fees described above.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Reviews and store listings
            </h2>
            <p>
              Reviews must reflect a genuine experience. Store owners may claim
              their listing and respond to reviews, but may not post fake reviews,
              offer incentives for reviews, or remove honest ones. We may edit or
              remove content that violates these Terms.
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
              needs of any plant or animal before you keep it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Our content and intellectual property
            </h2>
            <p>
              The Service itself — its design, text, logos, branding, and
              software — belongs to Underground Aquarium and is protected by
              intellectual property laws. You may not copy, modify, distribute,
              or reuse it without our permission. These Terms do not grant you any
              right to our trademarks or branding.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Copyright complaints
            </h2>
            <p>
              We respect intellectual property rights. If you believe content on
              the Service infringes your copyright, email us with a description of
              the work, a link to the infringing content, your contact
              information, and a statement that you have a good-faith belief the
              use is not authorized. We will review and, where appropriate, remove
              the content and may disable repeat infringers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Third-party services
            </h2>
            <p>
              The Service relies on third parties — including Stripe for payments
              and other providers described in our{" "}
              <Link href="/privacy" className="text-white hover:underline">
                Privacy Policy
              </Link>{" "}
              — and may link to third-party sites. Your use of those services is
              governed by their own terms, and we are not responsible for them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Suspension and termination
            </h2>
            <p>
              You may stop using the Service and close your account at any time.
              We may suspend or close accounts that violate these Terms, that
              create risk for the community, or as needed to comply with law.
              Some obligations — including those about content licenses,
              disclaimers, liability, and governing law — survive the end of your
              account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Disclaimers
            </h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, whether express or
              implied, including warranties of merchantability, fitness for a
              particular purpose, and non-infringement. We do not warrant that the
              Service will be uninterrupted, secure, or error-free, or that any
              listing, item, or user is as represented.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Limitation of liability
            </h2>
            <p>
              To the fullest extent allowed by law, Underground Aquarium will not
              be liable for any indirect, incidental, special, consequential, or
              punitive damages, or for any lost profits or data, arising from your
              use of the Service or from transactions between users. To the extent
              we are found liable, our total liability will not exceed the greater
              of the fees you paid us in the twelve months before the claim or one
              hundred U.S. dollars. Some jurisdictions do not allow certain
              limitations, so some of these may not apply to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Underground Aquarium from
              claims, losses, and expenses (including reasonable legal fees)
              arising from your content, your use of the Service, your sales or
              purchases, or your violation of these Terms or of any law or the
              rights of others.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Governing law and disputes
            </h2>
            <p>
              These Terms are governed by the laws of the State of{" "}
              <span className="text-white">California</span>, without regard to
              its conflict-of-laws rules. Before filing any formal claim, you
              agree to first contact us and try to resolve the matter informally.
              Any dispute that cannot be resolved that way will be handled in the
              state or federal courts located in California, and you consent to
              their jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">
              Changes to these Terms
            </h2>
            <p>
              We may update these Terms from time to time. When we do, we will
              revise the &ldquo;last updated&rdquo; date above and, for material
              changes, provide additional notice. Continued use of the Service
              after changes take effect means you accept the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">General</h2>
            <p>
              These Terms, together with the Privacy Policy, are the entire
              agreement between you and us about the Service. If any part is found
              unenforceable, the rest stays in effect. Our not enforcing a
              provision is not a waiver of it. You may not assign these Terms; we
              may assign them in connection with a merger, acquisition, or sale of
              assets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-emerald-400">Contact</h2>
            <p>
              Questions about these Terms? Email us at{" "}
              <span className="text-white">Chris.m.lewis2020@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
