---
title: Reviewing community events
category: Content review
summary: The Events screen where member-posted community events wait for approval, what each card shows, what Approve and Decline do and who is notified, shop and Society events that skip review, and the map pin geocoder.
order: 60
keywords: events queue, pending events, approve event, decline event, publish event, event status, community events, club events, society meetings, geocode, map pin, show in directory, event not approved, your event is live
pages: /admin/events, /events, /events/[slug], /events/submit, /c/[slug]/events, /event/[slug]
---

Events on the site come from three places: members posting a community event, shop owners posting for their store, and Society officers adding club meetings and events. Only member community events are held for review, and they wait on the **Events** screen at /admin/events until an admin approves or declines them.

## Where do I find events waiting for approval?
Open the admin area and pick **Events** from the side menu (subtitle "Community events to approve"), or press the **Events** card on the admin [Dashboard](/admin) ("Community events waiting for approval before they go public").

The menu badge and the card's "N waiting" pill count every event with the status pending, and that number is added into the "N things waiting on you." line on the Dashboard. Counts refresh each time an admin page loads. Nobody is emailed when a new event arrives, so keep an eye on the badge.

Only admins can open the screen. Signed out, you are sent to the sign-in page; signed in without the admin flag, you see "Admins only".

## Which events need review and which go live immediately?
- **Community events** (posted from [Post an event](/events/submit) with **Posting as** left on "Community event (you)", or by members without a shop): saved with the status pending. Not public. These are the ones on this screen.
- **Shop events** (posted by a member who manages a published store, choosing their shop under **Posting as**): saved as published immediately. The form says "Your event is live!"
- **Society club events** (added by Society officers on /c/[slug]/events): saved as published immediately.

The only two status values the site uses are pending and published.

## What does each card show?
Events are listed by start time, soonest first, so the ones starting soonest are at the top. Each card shows:

