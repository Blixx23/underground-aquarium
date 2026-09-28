---
title: Society applications and invites
category: The Society
summary: How Society applications arrive, what's on each request card, what Approve and Decline do and send, and how email invite links at /join work (and don't).
order: 20
keywords: society applications, join requests, member requests, approve member, decline member, pending members, application form, invite, invite link, join token, /join, accept invite, welcome email, approval email
pages: /c/[slug]/admin, /c/[slug], /society, /join/[token]
---

People join the Society by applying on its page. Officers approve or decline each application on the Society admin page. There's also an older invite link system at /join. Members see the applicant side in [Joining the Society](/help/joining-the-society).

## How does someone apply?
On the Society page (/c/underground-aquarium-society, reached from [/society](/society)) a signed-in visitor fills in **Apply for membership**: **Name**, **Phone**, **Mailing address** (with a 5-digit ZIP), **Membership** (Individual with its yearly price, and Lifetime with its one-time price if one is set), **Experience**, **Main interests**, **How did you hear about us? (optional)** and **Note to the Society officers (optional)**.

Submitting creates their roster row with the status pending and saves their answers in the club member details table. They then see "Application received" and a **Withdraw application** button.

## Where do I see waiting applications?
- The **Society** card on the [Dashboard](/admin) and the **Society** item in the admin menu show the number waiting.
- On the Society admin page a **Member requests** tile appears ("Applications awaiting your approval") with the same count. It's hidden when nobody is waiting.

Open the tile to see **Join requests (N)**.

The admin screens don't send officers an email when an application arrives. Watch the Dashboard count.

## What's on each request card?
- The applicant's name (or @username, or email) and the plan they chose, for example "· individual" or "· lifetime".
- Email, Phone, Address, Experience, Interests and "Heard about us", each only when filled in.
- Their note, in quotes.
- **Approve** and **Decline**.

## What happens when I press Approve?
1. The database approves them: their status changes from pending to prospect (if they owe dues) or active, and the database sends its own in-app notice.
2. The site emails them. What the email says depends on dues:
   - **The Society charges dues for their plan:** subject "You're approved for the Underground Aquarium Society. One step left.", showing their plan (Individual, 1 year, or Lifetime) and amount, with a **Pay $X and activate** button to the Society page.
   - **No dues:** subject "Welcome to the Underground Aquarium Society", saying their membership is active, with **Enter the member area**.
3. The page refreshes and they move into the roster.

If the email fails, the approval still stands (the email is best effort and no error is shown). Check [Email queue and health](/admin/help/email-queue-and-health).

After approval, a prospect pays on the Society page. Payment makes them active; see [Society dues admin](/admin/help/society-dues-admin). Applicants who haven't been approved can't pay: checkout answers "Apply to join first. Dues open up once you're approved."

## What happens when I press Decline?
Confirm "Decline [name]'s request to join? They'll get a short, kind note saying they're welcome to apply again." Then:

1. The site looks up where to reach them, then deletes their roster row and application.
2. They get an in-app notice "About your Underground Aquarium Society application": "Thanks for applying. We couldn't approve it this time, but you're welcome to apply again.", linking to the Society page.
3. They get a short email with the same subject, saying the application wasn't approved this time, that they're welcome to apply again, and that their account, classifieds and tools keep working. It has an **Apply again** button to the Society page. It is ordinary (not marketing) mail, so an unsubscribe from outreach doesn't block it.

The note doesn't give a reason. If you want them to know why, contact them yourself (their email and phone are on the card, so note them before declining). Only owners, admins and officers can decline, and only an application that is still pending; a second press shows "That application was already handled." If the notice or email fails, the decline still stands.

## Can an applicant withdraw?
Yes. **Withdraw application** on the Society page asks "Withdraw your application to Underground Aquarium Society? You can apply again any time.", removes their pending row, and sends them to /society. The request disappears from your list.

## What if an application needs a different plan?
Approve it, then change the **Plan** dropdown on their roster row. See [Running the Society admin page](/admin/help/society-admin).

## How do invite links work?
An invite is a one-time token that opens /join/[token]:

- Signed out, the page shows "You're invited to a club", "Sign in or create an account to accept your invitation.", **Log in** and **Create account**, and "After signing in, open this invite link again to finish joining."
- Signed in, it shows "Checking your invite…" then "Joining the club…". The database accepts the invite and adds them to the Society, the page links any hand-added roster rows with the same email, and sends them to the Society page.
- A used or bad token shows **Invite problem** with the database's message, or "This invite is no longer valid.", and a **Go home** button.

Invite pages are hidden from search engines.

## How do I send an invite?
**Known issue:** you can't from any screen. The server route that creates an invite and emails it ("You're invited to join Underground Aquarium Society", with a **Join the club** button) still exists, but nothing in the admin page calls it. The Club settings text "Members can still join with an invite link in the meantime" refers to that missing feature.

What to do instead:
- Point people to [/society](/society) to apply, then approve them.
- Or add them yourself with **Add a member** on the admin page. If you enter their email, their roster row links to their account when they sign up or sign in with that same email.

## Why doesn't Log in bring an invitee back to the invite?
**Known issue:** the **Log in** and **Create account** buttons on /join don't carry the invite address, so after signing in the person lands on their feed. They must open the invite link again. The page tells them so.

## Common problems
**The Dashboard says 1 waiting but I don't see Member requests.** The count is for the Society only. Make sure you're on /c/underground-aquarium-society/admin and reload.

**"Couldn't approve." or a database message under Join requests.** The approval didn't happen. Usually a permission rule (your role isn't officer or higher). Nothing was emailed.

**An approved member says they never got the email.** Check [Email queue and health](/admin/help/email-queue-and-health). They can pay any time from the Society page.

