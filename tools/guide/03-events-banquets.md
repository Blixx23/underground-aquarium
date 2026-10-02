# Events & Banquets

> Everything a chapter runs lives here — from a spring work day to the big annual banquet. This guide covers creating events, standing up a full banquet plan (tickets, tables, vendors, sponsors, donations, auction, games), collecting public registrations, sending automatic reminders and promotional emails, running the night-of money tally, and printing the report afterward.
>
> **Who it's for:** chapter officers who plan and run events. Regional Directors (RDs) automatically receive the reminder and promo emails but manage events at the chapter level like any officer. Public visitors interact only with the public event pages (registration and ticket links).

---

## Overview (regular events vs the banquet)

Marshbeat has two kinds of events, chosen with a **Type** dropdown when you create one:

- **Standard event** — raffles, booths, work days, hunts, community days, fundraisers. Every standard event gets its own public page with a QR code, a built-in registration list (or an external sign-up link), automatic member reminders, a money ledger, an auction/raffle list, a games list, and a volunteer roster.
- **Banquet** — the chapter's headline fundraiser of the year. A banquet has a much deeper toolset: goal-setting, per-guest cost figures, a vendor/bill checklist, priced ticket and table tiers, a table/sponsor sales pipeline, a donation tracker with thank-you receipts, an 8-email promotional countdown, a night-of money tally, and a one-click printable report. **Banquets do not take built-in registration** — ticket sales go through a Delta Waterfowl link instead.

Each event carries a **type** (`standard` or `banquet`) that you can change later from *Edit details*. The type is what decides which sections appear on the event's page.

---

## Where to find it

Open a chapter and go to **Events** (`/chapter/<id>/events`). The page is organized into three bands:

1. **The big night** — a gold-trimmed spotlight card for the selected year's banquet. If none exists, you get a "No banquet on the books for `<year>`" prompt with a **Plan the `<year>` banquet** button.
2. **Events** — everything that isn't a banquet, split into **Coming up** (future, with a "Today / Tomorrow / In N days" countdown) and **Wrapped up** (past). This band also holds the **Claim your event package** prompt (see Tips).
3. **Not scheduled yet** — events with no date set. Because they belong to no calendar year, they always show regardless of the year filter.

A **year switcher** at the top filters events by year (read off each event's stored start date, so it lines up with how Finances scopes money). Each event card shows its status badge and venue/location. The banquet spotlight card adds a live **Money in / Paid out / Net so far** summary read from the ledger, plus a "$X still owed" line under Paid out when the vendor bills aren't fully paid.

Use **+ Add event** (top right) to create anything.

---

## Creating an event

Click **+ Add event** (or **Plan the `<year>` banquet**) to open the **New event** modal. Only a **title** is required — you can fill in the rest anytime.

Fields:

- **Event title** *(required)* — e.g. "Spring Raffle Table" or "2026 Annual Banquet".
- **Type** — Standard event or Banquet.
- **Date / Start time / End time** — defaults to today, 9:00 AM–5:00 PM. Times are interpreted in the **chapter's timezone**, so an event reads the same for an officer editing from another time zone.
- **Multi-day event** — tick this to give each day its own date, start, and end time. The overall span (used for sorting, reminders, and the calendar) runs from the first day's start to the last day's end. On a multi-day event, each **volunteer role is tied to a specific day**, and that day's helpers are reminded relative to their day (see Volunteers below).
- **Venue name** and **Address** — both optional. The address becomes a "Map" link on the public page.
- **About this event** — a rich-text editor (bold, headings, lists) shown on the public event page.
- **Private / internal event** *(standard events only)* — keeps the event off your public page. Reminders still go to your team. (Banquets are never private.)

Click **Create event**. You land back on the Events list; a banquet you'll usually open next to start planning.

**Editing:** on the event page, use **Edit details** to change any of the above. For banquets, editing also exposes a **Ticket sales link (Delta)** field — paste Delta's ticketing URL there and a **Buy Tickets** button appears on your public page; clear it to hide the button. Editing the date/time **re-arms the automatic emails** against the new date automatically — no republish needed (see below).

### The event lifecycle (status)

Every event moves through three stages (the labels officers see are in **bold**):

- **Draft** (`planning`) — only your team can see it. Nothing is public and no automatic emails go out.
- **Published** — it's live on your public page, members can sign up, and automatic reminders/promos run on their schedules.
- **Complete** — the event's wrapped up; its details and finances are finalized. Only the **Chapter Chairman** (or a platform super admin) can reopen a completed event.

Every event now carries the same **Status** card with **Publish**, **Unpublish** and **Mark event complete**. Banquets have one too, just below the hero, plus their own separate **worksheet lock** (see below).

> **This was broken until v2.30 and worth knowing if your banquets look stuck.** The Status card was built for standard events only, and nothing else in the app could change an event's status — so a banquet could never be marked complete. Its badge sat on *Published* forever and its finances never finalized. Any banquet from a past season can be closed now.

> Publishing (or re-publishing) **re-arms the email timeline**: it clears the automatic send-claims so the daily job re-evaluates every reminder and promo against the current date. **Editing the event's date does the same thing automatically**, so a simple reschedule is enough — you don't have to unpublish and republish. Your own hand-sent emails are never touched.

---

## Setting up a banquet (tickets, tables, sponsors, pricing)

Open a banquet to get the full planning workspace. At the top is a dark hero card with a countdown ("Today / Tomorrow / N days out"), the status badge, and three controls:

- **Print report** — the one-document report builder (see Wrap-up & report).
- **Edit details** — title, date, venue, Delta ticket link, description.
- **Lock / Unlock worksheet** — freezes the whole plan (prices, costs, goals) so figures can't be nudged once you're set. This is separate from marking the event complete; the worksheet lock only disables editing of the planning numbers.

Below the hero, a **jump-nav** bar links to the numbered steps — **1 Tasks · 2 Costs & vendors · 3 Tickets & tables · 4 Donations · 5 Raffle & auction · 6 Games · 7 Money in**. Each is a collapsible step with a one-line summary so you can scan the whole plan top to bottom:

### 1. Tasks

A planning checklist for the banquet — each task with a **title**, an optional **due date**, and an **owner** from your team. Overdue tasks are flagged, and the step header counts what's still open. It prints as its own section of the banquet report, with a tick box beside every open task.

### Your goals for the night

A **goals** card (above the numbered steps). Set a **Net goal** (dollars raised) and a **Guest goal** (heads through the door). The guest goal feeds the per-guest facility math below. Edit anytime unless the worksheet is locked.

### 2. What the night costs (costs & vendors)

Two parts:

- **Per-guest figures** — *Guests expected* (read from your Goals), *Dinner / guest*, and *Membership / guest*. These three numbers price every ticket and table automatically. A toggle, **Count membership as a cost (Delta view)**, decides whether membership is subtracted as a cost (Delta-facing view) or shown but not counted (your real-profit view). The venue's per-guest cost is derived from the vendor row flagged as the venue divided by guests expected.
- **Vendors & bills** — a checklist of everyone you have to book and pay: venue, caterer, auctioneer, bar, FFL, models, ABC permit, DJ, printing, and anything else. Click **Add standard set** to seed the common nine, or **+ Add vendor** for one-offs. Each vendor row carries:
  - **Total price**, **Amount paid / deposit**, and a live **Remaining / Paid in full** readout.
  - **DDC portion** — how much of the bill **Delta fronts** (a Delta Deposit Credit). The chapter pays the rest. Storage keeps the split because Delta's financial report needs the DDC figure on its own line.
  - One-tap **Booked** (the circle) and **Mark paid in full** buttons — any money down auto-marks a vendor booked.
  - Contact name / phone / email and free-text **Notes**.
  - A progress strip shows **Booked**, **Paid**, and **Still owed** across all vendors, and the collapsed step header summarizes the lot: "N vendors · N booked · $X planned · $Y paid."

  Whatever's been paid on a vendor is **posted to the chapter Finances ledger automatically** (chapter portion as a check expense, Delta's portion as a DDC expense), so a banquet's costs show up in Finances alongside its income. Deleting a vendor removes its ledger entries too.

