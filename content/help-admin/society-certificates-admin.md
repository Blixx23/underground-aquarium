---
title: Certificates and the registry
category: The Society
summary: How membership, breeder and course certificates are issued, what a registry code means, what /verify shows, legacy codes, the signature image, and how to revoke a certificate.
order: 50
keywords: certificates, certificate registry, registry code, verify, verification, revoke, revoked, reissue, membership certificate, breeder certificate, species certificate, course certificate, UA code, UAS code, legacy code, check character, signature, pdf
pages: /society/certificates, /verify, /verify/[code], /api/society/certificate, /society/logs/[id], /courses/[slug]/certificate
---

Every certificate the site prints carries a registry code, and anyone can check it at [Verify](/verify). Certificates are issued by the database when a member has earned one; there is no admin screen for issuing, reissuing or revoking. Members see their side in [Society certificates](/help/society-certificates), [Verifying a certificate](/help/verifying-a-certificate) and [Course certificates](/help/course-certificates).

## What kinds of certificates are there?
- **Membership**: "Membership, Underground Aquarium Society". Downloaded from the member area's **Certificates** page.
- **Breeder (species)**: "Certified [Species] Breeder", one per species, from the member's first approved spawn log for it. Downloaded from **Certificates** or **Download your breeder certificate** on the approved log.
- **Course**: "Completed the course: [title]", for finishing a course. See [Building and publishing courses](/admin/help/courses-admin).
- **Title** (rank) certificates are retired. Requesting one returns "Title certificates are no longer issued. Breeder certificates are issued per species." Title certificates already issued still verify.

## How is a certificate issued?
A member clicks a download link, which calls /api/society/certificate with the kind (and the spawn log or course). The route:

1. Sends signed-out visitors to Log in.
2. Asks the database to issue the certificate. The database decides whether the member has earned it and hands back the registry record (name, award, code and issue date) to print.
3. Draws a PDF with the recipient's name, member number, award, points (breeder), date of issue, member since year (membership), the code, a link to its verify page, and the signature.
4. Sends the file as a download named after the code, for example UA-B7K2-M9QX-T4P8-Membership.pdf. Adding ?inline=1 shows it in the browser (the course certificate page uses this).

If the database refuses, the member sees the database's message, or "Couldn't issue that certificate." Other errors: "Unknown certificate type.", "Which spawn log?" and "Which course?".

Because the member area is locked behind good standing, a lapsed member can't reach **Certificates** to download until they renew. Verification is never locked.

## Whose signature is on certificates?
"Christopher M. Lewis", as "Founder & Judge" (just "Founder" on course certificates). The route looks for a PNG at /society/signature.png in the site's public files. If it's there, it's used; if not, a typeset script signature is drawn instead. To change the signature, replace that file and redeploy.

## How do registry codes work?
Codes look like UA-B7K2-M9QX-T4P8:

- The first character after UA- is the program letter: **M** Membership, **B** Breeder Award Program, **C** Courses, **P** Professional Certification, **A** Honors & Achievements.
- The next 10 characters are the serial.
- The last character is a check character that catches any single mistyped character and any swap of neighbours.

Codes use letters and digits with no I, L, O or U, so nothing is ambiguous on paper. When someone types a code, O is read as 0 and I or L as 1. Codes are only ever created by the database.

Older certificates carry pre-registry codes like UAS-XXXX-XXXX. These still verify. The record page says "You entered this certificate's original code. It's been renumbered in the registry as [new code]. Both refer to the same certificate."

## What does /verify show?
The [Certificate Registry](/verify) page explains how to read a code, lists the programs and has tips for spotting a fake. Typing a code goes to /verify/[code]:

- **Verified / Authentic certificate**: "Issued by Underground Aquarium and in force today."
- **Revoked / No longer valid**: "This certificate was issued, then revoked on [date]. It should not be relied on."

The record shows Awarded to, Award, Program, Date of issue, Member No. (as UAS-0001 style), Points at issue (breeder and title), Signed by, and Status (Valid, or Revoked with the date), plus when it was checked. "The record on this page is the authority, not the paper."

Problems it can show: "That code has a typo" (check character fails), "Not in the registry" (with the support email), "That isn't a certificate code", or "The registry didn't answer" (a database error, try again).

## How do I revoke a certificate?
**Known issue:** there is no revoke button anywhere. To revoke:

1. In Supabase, open the society certificates table.
2. Find the row by its code.
3. Set its status to revoked and fill in revoked at with the date.

The verify page immediately shows it as revoked, and the member's **Certificates** page marks it "· revoked" next to its registry link. Whether the download link still produces a PDF afterwards is up to the database's issue function, so test it before promising a member anything. Paper already printed can't be recalled, which is why the verify page, not the paper, is the authority.

## How do I reissue or correct a certificate?
There's no reissue button. The name on a certificate comes from the member's record when it was issued. To correct a misspelled name, fix the member's roster name (they can do this under **Your details** on the Society page), then fix the recipient name on the certificate's row in the society certificates table so verification matches. Test a fresh download afterwards to see which name prints.

## When is a breeder certificate earned?
When a judge or peer panel approves a spawn log. The Certificates page lists one certificate per species, using the first approved log for each. Points on the certificate are the points awarded to that log. See [Judging spawn logs and appeals](/admin/help/society-judging-and-appeals).

## Common problems
**A member gets an error instead of a PDF.** The database didn't consider it earned (for example a log that isn't approved), or they're signed out. Check the log's status.

**A member can't find the Certificates page.** Their dues have lapsed, so the member area sends them to renew. See [Society dues, payouts and renewals](/admin/help/society-dues-admin).

**Someone reports a certificate that "isn't in the registry".** Ask for a photo. If the code has a typo the page says so. If it's genuinely missing, it wasn't issued by the site.

**The signature looks typeset instead of handwritten.** The signature image file is missing from the deployed site.
