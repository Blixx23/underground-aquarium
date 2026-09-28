---
title: Reviewing breeding videos
category: Content review
summary: How member breeding clips are converted, how to use or reject them, pick the stage and poster, replace one of the 3 per species, remove sound, and clear stuck conversions.
order: 30
keywords: video queue, breeding videos, species videos, courtship, spawning, eggs, fry, approve video, reject video, poster frame, mute, remove sound, ffmpeg, converting, stuck processing, failed video, videographer trophy
pages: /admin/species-videos, /species/[slug], /species/[slug]/video/[id]
---

Members can upload a short clip of their fish courting, spawning, guarding eggs or raising fry. The site converts it into its own copy, then it waits on the **Breeding videos** screen at /admin/species-videos for an admin to use or reject it. The member side is in [Breeding videos](/help/breeding-videos).

## Where do breeding videos show up?
Pick **Breeding videos** in the admin side menu (subtitle "Member clips to review"), or press the **Breeding videos** card on the [Dashboard](/admin) ("Members' courtship, spawning, egg and fry clips to review").

The badge and "N waiting" pill count videos with the status pending, meaning converted and ready to review. Clips still converting are not in that number.

## What happens between upload and the review queue?
1. The member's phone uploads the original file (up to 200 MB) to a private uploads area.
2. The site checks their limits, creates the video record with the status processing, and starts converting in the background.
3. The converter (ffmpeg, bundled with the site) rejects anything that isn't a video or is longer than 31 seconds, then makes a silent H.264 MP4: up to 1920 pixels on the long side (never upscaled), up to 60 frames per second, all metadata removed (phones store GPS in videos), cut to 30 seconds. It also cuts a poster frame about a third of the way in.
4. The converted video and poster are saved, the original upload is deleted, and the status becomes pending. It now appears in your queue.

If conversion fails, the status becomes failed, the original is deleted, and the member gets a notification titled "We couldn't use your [fish] video" with the reason (for example "That clip is 45 seconds. Trim it to 30 seconds or less." or "Something went wrong converting that video. Try exporting it again from your phone."). Failed videos never reach the admin screen.

## What does the Breeding videos page show?
The heading is **Breeding videos** with this reminder: "Clips members filmed of courtship, spawning, eggs or fry. Each one has already been converted into the site's own copy. Use only the clear, steady, correctly identified ones: up to 3 per species. **Use it** gives it its own watch page, puts it on the species page, and gives them 75 bubbles toward their Videographer trophies. A rejection needs a reason; they see it."

Under it is the **Remove sound from all videos** button, and, when any clips are mid-conversion, an amber line such as "2 more are still converting and will show up here when done."

Videos are listed oldest first. The page loads the 50 oldest waiting. When none are waiting you see "Nothing waiting."

## What's on each video card?
- A player with the converted clip (portrait clips are shown upright and narrower).
- The species name linked to its page, and the scientific name.
- "From" the member (linked to their profile when they have a username), the date, the length (for example 0:24) and the picture size.
- The member's caption, if any.
- A pill: "N of 3 live", turning amber when the species is full.
- **Shows:** four chips, Courtship, Spawning, Eggs and Fry. The member's choice is selected. Tap another to correct it before you approve.
- The current poster thumbnail and **Use the paused frame as the poster**.
- **Already live on the page:** posters of approved videos for this fish, each labeled with its stage.

## How do I use a video?
1. Watch it. Check it's steady, clearly shows the stage and is the right species.
2. Fix the **Shows:** stage if needed.
3. Optionally set a better poster (next section).
4. Press **Use it**.

The database marks it approved with the stage you picked, notifies the member (naming the fish, linking to the video and mentioning the bubbles) and updates their Videographer trophies. The site adds 75 bubbles (from the bubble rules table) without a second generic notice, and refreshes the species page and the video's own watch page at /species/[slug]/video/[id].

