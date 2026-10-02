# Public Chapter Page & QR Sign-ups

> Your chapter's public "front door" on Marshbeat: a polished web page anyone can visit, plus printable QR codes people scan at the banquet, a booth, or on a flyer to get involved, get banquet alerts, or register for an event. This guide is for chapter officers who set these up — and it explains exactly what a public visitor sees and what happens after they hit "send."

---

## Overview

Every chapter on Marshbeat gets a **public page** — a mobile-friendly landing page that shows off your banquet, upcoming events, leadership, and how to get involved. It needs no login, no app, and no Marshbeat account for the person visiting.

Off that page hang three things a visitor can do on their own:

- **Get Involved / Join the committee** — leave their info so an officer follows up.
- **Banquet alerts** — get on the list for banquet date, tickets, and updates.
- **Register for an event** — reserve a spot at a specific event (for events you run registration on), for themselves or for a whole family in one go.

To get people to those forms in the real world, Marshbeat generates **QR codes and printable flyers**. Someone points their phone camera at the code and the right page opens instantly — no typing a long web address.

There are two sides to this feature:

- **The public side** — what any visitor sees and fills out. Anonymous, open to the world.
- **The officer side** — a page in your dashboard (the **Promote** tab) where you grab links, generate QR codes, and print flyers. Login required.

---

## Your public chapter page (what visitors see; how the web address works)

### The web address (your "slug")

Your public page lives at a web address built from your chapter's **slug** — a short, custom URL you choose once.

- If Marshbeat is set up with a root domain, your page is a clean subdomain like **`rivercity.marshbeat.com`**.
- Otherwise it falls back to a path like **`marshbeat.com/c/rivercity`**.

You set the slug in **Settings → Web address** (the "Custom URL" field). Rules the app enforces:

- 3–40 characters, lowercase letters, numbers, and hyphens only (spaces and other characters are stripped as you type).
- Certain names are **reserved** and can't be claimed (e.g. `www`, `app`, `api`, `admin`, `login`, `signup`, `register`, `chapter`, `settings`, `help`, `terms`, `privacy`, and similar system words).
- It must be globally unique — if another chapter already took it, you'll be asked to pick another.

**Important: the slug is set once and then locked.** After you save it, the settings screen shows it as a **"Permanent address"** with the date it was set, and it can't be changed. This is deliberate — printed QR codes and flyers point at this address forever, so it must never move out from under them.

**Renames are handled safely.** If a slug ever does change, Marshbeat keeps a history of old slugs and automatically redirects an old address to the current one. So even an old printed code keeps working — it just forwards to the new page. (This applies to the main page, the `/join` page, and the `/banquet-alerts` page.)

You **must set a slug before you can generate QR codes.** If you haven't, the Promote page tells you to go to Settings and choose your public link first.

### What's on the page

The public page is assembled automatically from data you already keep in Marshbeat — you don't build it by hand. Sections appear only when there's content for them:

- **Hero banner** — your chapter name, region ("… Region" if set), the "Delta Waterfowl — The Duck Hunters Organization" tagline, an optional background **hero image**, and a big **Get Involved** button. If tickets for your next banquet are live, a "Tickets are live →" link shows here too.
- **The banquet (the main event)** — your next banquet is featured front and center with a date block, venue/location, a short description of the night (dinner, auctions, raffles, guns), a **Get Tickets** button (when a tickets link is set — otherwise "Tickets open soon"), and a **Become a Sponsor** button. If no banquet is scheduled yet, this becomes a "Our next banquet is on the way" block with a **Get on the list** button instead.
- **Upcoming events** ("Mark your calendar") — up to four upcoming events and meetings, sorted by date. Events link through to their own public page (see below); meetings show as plain cards with their venue (they have no public page).

  **What never appears here:** an event still in **Draft**, an event marked **private**, and a **cancelled meeting**. All three were wrong until v2.32 — a draft event was publicly listed despite the guides promising otherwise, and calling a meeting off left it advertised as upcoming. Meeting venues never showed either, because the public function returned the venue under the wrong column name. Fixed in migration 0074.