### 3. What you charge (tickets & tables)

Prices are figured off the costs above.

- **Quick prices** — three boxes for the headline tickets every banquet sells: **Youth**, **Single**, and **Couple**. Type a price and tab out; it saves, creating the ticket if it doesn't exist yet.
- **+ Add ticket / table** — a modal to add any tier with a **name**, **seats**, **ticket price**, and optional **add-on costs** (MOJO decoy, tumblers, a gun, a cooler, raffle tickets, a gift…). Facility, dinner, and membership are calculated automatically from the seat count; add-ons are anything extra.
- Tiers are grouped into **Individual tickets** vs **Tables & sponsor tiers** (a tier counts as a table if it's named like one or seats 6+). Each card shows the full cost breakdown, the **Total cost / break-even price**, and the **Projected profit**, with a red **Below break-even** flag if a price is set under cost. Reorder tiers with the up/down arrows.
- **Standard set:** a seeder can drop in Youth, Individual, Couple, Family of Four, and the four sponsor tables (Spoonie, Greenwing Teal, Pintail, Banded Mallard).

**Table & sponsor sales pipeline:** each table/sponsor tier has a **Manage buyers** drawer to track who's committed. Add a buyer as **Potential** or **Sold**, flip between the two, add a note, and the tier header tallies "N sold · N potential · $X booked." This is your sponsor pipeline.

**Sponsor logos.** Every buyer in **Manage buyers** has a **Logo** line under their name. Open it to:

- **Add logo** — the file the sponsor sent you, exactly as sent. Best is a vector file (**AI, EPS, PDF, or SVG**), which prints sharp at any size; otherwise a **PNG** (transparent background is best) or **JPG**, at least **900 pixels wide**. Up to 25 MB.
- See a **print check** straight away. A vector file reads **Print ready**. A PNG or JPG is judged by its pixels at 300 per inch, the standard for print: **Print ready** (sharp at 3" wide or more), **Small print only**, or **Too small for print**, with the widest size it will print cleanly. When it's too small, ask the sponsor for a vector file or a bigger PNG before the program goes to the printer.
- **Download print file** — the original, untouched, for your program designer.
- **Replace** or **Remove** it.
- Add the sponsor's **website**, and use **Show on our public page as a banquet sponsor** to leave someone off (it's on by default).

Two copies of each logo are kept. The **print file** is the sponsor's own file, never altered, stored privately. The **website version** is made from it automatically: blank margins trimmed, then sized so every logo carries about the same visual weight on an identical card. A wide wordmark and a square badge end up looking evenly matched instead of one tiny and one huge.

**AI, EPS and PDF files print perfectly but can't be shown on a web page.** When one of those is the logo, the line reads **Needs a website image**: press **Add website image** and upload a PNG, JPG or SVG of the same logo. The AI/EPS/PDF stays as the print file.

**Download print logos (.zip)** appears beside the *Tables & sponsor tiers* heading once any sponsor has a logo. It bundles every sponsor's original file, one folder per table tier, ready to hand to the printer. Logos from buyers still marked Potential go in a separate *not-yet-sold* folder.

Logo controls stay available after the worksheet is locked or the banquet is marked complete: logos often arrive late or need swapping, and none of it touches the money.

**On your public page:** from the day of the banquet, your chapter page shows a **"<year> Banquet Sponsors"** section, *"Thank you for making it all possible,"* with every **Sold** sponsor's logo (linked to their website when you've added one). Sold sponsors without a logo yet are thanked by name underneath. It stays up until your next banquet's day arrives, then switches to that banquet's sponsors by itself. Nothing is deleted when it rolls over; last year's sponsors stay with last year's banquet.

---

## Auctions & games

### Raffle & auction

Available on **both** standard events and banquets. Build three lists — **Live auction**, **Silent auction**, and **Raffle**. Each list has a **+ Add a … item** button that opens a labelled panel; every field says what it is:

- **Item** — what the thing is.
- **Donated by** — optional.
- **Description** — free text. On a silent item this is what prints on the bid sheet, under the name.
- **Cost to chapter** — what the chapter paid for it. 0 if it was donated. This is what feeds the list's cost total and the banquet report.
- **Opening bid** — the lowest bid you'll take, and on a silent item the figure printed on the bid sheet. The Raffle list calls this box **Min bid** and marks it rarely used, because a raffle prize isn't bid on.
- **Raise by at least** *(silent items only)* — the minimum raise between bids on that item's sheet. It's per item on purpose: a $40 gift basket wants $5 and a $900 shotgun wants $25, and one print run carries both. 0 leaves the box off that item's sheet.

Opening the panel puts the cursor in the Item box. Enter adds from any field and leaves the panel open for the next item — they arrive in batches, not one at a time — and Escape or the ✕ closes it. Editing an item opens the same labelled panel in place, with a **List** dropdown for moving it to another list. Live and silent items are numbered as **lots** (reorder with the ▲/▼ arrows; the lot number doubles as sort order), and the lot badge shows on screen because that number is what gets printed on paper. Raffle prizes aren't numbered — they're just listed in order. Items added without a category land in an **Unsorted — needs sorting** bucket you can quick-assign from later. **Print list** produces a clean item list in lot order — Lot (# on the Raffle list), Item, Donor, Cost, and the bid column named as it is on screen (Opening bid, or Min bid on Raffle). When more than one list prints, each starts a new sheet. Only the lists that actually have items are printed, so a raffle-only chapter gets one page, not three. There is no tick column and no printed cost total: the tick box was labelled "Set up" and meant nothing to whoever was holding the sheet, and a cost total is an internal figure that doesn't belong on a list volunteers carry round.

### Recording winners

Every item on all three lists carries a **+ Winner** link. It opens a type-ahead over your **members and leads**, each row tagged so you know which you're picking. If the winner isn't in the system yet — and at a banquet half of them won't be — **Add "<name>" as a new lead** creates the lead *and* assigns it in one step, so a walk-up bidder is captured for next year's outreach instead of being lost on a scrap of paper. **Change** and **Clear** sit beside a winner once one is recorded.

Once anything has been won, a **Winner** column appears on the printed item list and in the banquet report's *Raffle & auction* section. Before that it stays off, so the sheets aren't a column of empty cells. Like the other item controls, winners can't be edited once the event is marked complete.

The silent auction **bid sheet** keeps its blank *Winner* line in the footer — that's the paper record written at the table; the field on the item is where it gets typed up afterwards.

### Silent auction bid sheets

**Print bid sheets** sits on the **Silent auction** list only, and appears once that list has at least one item. A live auction runs off a podium and a raffle off ticket stubs; neither has a sheet sitting on the table for bidders to write on, so neither gets the button.

It prints **one full-page sheet per item**, ready to tape down in front of the item. In the dialog:

- **Which items** — **All items**, **Pick items** (tick the ones you want), or **Lot range** (e.g. lots 7 to 12; leave either box blank to mean the first or last lot). This is the same "all or a custom range" choice a printer gives you, over lot numbers rather than page numbers.
- **Show the description** — prints the item's notes under its name. Untick for a bare sheet.

Each sheet carries the chapter and event in the letterhead, the item number, the item name, the description, who donated it, the **opening bid**, that item's own **minimum raise** (set on the item, not here), and a **16-line grid: Bidder #, Bidder name, Phone, Bid**. The bidder number is the column checkout runs on — a name scrawled at 9pm often isn't enough to find the person. The footer carries the bidding rules and blanks for **"Bidding closes"** and **"Winner."**

**An item's worth is never printed on the sheet.** Telling a bidder what a thing is worth anchors them to that number and caps the item.

### Games

A simple roster of midway-style games (e.g. Duck Pong): each game has a **name**, the **worker** running it, the **starting cash** (float) it opens the night with, and **notes**. The worker box suggests names from your roster as you type but takes any name — plenty of games are run by someone who isn't a member. A game with nobody on it shows a **+ Assign worker** link that drops you straight into that field, and an **✕** inside the field clears whoever is on it. The header totals the starting cash across all games.

---

## Volunteers (roles, shifts & who's covering what)

Every event has a **Volunteers** section for lining up who's covering each job. It's built to answer one question at a glance — *is every role staffed?* — with a "filled" progress bar across the top.

**Adding a role.** Click **Add a role** and give it a name (Check-in, grill, decoy setup…), a start/end time, and how many **spots** you need. You can assign someone right away or leave the spots open and fill them later. Assigning a member is a dropdown of your active roster; each open spot shows as a dashed "open" chip until it's filled, and a role turns **Full** once every spot is taken.

**Days (multi-day events).** On a single-day event there's nothing extra to think about — every role is just on the event's day. On a **multi-day** event, each role also picks **which day** it's on, and the roles list groups under a header for each day (e.g. "Friday, May 1"). Picking a day pre-fills the shift times to that day's window, so you rarely touch the clock.

**Reminders are automatic and follow the day.** Everyone assigned gets an email **3 days before**, the **day before**, and the **morning of** — keyed to **the day they're actually helping**, not the event's opening day. A day-two volunteer hears from us relative to day two; someone signed up on two days gets a reminder set for each. You never send these by hand. (Volunteer reminders only go to the assigned members — never the whole roster — and only once the event is **Published**.)

**Reschedule-safe.** Move or edit the event and the volunteer reminders re-arm to the new dates automatically. Because each shift is pinned to a *day of the event* rather than a fixed calendar date, shifting the whole event keeps every role on its relative day; trimming the event to fewer days pulls any stranded shift back to the last remaining day. Delete the event and its pending reminders go with it.

**Duplicate / remove.** Use **Duplicate** to clone a role (fresh, with nobody assigned) when you need several of the same, and **Remove** to delete a role and everyone on it.

---

## Public event pages & registration

Every non-private, published **standard event** gets a public page at `/c/<slug>/event/<eventId>` (or `https://<slug>.<root-domain>/event/<eventId>` when a subdomain is configured). The **Event page & QR** card on the event gives you the link, a **Copy** button, and a downloadable **QR code** to print on flyers. Until the event is **Published**, the public page returns a 404 and the card says so.

The public page shows the date/time (in the chapter's timezone), venue with a Google Maps link, the rich "About" text, a rich social-share preview, and the primary action button.

### Registration modes

On the event's **Sign-ups** section, pick exactly one mode:

- **Off** — no registration; people just show up.
- **External link** — send people to an outside page (Eventbrite, Google Form, SignUpGenius…). A **Sign up** button on the public page links there. Must be a full `https://` URL.
- **Built-in** — Marshbeat collects registrations. You get the shareable link/QR, a live count, an optional capacity, and a check-in list. Registrants belong to the event, not to your roster — but when you mark the event complete, Marshbeat offers to add them to **Leads** (see *[Turning sign-ups into leads](#turning-sign-ups-into-leads)*).

**Switching modes never loses registrants.** This is the question everyone asks
before they touch the toggle, so: changing the mode writes three fields on the
*event* — the mode itself, whether registration is enabled, and (when you leave
External) the external URL. It does not touch the registration list, the waiting
list, the capacity, or check-in state. Flip Built-in → External → Off → Built-in
and all 25 of your registrants are still there.

What *does* change while you're on External or Off:

- **The registration card is hidden, not emptied.** The list, the capacity box and
  the check-in tools disappear from your event page — which is the part that looks
  alarming — and come straight back when you switch to Built-in.
- **The public page reports the event as closed**, so nobody new can sign up and no
  waiting-list mail goes out during that window.
- **Reminders and confirmations for the people already registered keep sending.**
  Those read the registration rows, not the mode.

**The one thing that doesn't survive the round trip is the external URL.** Leaving
External clears it, deliberately — otherwise your public page would keep showing a
Sign up button pointing at an Eventbrite page you've stopped using. Copy the link
somewhere before you switch away if you plan to come back to it.

### Adult vs child registrants

The public registration form (`/c/<slug>/register/<eventId>`, also embedded on the event page) starts by asking **"Who are you registering?"** — **Myself** or **A child (under 18)**:

- **Myself (adult):** name, email *(required — reminders go here)*, optional phone, optional message.
- **A child:** the **child's name**, plus a **Parent / guardian** block — parent name, parent email *(required)*, parent phone. The child is tagged **CHILD** in the roster and the parent's details are stored as the contact.

Officers can also **Add a registrant by hand** (walk-ups, phone sign-ups), with the same child/parent option and a checkbox to **email them a confirmation** (only the registrant, never the officers — since the officer is the one adding them).

Whichever path they're on, Marshbeat resolves one **contact email** for each registrant — their own address, or the parent/guardian's when the registrant is a child. That single definition is what dedupe, throttling and the confirmation email all use. It exists because on the child path the registrant's own email is blank, so every guard that keyed on "email" quietly did nothing there.

### Signing up several people at once

Under the first name on the public form is **"+ Add someone else"** (**"+ Add another child"** on the child path). Each press adds another name box, with an **×** to remove it; up to **ten people** can go on one submission. **The one place it isn't offered is a waiting-list claim link** — a claim is one place, for the reasons in *The waiting list* below.

- **The contact block is asked for once** and covers everybody. The hint under the email changes to read *"Event updates and reminders are sent here — one email covers everyone above."*
- **On the child path the extra names are the other children**, all under the one parent block.
- **Each person still gets their own roster row**, so check-in on the night is per person, not per family.
- **One confirmation email goes out**, not one per person — and it's the *same* template as a single sign-up. The headline switches to *"3 spots are saved"* and a roster line listing the names appears only when there's more than one. There is deliberately no second "group" template to keep in step with the first.
- **If capacity runs out mid-family**, as many are saved as fit and the visitor is told precisely where they stand: *"2 of 4 registered — … we saved the first 2 spots. Reach out to a chapter officer about the rest."*

### Duplicate sign-ups

Every duplicate seen in production was a repeat **tap** — seconds apart, on a phone where nothing had visibly happened yet — not a repeat decision. Three guards stop it:

1. **The submit button locks on the first press**, before anything is sent, and reads *"Saving your spot…"*.
2. **A matching live registration returns the original success**, so an impatient second tap or a lost packet shows *"You're registered!"* rather than an error.
3. **The database refuses a true duplicate**, keyed on the event, the contact email, and the name.

**Siblings are not duplicates.** Because the key includes the name, two children under one parent's email both register. A guard keyed on email alone would have refused the second child — worse than the bug it fixed. And the guard only looks at **live** rows, so anyone who cancelled can sign up again.

### Capacity, open / full / closed

- Set an optional **Capacity**. The public page shows a **"X of Y spots filled"** progress bar and a "N spots left / Full" label.
- Registration status resolves to **open**, **full** (at capacity), or **closed** (draft, or mode isn't built-in). A full or closed page shows a plain message and, for full events, points people to a chapter officer about a waitlist.
- Built-in mode owns its own outcome, so a stale external link can never override the real status.
- **Only live registrations count toward capacity.** A cancelled registration is not an attendee and does not hold a seat, so cancelling one genuinely frees it — on the progress bar, on the Register button, and in the check made at the moment somebody submits. All three ask the same question and now give the same answer.

> This was wrong until Aug 2026, and it showed: River City's Youth Hunters Education page read *"14 of 20 spots filled · 6 spots left"* and, directly beneath it, *"Registration is full."* The bar counted live rows; the gate counted every row ever created, cancellations and duplicates included. Six families were being turned away from an event with room. If you ever raised an event's capacity to work around this, lower it back — the padding will over-fill the room now that the count is honest.

### Managing registrants

The roster lists everyone with child/parent details and any note. For each person you can **Check in** (toggle on the day of) or **Cancel** — a soft move to a "Cancelled" list where they stop counting toward capacity and stop getting reminders, while the record stays and can be **Restored**. **A registration is never deleted** — cancelling frees the seat and keeps the history, which is the whole point. (The event itself is the one thing in Marshbeat that *can* be deleted outright; see the danger zone below.) **Print check-in list** gives you a door sheet in **three separate blocks**, headed by registered / checked-in / waiting / cancelled counts:

- **Registrations** — everyone expected, with a tick box each, child tags, and parent contact where it applies.
- **Waiting list** — everyone still waiting, **numbered in order**, with a tick box and their contact, under the line *"call the top of the list if someone doesn't show."* It's the sheet in your hand when a no-show happens, so the phone number you need is on it.
- **Cancelled — do not check in** — its own block at the bottom, names **struck through and greyed**, a red ✗ where the tick box would be, and CANCELLED in red. They're listed in case they turn up, but there is deliberately nothing to tick. Previously cancelled people sat in the same table as everyone else, separated only by a red word in the last column — which is a name you tick by mistake at a noisy door.

### The waiting list

A full event used to be a dead end — the public page said "Registration is full, reach out to an officer about a waitlist" when there was no waitlist to reach out about. Now there is one, and it's on by default for any event using built-in registration.

**For the visitor.** Once the event is full, the Register button becomes **Join the waiting list**, and the form asks for the same things registration does (Myself / A child, name, contact). They get a "you're on the list" email that tells them plainly how it works — everyone is emailed at once, first come first served. **It doesn't give them a queue number**, because the automatic path doesn't work through the list in order and a number would promise that it does. You still see the order; they don't. One person per place — a group sign-up would only raise the question of who goes when a single seat opens.

**For you.** A **Waiting list** panel sits under the registrant list on the event page:

- Everyone waiting, **in order**, numbered. Each row shows their contact, when they joined, a **Child** tag where it applies, and a **told <date>** tag once they've been emailed about an opening.
- **Register** puts someone straight onto the registration list and emails them their confirmation — the officer's route past first-come-first-served, for when they rang you. It refuses if the event is genuinely full, because quietly over-filling a youth hunt is worse than a refusal you can act on.
- **Remove** takes them off. It's not a delete: **Restore** puts them back in the place they held, because the queue position never moved.
- **+ Add someone to the waiting list** for a phone call or a walk-up.
- **Tell them now** emails everyone waiting immediately — use it when seats appeared some other way, or you want to re-ping the list.
- **Turn waiting list off** per event, if you'd rather field it yourself.

### What happens when someone gets in off the list

The whole journey, and what each step does:

1. **A seat frees** — you cancel a registration or raise the capacity. Everyone waiting is emailed a link that carries their own claim token.
2. **They open the link.** The register page recognises the token, shows a *"A spot opened — this is your claim link"* banner, and gives them the registration form **already filled in with the details they gave when they joined the list** — name, contact email, phone, the Myself / A child toggle, and on the child path the parent block. All they have to do is press **Confirm my spot**. Without a token, that same page still reads "full" for the next 24 hours.

   The click itself does *not* register them, and that's deliberate: links in email are followed by scanners — Outlook Safe Links, corporate filters, mail previewers — and a link that registered on being fetched would hand seats to robots on behalf of people who never opened the mail. So the click lands on a page, and the page has a button.
3. **They press Confirm.** They become an ordinary registration — indistinguishable from someone who signed up on day one, tagged only by an internal source of *waitlist* — and get the **same "You're registered!" confirmation** everyone else gets. Your officers get the usual **new registration** alert.
4. **Their waiting-list row closes out.** It's marked as registered rather than deleted, so the list still shows what happened to everyone who waited. A claim link closes out **the exact row the link belongs to**, so it holds even if they edit a prefilled field on the way through. (An ordinary sign-up, with no link, still matches on the same (event, contact email, name) key the duplicate guard uses — which is why a child registering under a parent's address closes out too.)
5. **From that moment they're on the roster for the event** — so they receive the **3-days-before, day-before and day-of reminders** like every other registrant, and they appear on the printed check-in sheet in the Registrations block.

**What if they change what's filled in?** They can — the boxes are ordinary form fields, and people legitimately need to: a phone number that's changed, a personal address instead of the work one, or a parent sending a different child than the one they put on the list. Whatever they submit is what gets registered.

The bookkeeping still holds, because the claim closes out **the row the link belongs to**, not a row that happens to match the typed name. Before v2.28 an edited name meant the person was registered *and* still sitting on the waiting list, so the next opening emailed them about a seat they were already holding. That can't happen now.

Two things worth knowing:

- **A claim link is a bearer link.** Whoever opens it gets the place. If somebody forwards the email, the forwarded copy works. That's the trade for a one-press claim, and it's the same trade every "click here to confirm" email makes. The place is still counted as claimed by the person who was on the list.
- **A claim is one place.** The *"+ Add someone else"* button isn't offered on a claim link, and the server drops extra names on a claim even if a request carries them. The waiting list holds one place per person, so letting one claim carry a family would let whoever opened their email first take every held seat ahead of everyone else on the list. Someone bringing extra people should ring the chapter, and you add them with **Register** or **+ Add someone to the waiting list**.

If you register somebody yourself with the **Register** button, steps 3–5 are identical; the only difference is that your officers aren't alerted, because you're the one who did it.

**People still waiting get none of that.** Event reminders go to the roster plus everyone holding a live registration — the waiting list isn't in that set, so nobody is reminded to turn up to something they don't have a place at. The only mail a waiting person receives is their "you're on the list" confirmation and, when it happens, "a spot opened."

**Every one of these is in the Emails log**, on its own line: *Waitlist confirmation*, *Waitlist — spot opened*, *Registration confirmation*, and *New registration alert*.

### When a spot opens

Two things free a seat, and both trigger the same thing automatically:

1. **You cancel a registration** — since Aug 2026 that genuinely frees the seat.
2. **You raise the capacity.**

Marshbeat then emails **everyone waiting, at once**, with a link straight to the form. It's **first come, first served**, and the email says so plainly — several people are being told about the same seat on purpose, and a mail implying it was already theirs would be a lie to all but one of them. Whoever doesn't get there stays on the list for next time.

Two guards stop this becoming noise or unfairness:

- **A one-hour cooldown per person.** Clearing four no-shows in a row is four seat-openings, but nobody gets four emails. (**Tell them now** deliberately overrides it — a button you pressed is an instruction, not a guess.)
- **A 24-hour hold.** For a day after a seat frees, the public page keeps reporting the event as full and only a link from a waiting-list email can claim the spot. Without it, a stranger scanning the QR code at a gas station beats a family that's waited three weeks, and the list stops meaning anything. After 24 hours anything unclaimed goes back on the public page.

Every one of these sends is recorded on the chapter's **Emails** tab as a **Waitlist — spot opened** line, with how many seats and how many people were told.

### Turning sign-ups into leads

Everyone who registers hands you their name and email. Until you put them somewhere, that list dies with the event.

**When you press "Mark event complete"**, Marshbeat asks first:

> **Add these people to Leads?**
> From Youth Hunters Education. They'll be tagged **Youth Hunters Education 2026**.

One tickable list, in three groups:

- **Registered** — everyone who came. Ticked for you.
- **Cancelled** — signed up, then cancelled. Shown but **not** ticked. You still have their details and they were interested once; whether that's worth a follow-up is your call, not the app's.
- **Waiting list** — wanted in and never got a seat. Shown, not ticked. Often the keenest people you've got.

Then **Add N and close event**, or **Close without adding**. **Nothing is written until you press the button** — closing an event never quietly imports anybody.

**A child's parent becomes the lead, not the child.** On a child registration every contact detail belongs to the parent, so the lead is *Rafa Mendoza* with the parent's email, and the note reads *"Registered Camila Mendoza."* A parent who signed up two children appears **once**, with both names in the note.

**The registrant's "anything the chapter should know?" note is not carried over.** That box holds allergies and mobility needs in practice. It belongs on the event, not copied into an outreach list.

**The source tag carries the year** — `Youth Hunters Education 2026` — because source names are unique per chapter and a bare title would file next year's registrants in last year's bucket.

**Anyone already on file is greyed out** with the reason: *already a member*, *already a lead* (archived ones included), or *already added*. Matching is on **name and email together**, never email alone, because two sisters share their father's address. Someone with **no email at all** can only be matched by name — those show as *"no email — check this one"*, unticked, for you to judge.

**"Close without adding" is not final.** A completed event keeps an **Add registrants to Leads** button that works exactly the same, so a mis-click costs nothing — which matters, because reopening a completed event is Chairman-only. Events you closed before v2.30 can have their sign-ups collected too. Run it as often as you like: anyone already added shows as *already added* rather than coming round again.

Full detail, including what the Leads list does with them afterwards, is in **Members, Prospects & Leads**.

### Banquets are different

A **banquet never takes built-in registration.** Its public page shows the details and, if you've set the Delta **Ticket sales link**, a **Buy Tickets** button that opens Delta's ticketing page. That's the only ticket path for a banquet.

---

## Event reminders (what auto-sends and when)

Standard events (not banquets) can email your roster on the **Reminders** section.

**Automatic reminders** fire only once an event is **Published**, sent to your **active full members** (prospects are excluded) **and the Regional Director(s)** of your region, on this schedule:

- **3 days before**
- **Day before**
- **Day of**

The schedule shows each touch as **Sent to N**, **Scheduled**, or "not sent." A draft event sends nothing and says so plainly. The day-of email is suppressed if the event has already started (the day-before heads-up always precedes it), and each touch is sent at most once (guarded by a unique index, so a retry can't double-blast).

**Manual reminders:** the **Send reminder** button opens a recipient picker showing everyone with an email on file (opt-outs and no-email members are counted as skipped). Tick a subset or send to everyone. Hand-sent reminders are logged under "Reminders you've sent by hand." The RD is included as a recipient.

> **Volunteer reminders** are separate from these member reminders and go only to the people assigned to a shift, keyed to each shift's day — see **Volunteers** above.

---

## Banquet promos (promotional email cadence)

Banquets replace the reminder series with a **Banquet promotion** countdown — one email that goes out automatically on an **8-touch cadence** counting down to the night:

**60 · 45 · 30 · 21 · 10 · 3 days out · Day before · Day of.**

- **Audience:** the chapter's **leads, members, and committee prospects** (all in the Members DB) **plus the region's Regional Director**. It's the same email each time; only the countdown line changes.
- Promotion runs only once the banquet is **Published** — a draft shows "publish it to start the countdown."
- The card shows the **next send** when collapsed, and the **full schedule with delivery counts** (sent / scheduled / rejected) when expanded.
- **Send me a test** emails the signed-in officer the exact email leads will get (nothing is written to the log).
- The **Get tickets** button in the email uses this event's Delta ticket link if set; otherwise it points to your public chapter page. Add the link in *Edit details*.

Like reminders, promos ride a **daily job**, are guarded against double-sends, and the day-of touch is skipped if the banquet is already underway.

---

## Night-of & tallies / wrap-up & report

### Night-of money tally (banquet)

The banquet's **Money taken in** section gives you a fast tally sheet built for the night: one row per income source (raffle, auction, tickets, etc.), each with a **Cash** box and a **Card** box — because a source usually takes money both ways. Type a figure, tab out, it saves (editing corrects the single underlying ledger row instead of stacking duplicates). Use **+ Add Source** for anything off the standard list (underwriting, donations, a wine pull), and the **✕** to clear a line.

Because **card sales settle straight to Delta** and **cash comes back to the chapter**, only the cash needs a custody trail:

- **Assign / Change** who's holding the night's cash.
- **Mark deposited** to bank the whole night's cash in one action.

Card income needs neither a holder nor a deposit step.

The card's three tiles read **Money in / Costs planned / Net vs plan**. Costs come from the *Vendors & bills* checklist, so "Costs planned" is every bill you've committed to, paid or not — which is why it can be a bigger number than **Paid out** on the Events list, and both are correct. A standard event's Money card shows Income / Expenses / Net and *Not yet deposited* instead.

### Wrap-up & report

There is no separate "wrap-up phase" — the goals card and the live sections carry the final numbers. When you're ready to hand paperwork to the RD or brief a team, use **Print report** (top of the banquet page).

Pick any combination of nine sections — **Tasks, Goals & per-guest costs, Vendors & bills, Ticket & table prices, Table & sponsor sales, Donations, Raffle & auction items, Games, Money taken in** — and print one clean document. Everything is on by default, and each section in the picker carries a one-line description of what it contains.

What comes out:

- **A letterhead** with your chapter name, the event, what the document is, and when it was generated.
- **An at-a-glance strip** across the top — money in, bills (and what's still owed), net so far, donations secured (and how many still need a thank-you), the net goal, and open tasks. Every figure traces to a section below; nothing is projected or invented.
- **A contents list** when you've picked more than one section.
- **Each section on its own page**, so the pack can be split up and handed round. Untick **"Start each section on a new page"** to run them together and save paper.
- **Tables that carry their headings across pages** — page three of a donor list still says which column is which.

The **money section** splits each source into **cash/check, card and DDC** (a Delta draft, shown as its own column when there is any — it never reaches your bank), and notes that "card sales settle with Delta; cash is carried by the Regional Director."

Standard events print a check-in list rather than this report. The check-in list, the auction item list and the chapter finance report all share the same letterhead and layout, so a stack of Marshbeat paperwork reads as one set. (Silent auction bid sheets are the deliberate exception — they're written on by guests, not read by officers, so they're built to their own rules.)

---

## Event finances & donations (brief)

**Money:** every event (standard and banquet) has a money ledger for recording income and expenses, with methods (cash, Venmo, credit card, check, DDC, other), deposit tracking, a cash-holder trail, and an immutable change log. Banquet vendor payments post here automatically. For the full treatment of transactions, deposits, categories, and Delta's financial report codes, **see the Finances guide.**

**Donations (banquet):** the **Donations** section tracks every ask — **Item**, **Cash**, or **Sponsor** — through stages **Possible → Committed → Received → Declined**, with the responsible committee member (or the RD), donor contact details, and follow-up. Once a gift is marked **Received** and the chapter's 501(c)(3) receipt details are configured in Settings, you can **Send thank-you + receipt** — one gracious email to the donor with the official receipt PDF attached (each donor is thanked at most once), or **Download receipt** to print it. Summary tiles show Possible / Committed / Received counts and total **Secured value**, and a nudge counts donors who still need a thank-you.

---

## What happens behind the scenes

- **Timezone correctness.** Every date/time you type is interpreted in the **chapter's** timezone and stored as a UTC instant, so an Eastern chapter's "6:00 PM" reads the same for an officer editing from the West Coast. All countdowns and "3 days out" math run in the chapter's zone against a daily job.
- **Public pages never serve stale data.** After any event edit, the public routes for that chapter/event are purged so a visitor sees new dates/details immediately.
- **Finances stay in sync.** Vendor payments and the night-of tally write straight to the chapter transaction ledger; deleting a vendor or zeroing a tally row removes the matching entries.
- **Emails are idempotent, and rescheduling re-arms them.** The daily cron claims each automatic reminder/promo before sending, and unique indexes mean a retry or overlapping run can only ever produce one email per touch (per day, for volunteer shifts). Re-publishing **or editing the event's date** clears these claims so the timeline re-evaluates against the new date.
- **Reports are generated in your browser.** Print report opens a formatted document and triggers your browser's print dialog, so "Save as PDF" is built in. Nothing is stored — the report always reflects the plan as it stands right now. (If nothing opens, allow pop-ups.) Bid sheets work the same way.
- **Lot numbers never get reused.** A new item takes one past the highest lot in that list, not one past the count — so deleting an item and adding another can't hand two items the same number, and two bid sheets can't both say "Item 3."
- **Delete is a hard cascade.** Deleting an event permanently removes it and **all** tied records — transactions, the change log, vendor bills, auction/raffle items, pricing tiers, games, promos, reminders, wrap-up lines, volunteer shifts, and package requests. It's gated behind typing the event's exact name, and there is no undo.

---

## Permissions

- **Managing events** (create, edit, price, take money, send emails) requires the ability to manage the chapter and an active chapter subscription. This is enforced server-side on every action, not just hidden in the UI — a blocked or lapsed chapter can't mutate via crafted requests. (Billing pages stay reachable so a lapsed chapter can pay.)
- **Reopening a completed event** is restricted to the **Chapter Chairman** or a platform super admin. Everyone else can mark an event complete but not reopen it.
- **Public visitors** can view published event pages and register with no account — reads and writes go through security-definer database functions, so anonymous visitors never touch tables directly and never see the registrant list (only aggregate "spots filled" counts).
- **Private events** stay off the public page entirely, but their reminders still reach the team.

---

## Tips & FAQ

- **Somebody cancelled — do I have to tell the waiting list myself?** No. Cancelling a registration or raising the capacity emails everyone waiting on its own. **Tell them now** is there for the cases the app can't see.
- **Why did five people get told about one seat?** By design — it's first come, first served, and it fills the seat in minutes instead of waiting a day on one person's reply. The email says so, and anyone who misses out keeps their place.
- **Can a stranger take the seat before my waiting list does?** Not for 24 hours. During that window the public page still reads "full" and only a waiting-list link gets through.
- **Someone on the list rang me and I said yes.** Press **Register** on their row. It registers them, emails their confirmation, and takes them off the list.
- **I removed someone by mistake.** **Restore** puts them back exactly where they were — removing never changed their place in the queue.
- **Can a family join the waiting list together?** One place per person. If a group could hold one place, a single freed seat would raise the question of which of them takes it, at 6am, over email.

- **Someone claimed a spot but typed different details — is their waiting-list row still open?** No. The claim closes the exact row the link belongs to, so edits don't strand anybody on the list. If a *different person* took the place, the row still closes — the place was claimed — and the registration shows whoever is actually coming.

- **Can a family sign up in one go?** Yes. Fill in the first name, press **+ Add someone else** for each of the others (up to ten), and give the contact details once. Everyone gets their own roster row; one confirmation email covers the group.
- **Is the multi-person confirmation a second email template I'll have to maintain?** No — there's one template. It reads *"Your spot is saved"* for one person and *"3 spots are saved"* for three, and the roster line only renders when there's more than one name. Edit it once and both cases change together.
- **Somebody registered twice.** That's a repeat tap, not a repeat decision. The button locks on the first press, a repeat of the same name and contact address returns the original success, and the database refuses a genuine duplicate. Cancel the extra row if one predates the fix.
- **Two of my kids are under one email — will the second be blocked?** No. The duplicate key includes the name, so siblings both go through.
- **I cancelled someone but the event still says full.** It won't now. Capacity counts live registrations only, so a cancellation frees the seat everywhere at once.
- **How do I delete a registration?** You can't, on purpose. **Cancel** it: the seat comes back, the person stops getting reminders, and the record stays if you ever need to look.
- **What does "Delete this event" actually delete?** Everything attached to the event: every transaction, vendor and bill, auction and raffle item, volunteer shift, pricing tier, wrap-up line, and the whole record of what was emailed about it — plus any reminders that hadn't sent. There is no undo and no Trash. It is the only hard delete in Marshbeat, and for an event that actually happened it destroys the financial record you'd need at the end of the year. If an event is off, cancel or unpublish it instead.

- **Where do I plan the banquet?** Open Events for the year and use the gold **Plan the `<year>` banquet** card, or **+ Add event** with Type = Banquet. Then work down the numbered steps.
- **How do people buy banquet tickets?** Through Delta. Paste Delta's ticket link in *Edit details*; a **Buy Tickets** button appears on the public page and in the promo emails. Marshbeat doesn't collect banquet payments.
- **Why isn't my reminder/promo going out?** Automatic emails only fire once the event is **Published**. Drafts email no one. Also check the event has a date.
- **Someone edited the date — will reminders re-fire correctly?** Yes, automatically. Saving a new date re-arms the whole email timeline (member reminders, volunteer reminders, and banquet promos) against the new date — you no longer need to unpublish and republish. Volunteer reminders on a multi-day event follow each shift's own day.
- **Can volunteers be scheduled on different days?** Yes. On a multi-day event, each volunteer role picks which day it's on, the roles list groups by day, and reminders go out relative to each volunteer's day. Single-day events don't show a day picker — there's only one day.
- **Prospects and reminders.** Member reminders skip prospects (they're recruiting contacts) — prospects only receive the banquet **promos**.
- **Claim your event package.** Standard events can request a merch/support package from Delta. The **Claim your event package** prompt on the Events list (and the request button on a standard event's page) starts that flow. A banquet gets its own package on the night, so this is standard-events-only.
- **Worksheet lock vs marking complete.** *Lock worksheet* (banquet) freezes just the planning numbers so nobody nudges a price; *Mark event complete* (event status) finalizes the whole event and can only be reopened by the Chairman.
- **Count membership toggle.** Turn it **off** to see your chapter's real profit per ticket; turn it **on** for the Delta-facing view that treats membership as a cost.
- **Undated events.** An event with no date won't appear under any year — it lives in the always-visible **Not scheduled yet** group until you set a date.
- **I only want one section — will it still start on page 1?** Yes. Pick a single section and the report opens with it directly under the letterhead; page breaks between sections only apply when you've picked more than one.
- **What's the difference between Cost to chapter and Opening bid?** *Cost to chapter* is money out — what you paid for the item, 0 if a donor gave it. It feeds the list's cost total and the banquet report. *Opening bid* is money in — the lowest bid you'll accept, and on a silent item it's what prints on the bid sheet. They used to be two unlabelled dollar boxes side by side; now both are named, in the add panel, the edit panel and on the item row.
- **Why does the Raffle list say Min bid instead of Opening bid?** Because nobody bids on a raffle prize — they buy tickets. It's the same underlying field, kept so no existing figures are lost, but named plainly and flagged as rarely used.
- **The winner isn't a member — do I have to add them first?** No. Type the name and pick **Add "<name>" as a new lead**; Marshbeat creates the lead and records them as the winner in one step. They'll be in Leads afterwards for next year's outreach.
- **Where's the bid sheet button for live auction / raffle items?** There isn't one, on purpose. Bid sheets are for a silent auction table where guests write their own bids; a live auction runs off a podium and a raffle off ticket stubs.
- **Why doesn't the bid sheet show the item's value?** Because printing what a thing is worth anchors bidders to that number and caps the item. The opening bid is the only figure that belongs in front of a bidder.
- **Where do I set the minimum raise?** On the item, not in the print dialog — open the item and fill in **Raise by at least**. Each item carries its own, so a reprint always matches the sheet already on the table.
- **Why are the banquet's Paid out and planned costs different numbers?** They measure different things. The banquet tile's **Paid out** is money that has actually left the account — vendor payments only reach the ledger once something is paid. **Planned** on *What the night costs* is the full value of the bills you've committed to, paid or not. The gap between them is shown as "still owed" on the tile, and the vendor step now shows planned and paid side by side.
- **Nothing to write the bidder's number in?** The grid's first data column is **Bidder #**. That's what checkout matches against, so make sure your bidder numbers are handed out before the table opens.
- **What logo file should I ask sponsors for?** A vector file: AI, EPS, PDF or SVG. Their sign or print shop will have one. If all they have is a PNG or JPG, ask for the biggest one they've got; the print check tells you right away whether it's big enough.
- **Why does the website version of a logo look different in size from the file?** It's trimmed and sized to match the other sponsors on purpose, so no one's logo dominates or disappears. The print file is never changed.
- **A sponsor paid but isn't on our public page.** Check they're marked **Sold** (Potential buyers never show), that **Show on our public page** is ticked, and that the banquet's day has arrived. Sold sponsors with no logo yet are thanked by name.
- **Print sheets exist everywhere it matters.** The auction item list, silent auction bid sheets, registrant check-in list, and the full banquet report all print clean, so the volunteer at the door or the RD taking paperwork gets paper, not a screen.
