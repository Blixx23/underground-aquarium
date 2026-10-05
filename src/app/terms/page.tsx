import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Underground Aquarium.",
  alternates: { canonical: "/terms" },
};

// Existing members get 30 days' notice before the new disputes and
// ownership terms reach them; new members agree to them at sign-up.
const UPDATED = "October 4, 2026";
const EXISTING_EFFECTIVE = "November 4, 2026";

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3">
      <h2 className="font-display text-2xl text-emerald-400">{title}</h2>
      {children}
    </section>
  );
}

const List = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-ocean-300">{children}</ul>
);

const Strong = ({ children }: { children: ReactNode }) => (
  <span className="text-white font-semibold">{children}</span>
);

export default function TermsPage() {
  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">Legal</p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">Terms of Service</h1>
        <p className="text-ocean-400 text-sm mb-8">Last updated: {UPDATED}</p>

        {/* A plain summary up top, so the big changes can't be missed. */}
        <div className="mb-10 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5 text-sm leading-relaxed text-ocean-200">
          <p className="mb-2 font-semibold text-amber-200">What changed on {UPDATED}</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Strong>Disputes go to individual arbitration, not court, and not as a class action.</Strong> You
              can opt out within 30 days. See{" "}
              <a href="#arbitration" className="text-white underline">Arbitration</a>.
            </li>
            <li>Claims must be brought within one year.</li>
            <li>Scraping the site and using it to train AI is banned, with set damages for bulk copying.</li>
            <li>Bubbles, trophies, badges and usernames have no cash value and can be changed.</li>
          </ul>
          <p className="mt-3 text-ocean-300">
            New members agree to these Terms when they sign up. For members who joined before {UPDATED}, they
            take effect on {EXISTING_EFFECTIVE}; until then the previous terms apply.
          </p>
        </div>

        <div className="space-y-8 text-ocean-200 leading-relaxed">
          <section className="space-y-3">
            <p>
              Welcome to Underground Aquarium. These Terms of Service (the &ldquo;Terms&rdquo;) are a binding
              agreement between you and Underground Aquarium (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;) covering your use of our website, apps, free classifieds, store directory, Society,
              courses, tools and community features (together, the &ldquo;Service&rdquo;). By creating an account,
              ticking the box at sign-up, or using the Service, you agree to these Terms and to our{" "}
              <Link href="/privacy" className="text-white hover:underline">Privacy Policy</Link>. If you do not
              agree, do not use the Service.
            </p>
            <p className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-4 text-sm">
              <Strong>Please read the Arbitration section.</Strong> It says that, except for a few kinds of
              claims, you and we will resolve disputes through binding individual arbitration instead of in
              court, and that you give up the right to a jury trial and to bring or join a class action. You can
              opt out of it within 30 days.
            </p>
          </section>

          <Section title="Eligibility">
            <p>
              You must be at least 18 years old to create an account or use the Service. By using Underground
              Aquarium, you represent that you are 18 or older and able to enter into a binding contract, and
              that you are not barred from using the Service under any law. The Service is not directed to anyone
              under 18, and we do not knowingly allow people under 18 to register.
            </p>
          </Section>

          <Section title="Your account">
            <p>
              You are responsible for keeping your login secure and for all activity under your account. Provide
              accurate information, keep it current, and tell us promptly if you believe your account has been
              compromised. You may not share or sell your account, create more than one account to evade a
              restriction, or impersonate anyone else.
            </p>
            <p>
              Usernames, profile addresses and shop pages are part of the Service and belong to us, not to you. We
              may change or reclaim a username, for example if it is inactive, misleading, infringes someone&apos;s
              rights, or is needed by the business or person it names.
            </p>
          </Section>

          <Section title="Acceptable use and community conduct">
            <p>
              Underground Aquarium is a community built on good faith. When you post, comment, message, or
              otherwise take part, you agree not to:
            </p>
            <List>
              <li>
                post content that is unlawful, fraudulent, deceptive, infringing, defamatory, hateful, harassing,
                threatening, sexually explicit, or that invades anyone&apos;s privacy;
              </li>
              <li>harass, bully, dox or threaten other members, or encourage others to;</li>
              <li>spam, advertise off-platform schemes, or post repetitive or misleading content;</li>
              <li>impersonate another person, business, or Underground Aquarium itself;</li>
              <li>post fake reviews, or offer or accept anything in exchange for a review;</li>
              <li>
                try to access accounts or data that are not yours, probe or break our security, or interfere
                with how the Service runs;
              </li>
              <li>
                scrape, crawl or copy the Service, or use it to train AI, except as the{" "}
                <a href="#scraping" className="text-white underline">Scraping and AI</a> section allows;
              </li>
              <li>sell, rent or transfer access to the Service or any part of it; or</li>
              <li>use the Service to break any law or regulation.</li>
            </List>
            <p>
              We may remove content, limit features, or suspend or close accounts that break these rules or that
              we believe put the community or us at risk.
            </p>
          </Section>

          <Section id="scraping" title="Scraping and AI">
            <p>
              The store directory, species library, courses, forums and everything else on the Service took a
              great deal of work to build. Unless we agree in writing, you may not use any robot, spider, scraper,
              script, browser extension or other automated means to access, collect, copy or download any part of
              the Service, or use any of it to build a competing service or a dataset, or to train, fine-tune or
              test any artificial intelligence or machine learning model. Public search engines may index the site
              as our robots.txt file allows.
            </p>
            <p>
              Because the harm from bulk copying is real but hard to measure, if you request, view or collect more
              than 10,000 pages or records of the Service in any 24-hour period, in breach of this section, you
              agree to pay us liquidated damages of US$15,000 for every 1,000,000 pages or records (US$0.015 each),
              counted from the first one. Everyone acting together in the breach is jointly responsible. This does
              not limit our right to ask a court to stop the breach, or to recover our actual damages instead where
              the law allows.
            </p>
          </Section>

          <Section title="Content">
            <p>
              &ldquo;Content&rdquo; means anything you put on the Service: photos, videos, listings, tanks, posts,
              comments, reviews, event posts, Society records, award entries, suggestions, messages, and anything
              else you upload or type.
            </p>
            <p>
              <Strong>You are responsible for your Content.</Strong> You are its author, and you are solely responsible for what it says and for any harm it causes. We do not create, check or
              endorse member Content, and we are not obligated to monitor it, although we may review, edit, move,
              convert or remove any Content at any time for any reason, and we are not required to host any of it.
            </p>
          </Section>

          <Section id="ownership" title="Your Content and the license you give us">
            <p>
              <Strong>You keep ownership of your Content.</Strong> But by posting it, you grant Underground Aquarium a
              perpetual, irrevocable, worldwide, non-exclusive, royalty-free, fully paid, transferable and
              sublicensable license to use, copy, store, edit, crop, trim, compress, convert, translate, adapt,
              create derivative works from, publicly display and perform, publish, distribute, license and otherwise
              use it, in any media or format now known or later developed, for any purpose, including commercial,
              advertising and promotional purposes on our site, apps, social media accounts, emails and printed
              materials, and including licensing it to others such as partners and AI developers. When we license
              Content to others, we do not include your email address or other private account details, as our
              Privacy Policy explains.
            </p>
            <p>
              <Strong>Your name and likeness.</Strong> This license includes the right to show your name, username
              and profile photo with your Content and alongside things you do on the Service (such as following a
              shop or earning a trophy), including in promotions of the Service, and to let others (such as our
              service providers, partners and anyone who buys or merges with the Service) do the same.
            </p>
            <p>
              <Strong>After you delete.</Strong> The license continues after you delete Content or close your
              account, although we will generally stop showing Content you delete from public areas of the site
              within a reasonable time. We may keep copies for backups, records and legal reasons.
            </p>
            <p>
              <Strong>Private messages.</Strong> We use private messages only to deliver them, keep the Service safe,
              enforce these Terms and comply with law. We do not publish them.
            </p>
            <p>
              You will not be paid for Content, and to the extent the law allows, you waive any moral rights (such as
              the right to be named as the author or to object to edits) in Content you post. We may credit you where
              we show your Content, but we are not required to. We may also use Content to run, study and improve the
              Service, including building and training tools such as search, species identification and
              recommendations.
            </p>
          </Section>

          <Section id="library-submissions" title="Library submissions: species photos and breeding videos">
            <p>
              Some uploads are made specifically for our species library, such as species photos and breeding videos
              (courtship, spawning, eggs or fry), and suggestions of species or glossary terms. When we accept one of
              these for the library, you assign to Underground Aquarium all of your rights, title and interest in it,
              including the copyright, and you agree that accepting these Terms electronically is your signed
              agreement to that transfer. From then on it belongs to Underground Aquarium, and we can use, change,
              license, sell or remove it however we choose, without paying you or asking you again.
            </p>
            <p>
              We give you back a personal, non-exclusive right to keep your own original files and share them on your
              own personal accounts. You may not license or sell a submission to anyone else after we have accepted
              it. If this assignment is not effective for any reason, you instead grant us an exclusive version of the
              license in the section above. Submissions we turn down are deleted and stay yours.
            </p>
            <p>
              We convert every photo and video to our own format and remove the hidden data phones attach to files,
              such as location. Once a submission is accepted and live, you cannot withdraw it, although we will
              consider any request. We may credit you by name where we show it, and we decide how it is shown.
            </p>
          </Section>

          <Section title="Your promises about Content">
            <p>
              For all Content you post, you promise that you created it or have every right needed to grant the
              rights in these Terms; that library photos and videos were taken by you, of your own animals or
              aquarium; that anyone
              recognizable in it agreed to be shown; and that it does not break any law or anyone else&apos;s
              rights.
            </p>
          </Section>

          <Section title="Feedback and ideas">
            <p>
              If you send us ideas, suggestions or feedback about the Service, they belong to us and we may use them
              freely, without paying or crediting you.
            </p>
          </Section>

          <Section title="Bubbles, trophies, badges and certificates">
            <p>
              Bubbles, tiers, trophies, badges, leaderboard standings, course certificates and similar rewards are
              features of the Service. They have no cash value, cannot be sold, transferred or exchanged for money,
              and are not your property. We may change how they are earned, adjust balances, or remove any of them,
              including to correct mistakes or abuse, at any time.
            </p>
          </Section>

          <Section title="Messages from us">
            <p>
              You agree that we may contact you by email and in-app notifications about your account, your
              activity, security, and changes to the Service or these Terms. You can turn off marketing emails at
              any time; account, security and legal messages are part of using the Service.
            </p>
          </Section>

          <Section title="Classified listings">
            <p>
              Listings on Underground Aquarium are free classified ads. We are a place for members to find each
              other, and we are not the buyer or seller in any deal. We do not process payments, hold funds, arrange
              shipping, verify items, or vet the people you deal with, and we do not guarantee any listing, item,
              or sale. Everything that happens after two people connect here is between them.
            </p>
            <p>
              You agree to describe items honestly, to post only things you actually have and may lawfully sell or
              give away, and to comply with all laws that apply to you, including any rules on keeping, selling, or
              transporting live animals and plants in your state. You are responsible for any taxes on anything you
              sell.
            </p>
            <p>
              Most deals here are local pickup. If you and the other person decide to ship instead, you arrange it
              yourselves and are responsible for following the carrier&apos;s rules, especially for live animals and
              plants.
            </p>
            <p>
              Because no money passes through us, we cannot reverse a payment, recover an item, or mediate a
              dispute. Meet in a public place, inspect livestock before paying, and use your judgment.
            </p>
          </Section>

          <Section title="Live animals and plants">
            <p>
              Fish, invertebrates, coral and aquatic plants may be listed here. Selling and rehoming them is legal in
              the United States, but which species you may keep, sell, transport or release is decided by your
              state, and in some cases your county or city. Those rules differ everywhere and they change.
            </p>
            <p>
              <span className="text-white">Knowing the law where you are is your responsibility, not ours.</span>{" "}
              By posting a listing you confirm you may lawfully possess the species and pass it to someone else,
              that you hold any permit or licence required of you, and that you are not offering anything
              restricted, prohibited, protected or invasive in your state. The same applies to the buyer for their
              own state.
            </p>
            <p>
              We do not inspect listings, verify species, or check anyone&apos;s permits, and nothing here should be
              read as telling you a particular sale is legal. If you are not certain about a species, check with your
              state wildlife or agriculture agency before you post it. Our{" "}
              <Link href="/rules" className="text-white underline">listing rules</Link> list what is never allowed.
            </p>
            <p>
              Never release aquarium livestock or plants into a waterway, storm drain or the wild. Rehome it, or ask
              in the forums and somebody will take it.
            </p>
            <p>
              We may remove any listing at our discretion, including anything we believe is restricted where the
              poster is, anything cruel or neglectful, and anything that misrepresents what is being offered.
            </p>
          </Section>

          <Section title="Dealing with other members: your risk">
            <p>
              Meeting people, trading, and buying or bringing home live animals, plants, equipment and water carry
              real risks, including disease, parasites, pests, injury, property damage, loss of livestock, fraud, and
              the conduct of the people you meet. You take on those risks yourself. We are not responsible for what
              other members, shops, clubs or event organizers say or do, on or off the Service.
            </p>
            <p>
              To the fullest extent the law allows, you release Underground Aquarium and its owners, team members,
              contractors and partners from all claims, demands and damages of every kind, known and unknown,
              arising out of or connected with any dispute you have with another member, shop, club or event, or
              any deal, meeting or item arranged through the Service. If you are a California resident, you waive
              California Civil Code section 1542, which says:{" "}
              <span className="italic text-ocean-300">
                &ldquo;A general release does not extend to claims that the creditor or releasing party does not
                know or suspect to exist in his or her favor at the time of executing the release and that, if known
                by him or her, would have materially affected his or her settlement with the debtor or released
                party.&rdquo;
              </span>{" "}
              You waive any similar law where you live.
            </p>
          </Section>

          <Section title="Fees">
            <p>
              Underground Aquarium is free to use. There is no charge to create an account, to post a listing, to
              browse, or to message anyone, and we take no commission on anything you buy or sell here.
            </p>
            <p>
              The only thing you can pay for on the site is membership dues for the Underground Aquarium Society,
              and joining is optional. Everything described above stays free whether or not you are a member. If we
              ever introduce another paid feature, it will also be optional and we will give notice before it
              applies to you.
            </p>
          </Section>

          <Section title="The Society and membership dues">
            <p>
              The Underground Aquarium Society is operated by Underground Aquarium. Membership is open to anyone with
              an account, subject to approval by a Society officer, and is voluntary.
            </p>
            <p>
              Dues are shown before you pay and are processed by Stripe. Membership runs for the term shown at
              checkout and does not renew automatically unless the checkout says so. Letting a membership lapse does
              not affect your account, your listings, or anything else on the site.
            </p>
            <p>
              Award program entries, titles, and standings are records the Society keeps. Officers may correct or
              remove an entry that doesn&apos;t meet the program rules.
            </p>
          </Section>

          <Section title="Reviews and store listings">
            <p>
              Reviews must reflect a genuine experience. Store owners may claim their listing and respond to
              reviews, but may not post fake reviews, offer incentives for reviews, or remove honest ones. Store pages
              are part of the Service: we decide what appears on them, a shop may be listed whether or not its
              owner claims it, and we may keep a shop&apos;s page up, unclaimed and open to reviews. We may edit or
              remove content that violates these Terms.
            </p>
          </Section>

          <Section title="Care information">
            <p>
              Our species profiles, courses, Tank Builder, Water Check and other care content are general guidance
              only. They may be incomplete or wrong for your situation and are not a substitute for professional or
              veterinary advice. Always research the specific needs of any plant or animal before you keep it, and
              you are responsible for the decisions you make about your animals.
            </p>
          </Section>

          <Section title="Our content and intellectual property">
            <p>
              The Service itself, including its design, text, courses, species library, store directory, data,
              logos, branding and software, and library submissions we own, belongs to Underground Aquarium and is protected
              by intellectual property laws. You may not copy, modify, distribute, sell or reuse it without our
              written permission. These Terms do not grant you any right to our trademarks or branding.
            </p>
          </Section>

          <Section title="Copyright complaints">
            <p>
              We respect intellectual property rights and respond to notices under the Digital Millennium Copyright
              Act. If you believe content on the Service infringes your copyright, email{" "}
              <span className="text-white">support@undergroundaquarium.com</span> with: your physical or electronic
              signature; a description of the work; a link to the content you say infringes it; your name, address,
              phone number and email; a statement that you have a good-faith belief the use is not authorized by the
              owner, its agent or the law; and a statement, under penalty of perjury, that your notice is accurate
              and that you are the owner or authorized to act for the owner. Members whose content is removed may
              send a counter-notice. We disable the accounts of repeat infringers.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>
              The Service relies on third parties, including Stripe for Society dues payments, Google for optional
              Google sign-in, and other providers described in our{" "}
              <Link href="/privacy" className="text-white hover:underline">Privacy Policy</Link>. Your use of those
              services is governed by their own terms, and we are not responsible for them.
            </p>
          </Section>

          <Section title="Suspension and termination">
            <p>
              You may stop using the Service and close your account at any time. We may suspend or close any account,
              remove any Content, limit any feature, or change or stop offering any part of the Service, at any time
              and for any reason or no reason, with or without notice, including for violating these Terms, creating
              risk for the community or us, or complying with law. We are not liable to you for doing so.
            </p>
            <p>
              The sections on content licenses, library submissions, feedback, scraping, your risk and release,
              disclaimers, limitation of liability, indemnification, arbitration, governing law, and anything else
              that by its nature should continue, survive the end of your account.
            </p>
          </Section>

          <Section title="Disclaimers">
            <p className="uppercase text-sm tracking-wide">
              The Service and all content on it are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
              without warranties of any kind, express or implied, including warranties of merchantability, fitness
              for a particular purpose, title, accuracy and non-infringement. We do not warrant that the Service will
              be uninterrupted, secure or error-free, that content will be kept or not lost, or that any listing,
              item, shop, review, care information or member is accurate, safe, legal or as represented.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p className="uppercase text-sm tracking-wide">
              To the fullest extent allowed by law, Underground Aquarium and its owners, team members, contractors
              and partners will not be liable for any indirect, incidental, special, consequential, exemplary or
              punitive damages, or for any loss of profits, revenue, data, goodwill, livestock or plants, arising out
              of or relating to these Terms, the Service, any content, or any dealings between users, even if we were
              told they were possible. Our total liability for all claims arising out of or relating to these Terms or
              the Service will not exceed the greater of the amount you paid us in the twelve months before the claim
              or one hundred U.S. dollars (US$100).
            </p>
            <p className="text-sm">
              Some places do not allow some of these limits, so some may not apply to you. Nothing in these Terms
              limits liability that cannot be limited by law.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to defend, indemnify and hold harmless Underground Aquarium and its owners, team members,
              contractors and partners from all claims, losses, damages, liabilities and expenses (including
              reasonable legal fees) arising out of or relating to your Content, your use of the Service, any deal or
              meeting with another member, or your violation of these Terms, any law, or the rights of others. We may
              take over the defense of any such claim, and you will cooperate with us.
            </p>
          </Section>

          <Section title="Time limit to bring a claim">
            <p>
              To the fullest extent the law allows, any claim you have arising out of or relating to these Terms or
              the Service must be filed within one year after it arises. Otherwise it is permanently barred.
            </p>
          </Section>

          <Section id="arbitration" title="Arbitration and class action waiver">
            <p>
              <Strong>Try to work it out first.</Strong> Before starting any formal claim, you and we each agree to
              send the other a written notice describing the dispute and the relief wanted (ours to the email on your
              account; yours to support@undergroundaquarium.com, including your username and email), and to try in
              good faith to resolve it informally for 60 days. Time limits are paused during those 60 days.
            </p>
            <p>
              <Strong>Binding individual arbitration.</Strong> If it isn&apos;t resolved, any dispute, claim or
              controversy between you and Underground Aquarium arising out of or relating to these Terms or the
              Service, including whether this section applies or can be enforced, will be decided by binding
              individual arbitration, not in court, except for the claims listed below. The Federal Arbitration Act
              governs this section. The arbitration will be run by the American Arbitration Association (AAA) under
              its Consumer Arbitration Rules, by one arbitrator, by video or phone or in the county where you live,
              or on written submissions if the claim is US$10,000 or less. Fees are paid as the AAA rules require.
              The arbitrator may award the same individual relief a court could, but only to you individually.
            </p>
            <p>
              <Strong>What stays out of arbitration.</Strong> Either of us may bring an individual claim in small
              claims court if it qualifies. Either of us may go to court over the infringement or misuse of
              intellectual property, or over scraping, hacking or unauthorized access to the Service, including to ask
              for an order stopping it.
            </p>
            <p>
              <Strong>No class actions and no jury.</Strong> You and we each may bring claims against the other only
              in an individual capacity, and not as a plaintiff or class member in any class, collective, mass or
              representative proceeding. The arbitrator may not combine more than one person&apos;s claims. You and we
              each give up the right to a jury trial.
            </p>
            <p>
              <Strong>Many similar claims.</Strong> If 25 or more similar demands are filed against us by or with the
              help of the same lawyers or organizations, they will be handled in batches of up to 25, with one
              arbitrator per batch, and the rest paused until each batch is done. Neither side may be charged
              arbitration fees for a batch that hasn&apos;t started.
            </p>
            <p>
              <Strong>Public injunctions.</Strong> A request for public injunctive relief, if the law where you live
              does not allow it to be waived, will be decided by a court after the individual arbitration is
              finished, and is paused until then.
            </p>
            <p>
              <Strong>Opt out within 30 days.</Strong> You can reject this Arbitration section by emailing
              support@undergroundaquarium.com, from the email on your account, with the subject &ldquo;Arbitration
              opt-out&rdquo; and your username, within 30 days after you first become bound by it. Opting out does
              not affect the rest of these Terms.
            </p>
            <p>
              <Strong>If part of this fails.</Strong> If the class action waiver is found unenforceable for a claim,
              that claim goes to the courts named below, not to arbitration. If any other part of this section is
              found unenforceable, the rest still applies. If we change this section, the change won&apos;t apply to a
              dispute you already told us about.
            </p>
          </Section>

          <Section title="Governing law and courts">
            <p>
              These Terms and any dispute are governed by the Federal Arbitration Act and the laws of the State of{" "}
              <span className="text-white">California</span>, without regard to conflict-of-laws rules. Any claim
              that is not arbitrated will be decided only in the state courts in Placer County, California, or the
              federal court for the Eastern District of California, and you and we consent to their jurisdiction.
            </p>
          </Section>

          <Section title="Changes to these Terms">
            <p>
              We may update these Terms from time to time. When we do, we will change the &ldquo;last updated&rdquo;
              date above and, for material changes, tell you with an in-app notification or email before they apply
              to you. Continued use of the Service after changes take effect means you accept the updated Terms. If
              you don&apos;t agree, stop using the Service and close your account.
            </p>
          </Section>

          <Section title="General">
            <p>
              These Terms, together with the Privacy Policy and the rules linked from them, are the entire agreement
              between you and us about the Service. If any part is found unenforceable, it will be enforced as far as
              possible and the rest stays in effect. Our not enforcing a provision is not a waiver of it. You may not
              assign or transfer these Terms; we may assign them, and anything we own under them, to anyone,
              including in a merger, acquisition or sale of assets. We are not responsible for delays or failures
              caused by things beyond our reasonable control. No one else has any rights under these Terms. Section
              headings are for convenience only.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these Terms, legal notices, copyright notices and arbitration opt-outs:{" "}
              <span className="text-white">support@undergroundaquarium.com</span>.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