- **Banquet Sponsors** ("<year> Banquet Sponsors — Thank you for making it all possible") — the **Sold** sponsors from your most recent banquet, as a grid of their logos on matching cards, each linked to the sponsor's website when you've added one. Sponsors without a logo yet are thanked by name. It appears on the day of the banquet and stays until your next banquet's day, then switches over by itself. Add logos from **Manage buyers** on the banquet's tables (see the Events & Banquets guide).
- **Chapter Leadership** — your Regional Director (with title and region) plus officer cards (Chairman, Vice Chairman, Treasurer, Secretary) shown with initials avatars.
- **Get Involved** ("Put your boots in the marsh") — another entry point to the join form.
- **About + What Delta does** — your chapter's "About" text (if you've written one) plus a fixed set of Delta program blurbs (Duck Production, HunteR3, Waterfowl Heritage Fund, Research & Habitat).
- **Footer** — chapter name, region, and any social links you've added (Website, Facebook, Instagram), plus "Powered by Marshbeat" and Terms/Privacy links.

**Times always render in your chapter's time zone**, not the visitor's — so a 6:00 PM banquet reads 6:00 PM to everyone. The page reads live data (no caching), so a date or time you edit in the dashboard shows up on the public page immediately.

**Sharing looks good too.** When someone shares your page (or an event page) in a text or on Facebook, Marshbeat generates a rich preview card with your name, description, and image — not a generic link. Event pages even get an auto-generated branded share image with the event's name, date, and venue.

---

## The sign-up forms (join / get involved, and banquet alerts) — what each collects and where it goes

There are two "lead" forms a visitor can use. Both are short, both work on a phone, and both confirm success on screen.

### Get Involved / Join the committee

Reached from the **Get Involved** buttons on the main page, or from the standalone **`/join`** page (the target of the "Join the committee" QR code).

**What it collects:**

- **Name** (required)
- **Email**
- **Phone**

At least one of email or phone is required so the chapter can reach the person. (The name-only version on the main page opens as a pop-up "Come hang with us." / "Join the committee." card; the standalone `/join` page is a full-screen version.)

**Where it goes:** the person is saved as a **lead** in your chapter (kind: *join*). Your **Chairman and Vice Chairman get an email** so someone can follow up — subject line "New recruit / get-involved." (Treasurer and Secretary are intentionally not emailed.) Your **Regional Director is copied** too.

### Become a Sponsor

A variant of the join form, reached from the **Become a Sponsor** button in the banquet section. Same fields plus a **message/business details** box ("Tell us about your business…").

**Where it goes:** saved as a **sponsor** lead. Same notification — Chairman, Vice Chairman, and RD are emailed, labeled "Gun of the Year sponsor interest."

### Banquet alerts

Reached from the standalone **`/banquet-alerts`** page (the target of the "Banquet alerts" QR code), and from "Get on the list" when no banquet is scheduled yet.

**What it collects:**

- **Name** (required)
- **Email**
- **Phone** (optional)

The form promises "no spam, just the good stuff" and notes visitors can unsubscribe anytime.

**Where it goes:** saved as a **contact/lead** and **automatically added to your banquet email countdown** (the pre-banquet email series). Because these can arrive in bulk — think a whole table scanning a code at an event — **banquet-alert sign-ups do NOT email your officers.** They quietly join the list.

### After they submit

Every form shows a friendly confirmation on the spot — e.g. "You're on the list!" or "Thanks for stepping up!" with your chapter's name — so the visitor knows it worked. No account, no password, nothing to install.

---

## QR codes & printable flyers (how to generate and use them)

Everything here lives on the **Promote** tab of your chapter dashboard (route: **Sign-up links & QR codes**). You must be logged in, and your chapter must have a slug set.

