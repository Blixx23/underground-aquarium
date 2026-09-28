---
title: Reviewing community events
category: Content review
summary: Where member-posted events wait for approval, how to approve or decline them (there is no admin screen yet), shop and Society events that skip review, and the map pin geocoder.
order: 60
keywords: events queue, pending events, approve event, decline event, publish event, event status, community events, club events, society meetings, geocode, map pin, show in directory
pages: /events, /events/[slug], /events/submit, /c/[slug]/events, /event/[slug]
---

Events on the site come from three places: members posting a community event, shop owners posting for their store, and Society officers adding club meetings and events. Only member community events are held for review. This guide explains where they wait and how to decide them.

## Is there an admin screen for events?
No. **Known issue:** community events are saved as pending and the member is told "We review community submissions before they go public", but there is no events card on the [Dashboard](/admin), no menu item and no approval screen anywhere in /admin. Pending events are not counted in "N things waiting on you." and nobody is alerted when one arrives. Until a screen exists, approval is done in Supabase (steps below). Check for pending events regularly.

## Which events need review and which go live immediately?
- **Community events** (posted from [Post an event](/events/submit) with **Posting as** left on "Community event (you)", or by members without a shop): saved with the status pending. Not public.
- **Shop events** (posted by a member who manages a published store, choosing their shop under **Posting as**): saved as published immediately. The form says "Your event is live!"
- **Society club events** (added by Society officers on /c/[slug]/events): saved as published immediately.

The only two status values the site uses are pending and published.

## What does a member see while their event is pending?
After submitting they see "Thanks, your event was submitted!" and "We review community submissions before they go public. You'll see it on the events page once it's approved." They are not given a link to the pending event. If they reach its address anyway, the event page shows "This event is pending review and isn't public yet." Search engines get no event data for pending events, and the old WordPress address /event/[slug] only redirects to published events.

There's no notification or email when an event is approved or declined. Members are told this in [Posting an event](/help/posting-an-event).

## How do I find pending events?
1. Open the Supabase dashboard for the site and go to the Table Editor.
2. Open the events table.
3. Filter status equals pending. Sort by created at.

Useful columns: title, description, starts at, venue name, city, state, is online, online url, created by (the member's id), host kind (member, store or club) and slug.

To preview one as it will look, open www.undergroundaquarium.com/events/ plus its slug. You'll see the amber pending banner above it.

## How do I approve an event?
1. In the events table, find the row.
2. Change status from pending to published.
3. Save.

The event appears on [Events](/events) (if its start time is less than 12 hours in the past and it's set to show on the public events page), on the map if it has a pin, and its page loses the pending banner and gets search engine event data. Event pages aren't cached, so the change is immediate.

## How do I decline an event?
Delete the row in the events table. There's no declined status and no message to the member, so if the event breaks a rule you want them to know about, message them or email them yourself. The rules members see are in [Event rules](/help/event-rules). Titles and descriptions with links are already blocked when they post.

## Can I edit or delete any event from the site itself?
**Known issue:** no. The **Edit event** button on an event page only appears for the person who posted it, managers of the host shop, and active owners, admins and officers of the host club. Being a site admin doesn't add it. Use the events table in Supabase to fix or remove someone else's event.

What the posters themselves can change is in [Editing and deleting events](/help/editing-and-deleting-events). Editing never changes the status, so a pending event stays pending and a published one stays published.

## How do Society club events work?
The Society's events page is /c/[slug]/events (for the Society, /c/underground-aquarium-society/events). Active members whose role is owner, admin or officer see controls to add, edit and delete events there. Nothing is reviewed.

The form has:
- A **Meeting** or **Event** switch. Meeting: "Simple, just the title, time, and place." Event: "Full, adds a cover image and shows as a rich card."
- A title (placeholder "Title (e.g. Monthly Meeting)" or "Title (e.g. Spring Fish Auction)"), **Date & time**, **This is an online event** with an optional event link, or venue, city and state.
- Details, a **Cover image** for Events, and **Also list this on the public Events tab**.
- **Add** (or **Save changes**) and **Cancel**.

Officers see "On Events tab" or "Club only" under each event. Club-only events show on this club events page but not on the public [Events](/events) list. Opening a club event and pressing **Edit event** sends officers back to this page. With nothing coming up, officers see "No upcoming events, add your next meeting above."

## Which events show on the public Events page?
Published events whose "show on the public events page" setting is on, starting no more than 12 hours ago, sorted by start time. Pending events, club-only events and events more than 12 hours past their start never show there.

## How do event map pins get set?
Events don't get coordinates when they're posted. A separate geocoder at /api/events/geocode looks up in-person events with no pin (up to 8 per run, about one per second) using OpenStreetMap and saves the coordinates. It only runs when that address is called with ?key= followed by the GEOCODE_SECRET environment variable. When a poster changes an event's address, the pin is cleared so the geocoder picks it up again.

**Known issue:** the geocoder takes the first 8 in-person events without a pin every time, including pending ones and ones it can't find (no address or city, or no match). Those stay without a pin, so if 8 of them pile up, newer events never get pinned. Fix or delete the location on those rows (or set their lat and lng by hand in Supabase) to unblock it.

## Common problems
**A member says their event never went live.** Look it up in the events table by title or created by. If it's pending, approve it. If it's published but missing from Events, check that it's set to show on the public events page and that it hasn't started more than 12 hours ago.

**A member needs to edit their pending event.** They aren't given its link. Send them www.undergroundaquarium.com/events/ plus its slug, or make the change yourself in Supabase.

**An event is on Events but not on the map.** It has no pin yet. See the geocoder section.

**Spam events.** Delete the rows. If the same account keeps posting, see [Member lookup and accounts](/admin/help/member-lookup-and-accounts).