- The cover image, or a calendar icon if there is none.
- A tag: "Community event" (or the shop's name in the rare case a shop event is pending).
- The event title.
- **Preview event page**, which opens /events/<slug> in a new tab with the amber pending banner. Depending on the database rules, a pending event's page may only open for the member who posted it; everything you need to decide is on the card either way.
- "Sent in by @username" (or their full name, or "a member") and the date it was sent.
- When it starts and ends, in the event's own time zone, with the time zone name.
- For online events, "Online event" and the link as plain text (admin screens don't link out to sites nobody has checked). For in-person events, the venue, address, city, state and ZIP, or "No location given".
- "Capacity:" when one was set.
- The full description.
- **Approve** and **Decline**.

With nothing waiting you see "No events waiting for approval."

## How do I approve an event?
1. Read the card (and preview it if you want).
2. Press **Approve**. There is no confirm step.

What happens:

- The event's status becomes published, and it is set to show on the public events page (the submit form never sets that on its own, so approving always sets it).
- It appears on [Events](/events) unless it started more than 12 hours ago, and on the map once it has a pin (see [How do event map pins get set?](/admin/help/events-review#how-do-event-map-pins-get-set)).
- Its page loses the pending banner and gets search engine event data, and it is added to the sitemap.
- The card leaves the list and the badge drops.
- The member who posted it gets a bell notification "Your event is live": "<title> was approved and is now on the events page.", linking to the event.

## How do I decline an event?
1. Press **Decline**. A box opens labeled "Why? (optional, sent to the member)" (placeholder "e.g. This looks like an ad rather than an event.", up to 300 characters).
2. Type a reason if you want the member to know why.
3. Press **Decline and delete**.
4. Confirm "Decline this event? It will be deleted and the member will be told."

What happens:

- Any RSVPs on it are cleared and the event is deleted. There is no declined status, so it can't be brought back; the member would have to post it again.
- The member gets a bell notification "Event not approved": "<title> wasn't approved for the events page." followed by your reason, or, with no reason, "Questions? Write to support@undergroundaquarium.com." It links to the events page.

Pressing **Decline** again closes the box without doing anything. The rules members see are in [Event rules](/help/event-rules). Titles and descriptions with links are already blocked when they post.

## What does the member see?
After submitting they see "Thanks, your event was submitted!" and "We review community submissions before they go public. You'll see it on the events page once it's approved." They are not given a link to the pending event. If they reach its address anyway, the event page shows "This event is pending review and isn't public yet." Search engines get no event data for pending events, and the old WordPress address /event/[slug] only redirects to published events.

Both outcomes arrive as bell notifications only; no email is sent. The member side is in [Posting an event](/help/posting-an-event).

## Can I edit or delete any event from the site itself?
**Known issue:** not from the event page. The **Edit event** button there only appears for the person who posted it, managers of the host shop, and active owners, admins and officers of the host club. Being a site admin doesn't add it. The Events screen can approve or decline a pending event but can't edit it. To fix a typo before approving, or to change or remove someone else's published event, use the events table in Supabase.

What the posters themselves can change is in [Editing and deleting events](/help/editing-and-deleting-events). Editing never changes the status, so a pending event stays pending and a published one stays published.

## How do Society club events work?
The Society's events page is /c/[slug]/events (for the Society, /c/underground-aquarium-society/events). Active members whose role is owner, admin or officer see controls to add, edit and delete events there. Nothing is reviewed and nothing reaches the Events screen.

The form has:
- A **Meeting** or **Event** switch. Meeting: "Simple, just the title, time, and place." Event: "Full, adds a cover image and shows as a rich card."
- A title (placeholder "Title (e.g. Monthly Meeting)" or "Title (e.g. Spring Fish Auction)"), **Date & time**, **This is an online event** with an optional event link, or venue, city and state.
- Details, a **Cover image** for Events, and **Also list this on the public Events tab**.
- **Add** (or **Save changes**) and **Cancel**.

Officers see "On Events tab" or "Club only" under each event. Club-only events show on this club events page but not on the public [Events](/events) list. Opening a club event and pressing **Edit event** sends officers back to this page. With nothing coming up, officers see "No upcoming events, add your next meeting above."

## Which events show on the public Events page?
Published events whose "show on the public events page" setting is on, starting no more than 12 hours ago, sorted by start time. Pending events, club-only events and events more than 12 hours past their start never show there. Approving a community event always turns the setting on.

## How do event map pins get set?
Events don't get coordinates when they're posted or approved. A separate geocoder at /api/events/geocode looks up in-person events with no pin (up to 8 per run, about one per second) using OpenStreetMap and saves the coordinates. It only runs when that address is called with ?key= followed by the GEOCODE_SECRET environment variable. When a poster changes an event's address, the pin is cleared so the geocoder picks it up again.

**Known issue:** the geocoder takes the first 8 in-person events without a pin every time, including pending ones and ones it can't find (no address or city, or no match). Those stay without a pin, so if 8 of them pile up, newer events never get pinned. Approve or decline pending events promptly, and fix or delete the location on unfindable rows (or set their lat and lng by hand in Supabase) to unblock it.

## Common problems
**A member says their event never went live.** Check the Events screen. If it's there, approve it. If it isn't, look it up in the events table in Supabase by title or created by: a published event missing from Events has probably started more than 12 hours ago, or is a club-only event. If it isn't in the table at all, it was declined (and deleted) or never submitted.

**"This event was already reviewed."** Another admin (or another tab) already approved or declined it. Reload.

**"Event not found. It may have been deleted."** The member deleted it themselves, or another admin declined it. Reload.

**A member needs to edit their pending event.** They aren't given its link. Send them www.undergroundaquarium.com/events/ plus its slug, or make the change yourself in Supabase before approving.

**An event is on Events but not on the map.** It has no pin yet. See the geocoder section.

**Spam events.** Decline them. If the same account keeps posting, see [Member lookup and accounts](/admin/help/member-lookup-and-accounts).