### The three codes

Marshbeat generates three ready-to-use QR codes, each pointing at a permanent link:

| Card | Where it points | Best for |
|---|---|---|
| **Chapter page** | your main public page | Banners, business cards, table tents — the all-purpose one |
| **Banquet alerts** | the `/banquet-alerts` form | Getting people on the banquet list; sign-ups auto-join the email countdown |
| **Join the committee** | the `/join` form | Recruiting volunteers; Chairman & Vice Chairman get emailed |

Each is a **Delta-branded QR code** — navy modules with the Delta duck-and-triangle mark in the center — rendered at high error-correction so it still scans reliably with the logo overlaid.

### What you can do with each code

For every card you get:

- **The link, shown in plain text**, with a **Copy link** button (paste it into an email, a Facebook post, a text).
- **Download** — saves the code as an **SVG** file (named like `river-city-chapter-join-qr.svg`), which stays crisp at any print size.
- **Print this code** — opens a clean, standalone **flyer** for just that code and sends it to your printer.

### Printing flyers

Two ways to print:

- **Print codes** (top of the page) opens a picker so you **choose which codes to print** (all selected by default). Each selected code comes out as **its own full-page flyer**.
- **Print this code** on any card prints just that one.

Each flyer is a self-contained, nicely designed page: an accent band, your chapter name eyebrow ("… · Delta Waterfowl"), a big headline ("Scan to visit us" / "Get banquet updates" / "Get involved"), a short tagline, the framed QR code, a "Point your phone camera at the code — it opens right up, no app, no typing" how-to, and the link on a pill. None of the app's sidebar or menus come along — it's built as a fresh print document so it never "prints funny."

**To make a PDF** (to email to a print shop or save), choose **"Save as PDF"** in your browser's print dialog.

### Why the links are safe to print

The links never change (the slug is permanent), so **a printed code keeps working forever.** And if a slug is ever renamed, old codes redirect to the new page automatically. Print with confidence.

---

## Public event pages & registration

Individual events get their own **public page** — the link people share and the target of an event's QR/share link.