## How do I change the poster frame?
1. Play or scrub the video to a good moment and pause.
2. Press **Use the paused frame as the poster**.

The server cuts a new JPG at that exact second from the converted copy, saves it, deletes the old poster, and the thumbnail updates. This works on waiting and already approved videos, but the admin screen only lists waiting ones. If it fails you see "That video isn't ready." or "Couldn't make that poster."

## What happens when a species already has 3 videos?
Each species can show 3 approved breeding videos. When the card says "3 of 3 live":

1. The row label changes to "Already live. Tap the one this replaces:".
2. Tap the video to swap out (it dims and shows **Replace**).
3. Press **Use it (replace selected)**.

The old video is retired from the species page and its watch page is refreshed. Pressing the button with nothing picked shows "This fish already has 3 videos. Pick the one this replaces."

Note: once a species has 3 approved videos, members no longer see the upload form on that species page ("All 3 breeding video spots for this fish are filled by members."), so replacements only happen for clips that were already waiting.

## How do I reject a video?
1. Press **Reject**.
2. Tap a ready-made reason or write your own (up to 300 characters):
   - "It's too shaky to follow."
   - "The fish are too small or out of focus."
   - "It doesn't show courtship, spawning, eggs or fry."
   - "It doesn't look like this species."
   - "It needs to be your own tank, filmed by you."
   - "It has music, text, a watermark or a filter."
   - "We already have a clearer video of this."
3. Press **Reject with this reason**, or **Cancel** to go back.

The member is notified with your reason, the video and poster files are deleted, and no bubbles are given. An empty reason shows "Pick or write a reason. The member sees it."

## What does Remove sound from all videos do?
New uploads are already silent. This button exists for clips uploaded before that change.

Pressing it goes through every waiting, approved and retired video that hasn't been silenced yet, copies the picture unchanged, drops the audio, saves the silent copy at a new address (so browsers don't replay a cached copy with sound) and deletes the old file. It stops after about 4 minutes so the page can answer. The result line reads, for example, "12 videos now silent.", plus "3 couldn't be done; press again to retry." or "5 still to go; press again." if needed. If nothing needed doing it says "Every video is already silent." It's safe to press repeatedly.

## Why is a video stuck converting?
The amber "still converting" line counts every video with the status processing. Conversion normally takes seconds to a few minutes. A video can get stuck there if:

- The member's page never reached the "start converting" step (for example their connection dropped right after upload). The upload form then shows an error and the member may press Send again, which creates a new record while the first stays in processing.
- The server stopped the conversion partway (the background job has a 5 minute limit).

Nothing retries or cleans these up automatically, there is no cron job for it, and stuck videos still count toward the member's limit of 2 waiting per species.

**Known issue:** there is no admin button to retry or clear a stuck conversion. Workaround: in Supabase, open the species videos table, find rows with the status processing that are more than an hour old, and change the status to failed (you can put a short reason in the error column). Then delete the leftover original from the video uploads storage bucket (its path is in the raw path column). The member's waiting count drops and they can try again.

## What does the member get when a video is used?
- A notification that names the fish and links to the video.
- 75 bubbles, once per approved video.
- A watch page for the video with their name on it, and the video on the species page under the breeding videos heading.
- Progress toward the Videographer trophies.

## Common problems
**"Couldn't save that." or a database message.** The decision didn't save. Most often the 3-video limit (pick one to replace) or a permission check. "Admins only." means your admin flag isn't set.

**The Dashboard count is lower than what members say they sent.** The count only includes converted videos. Check the "still converting" line, and see the stuck-conversion section above.

**A member says their clip failed.** Failures are sent to the member with the reason and never reach the admin queue. Ask them to trim it to 30 seconds or re-export it from their phone.

**A member wants their approved video removed or its caption changed.** There is no admin control for this. Change the row in the species videos table in Supabase (for example set its status to retired).

**The poster button does nothing useful on the first frame.** Pause on a frame first; the poster is cut at the player's current time.