- **Main page → Upcoming events → an event card** links to `…/event/<event-id>`.
- The event page shows a hero (event vs. banquet label + chapter), the date/time (in your chapter's time zone), multi-day schedules when applicable, venue with a **Map** link, a description (rich text supported), and the right primary action.

**What the primary action is depends on how the event is set up:**

- **Built-in registration** — the event page runs registration itself. It shows a **"X of Y spots filled"** progress bar and a **Register** button that opens a registration form right on the page. If it's full or closed, it says so plainly instead of showing the button.
- **External link / tickets** — shows a **Buy tickets** or **Sign up** button that opens your external link in a new tab.
- **Banquets never use built-in registration** — banquet tickets always go through the external tickets link (Delta's ticketing), never Marshbeat's own form.

There's also a dedicated **`/register/<event-id>`** page — the target of an event's shareable registration link/QR — that opens straight to the registration form when registration is open, or shows a clean "Registration is full / closed" message otherwise.

### The registration form

Unlike the join and banquet forms, **event registration is not saved as a lead** — it's attached to that one event only.

The form has a nice touch for youth events: a **"Who are you registering?"** toggle — **Myself** or **A child (under 18)**.

- **Registering yourself:** your **name** (required), **email** (required — "event updates and reminders are sent here"), **phone** (optional), and an optional "anything the chapter should know?" note.
- **Registering a child:** the **child's name**, plus a **parent/guardian** block — parent name, **parent email** (required), and parent phone. Updates go to the parent.

### Signing up more than one person

Under the first name there's a quiet link: **"+ Add someone else"** (or **"+ Add another child"** on the child path). Press it and another name box appears, with an **×** to take it back off. Up to **ten people** can go on one submission.

This is the ordinary case at a chapter event and it used to take a family four separate trips through the form:

- **One contact block covers everybody.** The email and phone are asked for once, and the hint under the email updates to read *"Event updates and reminders are sent here — one email covers everyone above."*
- **On the child path, the extra names are the other children** — the parent block is filled in once and applies to all of them.
- **Everyone gets their own row on the roster**, so check-in on the night is per person, not per family.
- **One confirmation email**, not one per person. It's the same template used for a single sign-up: the headline reads *"3 spots are saved"* instead of *"Your spot is saved,"* and a roster line listing the names appears only when there's more than one. There is no separate "group" template to keep in step.
- **The confirmation on screen** reads *"All 3 are registered!"* — *"See you at Youth Hunters Education. River City has 3 spots saved."*

**If the event fills up part way through a family**, Marshbeat saves as many as it can and tells you exactly where you stand: *"2 of 4 registered — Youth Hunters Education filled up while you were signing up, so we saved the first 2 spots. Reach out to a River City officer about the rest."* A bare "full" would read as though nobody got in.

### Registering twice by accident

Pressing **Reserve my spot** a second time because nothing looked like it happened is the single most common way duplicates got created — every real duplicate in production was a repeat *tap* seconds apart, not a repeat decision. Three things stop it now:

1. **The button locks the instant it's pressed**, before anything is sent, and reads *"Saving your spot…"* A second tap does nothing.
2. **A matching live registration returns the original success.** If the same name and the same contact address are already registered for that event, the form shows *"You're registered!"* rather than an error — because from the visitor's side, they are.
3. **The database refuses a duplicate outright** as a last line of defence, keyed on the event, the contact address, and the name.

**Two children in one family are not a duplicate.** The key includes the name, so siblings signed up under one parent's email both go through — an earlier guard keyed on email alone would have refused the second child, which is worse than the bug it fixed. And because the guard only looks at *live* registrations, someone who cancelled can always sign up again.

Note that on the child path the contact address lives in the *parent's* email field and the registrant's own email is blank — which is exactly why every guard that keyed on "email" quietly did nothing there. Marshbeat now resolves one **contact email** for a registrant (their own, or the parent's when they're a child) and uses that single definition everywhere: for dedupe, for throttling, and for the confirmation.

### When it's full: the waiting list

A full event now offers a **waiting list** rather than a dead end. The Register button becomes **Join the waiting list**, and the form mirrors the registration one — the same *Myself / A child (under 18)* toggle, the same contact block. An email address is required, because it's the only way anyone can be told a spot opened.

They get a "you're on the list" confirmation. **It deliberately doesn't give them a number in the queue** — a place in line only means something if the line is worked through in order, and this one isn't: when a seat frees, everyone is emailed at once. Telling somebody they're third would promise two people first refusal, which is exactly what won't happen. One place per person; the "+ Add someone else" grouping that registration offers isn't here, because a group holding one place makes a single freed seat unanswerable.

**When a seat frees** — somebody cancels, or the chapter adds capacity — **everyone waiting is emailed at once**, with a link straight to the form. First come, first served, and the email says so. Anyone who misses out keeps their place for next time and is told so on the spot rather than being invited to join a list they're already on.

**The link opens their details already filled in.** Name, email, phone, the Myself / A child toggle and the parent block all come back from what they typed when they joined the list, so claiming is one button — **Confirm my spot** — not a form race against everyone else who got the same email. Clicking the link doesn't register them by itself; email scanners follow links, and a link that booked a seat on being fetched would give seats away to software. The click opens the page; the button takes the spot.

**The details are theirs to change.** Nothing is locked — a phone number that's moved on, a personal address instead of a work one, or a different child than the one originally listed all go through, and what they submit is what gets registered. Their place on the list is closed out either way, because the link identifies the row rather than guessing from the name.

**One claim, one place.** The *"+ Add someone else"* option that ordinary registration offers isn't there on a claim link — the waiting list holds one place per person, and a claim that could carry a family would let whoever opened their email first take every held seat. Anyone bringing extra people should call the chapter.

**For 24 hours that seat belongs to the waiting list.** The public page keeps saying "Registration is full" and only a link from a waiting-list email can claim it. Someone arriving from the public page during that window is told the spots are being held. After a day, anything unclaimed reopens to everyone.

### Capacity, and what a cancellation frees

The **"X of Y spots filled"** bar, the **Register** button, and the check made at the moment you press it all count **live registrations only**. A registration an officer cancelled is not an attendee and does not hold a seat — cancel one and the seat is genuinely available again.

This was wrong until Aug 2026 and it mattered: River City's Youth Hunters Education page showed *"14 of 20 spots filled · 6 spots left"* and, directly beneath it, *"Registration is full."* Six real families were being turned away from an event with room, because the gate was counting every row ever created — duplicates, cancellations and all. All three places that ask "is this full?" now agree; fixing fewer would have meant a visitor seeing an open form and being refused when they pressed the button.

### On success

On success it confirms **"You're registered!"** (or "All N are registered!"). If capacity filled while they were typing, it says **"Just filled up"** and points them to a chapter officer for a waitlist. Capacity, open/closed status, and full-detection are all enforced on the server — a visitor can't sneak past a full or closed event.

### Who gets notified for a registration

On a successful **built-in** registration:

- The **registrant (or the parent/guardian)** gets a **confirmation email** — one email covering everyone on the submission.
- Your **full officer list plus the RD** get a **"new registration" alert**.

(This is broader than the join form, which only pings Chairman + Vice Chairman.)

---

## What happens behind the scenes (leads created, officers/RD notified, honeypot/rate limiting)

**Leads and records:**

- **Join / Get Involved** → a lead (kind *join*).
- **Sponsor** → a lead (kind *sponsor*), with the business details in the message.
- **Banquet alerts** → a contact/lead added to the banquet email countdown; internally recorded as a *join* with a note ("Signed up for banquet alerts (public form / QR code)") so your leads list shows the real intent.
- **Event registration** → one row per person on the event's registration list only — **not** a lead.

**Notifications** (all best-effort — a mail hiccup never blocks the visitor's confirmation, because the record is already saved):

- Join / Sponsor → Chairman + Vice Chairman + RD.
- Banquet alerts → nobody is pinged (by design — these arrive in bulk).
- Event registration → the registrant/parent (one confirmation) + full officer list + RD (alert).

**Spam protection.** Because these forms are open to the anonymous internet, Marshbeat defends them two ways:

- **Honeypot** — every form has a hidden field (off-screen, skipped by keyboard tab) that only an automated bot would fill in. If it's filled, Marshbeat silently reports success and writes nothing — so the bot gets no signal it was caught, and no junk lead is created.
- **Rate limiting — keyed on the person, not on the building.** The limit that actually bites counts **the same person (their IP *and* their email) at 3 submissions per 10 minutes**. Behind that sit two backstops that only a script should ever meet: **60 submissions per IP per 10 minutes** and **120 per chapter page per hour**. A real person hitting the person-limit sees "You've sent this a few times already — please wait a bit and try again."

  This changed for a reason worth knowing if you run banquets. The old ceiling was 5 submissions per IP per 10 minutes — fine for someone at home, and wrong exactly where it mattered: at a banquet the whole room is behind the venue's wifi, so every guest shares one address, and the sixth person to sign up in ten minutes was refused at the event you built the form for. Keying on ip + email stops somebody hammering the button while letting a whole room through, because their addresses differ.

  A **group registration is one submission**, throttled once, not once per person on it — a family of four is a single act by a single visitor.

  Being throttled is also **not** reported as an application error any more. It's the system working as designed; every throttled visitor used to open a fresh issue in error tracking.

Basic input validation runs too: email addresses are format-checked (a bad address would become a bounce and hurt sending reputation), and every field has a length ceiling.

---

## Permissions (public vs officer)

**Anyone (no login):**

- View your public chapter page, event pages, and the standalone `/join` and `/banquet-alerts` pages.
- Submit the join, sponsor, banquet-alert, and event-registration forms — the last for up to ten people at once.
- See aggregate event info like "X of Y spots filled" — **never** the list of who registered.

Under the hood, all public reads and writes go through locked-down database functions, so an anonymous visitor never touches your data directly and can only do these specific, safe actions.

**Officers (logged in):**

- Set the chapter slug / web address (**Settings → Web address**) — once, then it's permanent.
- Generate, copy, download, and print QR codes and flyers (**Promote** tab).
- See the leads, contacts, and event registrations these forms create, in the dashboard.
- Cancel and restore registrations (there is no delete — see the Events guide).
- Receive the notification emails.

---

## Tips & FAQ

**Which QR code should I print for the banquet?**
Put the **Banquet alerts** code on table tents and signs at events — every scan joins the countdown email list automatically, no officer work needed. Use the **Chapter page** code for banners and business cards (it's the all-purpose one), and the **Join the committee** code where you're actively recruiting volunteers.

**Can a family sign up together, or does each person need their own trip through the form?**
Together. Fill in the first name, press **+ Add someone else** for each of the others (up to ten), and give the contact details once. Everyone lands on the roster individually, and one confirmation email covers the whole group.

**Someone registered twice — what happened?**
Almost certainly a second tap on a phone that hadn't visibly done anything yet. The button now locks on the first press, a repeat submission of the same name and address just shows the original "You're registered!", and the database refuses a true duplicate outright.

**Two of my kids are registered under my email — will the second get rejected as a duplicate?**
No. The check includes the name, so siblings under one parent's email both go through.

**The event is full — is that it?**
No. Join the waiting list from the same page. When a spot opens you'll be emailed straight away with a link to claim it — it opens your details already filled in, so it's one button — and for the first 24 hours that spot can only be taken by someone on the list.

**Somebody cancelled but the event still says it's full.**
It won't any more. Capacity counts live registrations only, so cancelling a registration frees the seat everywhere — the progress bar, the Register button, and the check at the moment of submit all agree.

**A whole table scanned the code and someone got "You've sent this a few times already."**
That was the old per-IP ceiling catching a room on shared wifi, and it's gone. The limit is now keyed on the person (IP *and* email), so ten different people on one venue network are ten different people. If a single person still hits it, they've submitted three times in ten minutes — wait a few minutes and try again.

**Can I change my web address later?**
No — it locks the first time you save it, on purpose, so printed codes never break. Pick it carefully. If a rename ever does happen, old links redirect automatically, but plan on the slug being permanent.

**A visitor filled the form but no officer got an email — why?**
First, banquet-alert sign-ups never email officers by design. Second, join/sponsor emails only go to the **Chairman and Vice Chairman** (plus RD) — so make sure those roles have valid email addresses on file. Notifications are best-effort; the lead is saved either way, so check your leads list.

**Do people need a Marshbeat account or app to sign up?**
No. Everything on the public side is anonymous — scan, tap, type a name, done.

**The QR code has a logo in the middle — will it still scan?**
Yes. The codes are generated at the highest error-correction level specifically so the centered Delta mark doesn't stop them from scanning.

**How do I make a PDF of a flyer to send to a printer?**
Click **Print codes** (or **Print this code**), then choose **"Save as PDF"** as the destination in your browser's print dialog. Each code prints as its own page.

**A code got blocked / the print window didn't open.**
The flyer prints in a new pop-up window. If your browser blocks it, allow pop-ups for the site and try again.

**Do event registrations show up in my leads?**
No — event registrations live on the event only. Join, sponsor, and banquet-alert sign-ups are the ones that become leads/contacts.

**Times look off to a visitor in another state.**
They shouldn't — all event and banquet times render in **your chapter's** time zone for everyone, so what you set is what they see.
