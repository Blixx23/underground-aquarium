---
title: Running the Society admin page
category: The Society
summary: The Society's officer page: who can open it, the member roster and every column, roles and officer titles, adding and removing members, honorary lifetime, settings, and the leftover Delete club section.
order: 10
keywords: society admin, club admin, roster, members list, officers, roles, owner, admin, officer, officer title, president, treasurer, add member, remove member, honorary, lifetime, club settings, logo, delete club, member status, prospect, lapsed
pages: /c/[slug]/admin, /c/[slug], /society, /society/home
---

The Underground Aquarium Society is run from its club admin page at /c/underground-aquarium-society/admin. This is where officers see the roster, change roles and plans, handle applications and dues, and reach the Breeder Award Program tools. Members see the other side in [The Society overview](/help/the-society-overview) and [Society member area](/help/society-member-area).

## How do I get to the Society admin page?
From the admin area, pick **Society** in the side menu (subtitle "Roster, dues, officers") or press the **Society** card on the [Dashboard](/admin) ("Roster, dues, officers and applications for Underground Aquarium Society"). Both link to /c/underground-aquarium-society/admin.

The badge and the "N waiting" pill on that card count applications waiting for approval (Society members with the status pending).

## Who can open it?
Access is decided by your role in the Society, not by the site admin flag.

- Owner, admin or officer: you get the page.
- Anyone else, including a site admin who isn't on the Society roster as one of those roles: "Officers only" and "You don't have permission to manage this club." with a **Back to** link.
- Signed out: you're sent to Log in and returned here afterwards.

**Known issue:** the Dashboard card is shown to every site admin, but a site admin who isn't a Society officer can't use it. Add yourself as an officer on the roster (or set your role in the club members table in Supabase) first. The page also doesn't check the officer's own status, so an officer marked lapsed keeps access.

## What's on the page?
The page is titled **Club admin**, with a back link to the Society's name.

1. **Members**, always open at the top: the roster and **Add a member**.
2. **Manage**, a set of tiles that open one at a time when pressed:
   - **Club settings** ("Name, logo, visibility, and contact info"). Owner and admin only.
   - **Member requests** ("Applications awaiting your approval"), only when applications are waiting, with a count badge. See [Society applications and invites](/admin/help/society-applications-and-invites).
   - **Dues & payouts**. See [Society dues admin](/admin/help/society-dues-admin).
   - **Breeder Award Program** ("Submissions and species point list"). See [Society judging and appeals](/admin/help/society-judging-and-appeals).
   - **Delete club** ("Permanently remove this club"). Owner only.

## How do I read the roster?
Under **Members** the intro reads: "Add members, set their plan, role, and status, or remove them. Search by name, username, email, or phone. The owner row is locked. Dues are paid online, each member's row shows whether they're paid, owe, or are covered."

Everyone except pending applicants is listed, oldest joined first. The search box ("Search name, @username, email, phone") filters as you type; phone search ignores formatting once you type 2 or more digits. The count on the right reads "N members", or "N of M" while searching. No matches shows "No members match "[search]"."; an empty roster shows "No members yet, add one below."

Columns:
- **Member**: the roster name (or @username, or email). A crown marks the owner. Under it: @username, email and phone. "No account yet" means the row was added by hand and no site account is linked.
- **Role**: a dropdown (member, officer, admin). The owner shows "owner" and can't be changed. Officers and admins also get a title box.
- **Plan**: a dropdown (individual, lifetime) with a **Make honorary** link, or "Honorary lifetime" for honorary members.
- **Status**: a dropdown (active, prospect, lapsed, pending). Locked on the owner row.
- **Renewal**: the dues badge, the paid-through date with a lock icon, and **Send dues request** when they owe. Details in [Society dues admin](/admin/help/society-dues-admin).
- A trash can to remove the member (not on the owner row).

Every dropdown change saves immediately and the page refreshes.

## What do the member statuses mean?
- **active**: a member in good standing.
- **prospect**: approved or added, but hasn't paid yet. Doesn't count as a paying member until dues are paid.
- **lapsed**: their paid-through date passed. The dues reminder job sets this automatically.
- **pending**: an application waiting for approval. These rows show under **Member requests**, not in the roster.

Changing status by hand doesn't change the paid-through date, and the member area decides access with its own good-standing check, so setting someone back to active doesn't by itself let a lapsed member back in. See [Society dues admin](/admin/help/society-dues-admin).

## How do roles and officer titles work?
Roles decide what someone can do:

- **owner**: one person, locked. The only role that sees **Delete club**.
- **admin**: everything an officer can do, plus **Club settings**, the logo and Stripe payout setup.
- **officer**: the roster, applications, dues requests, honorary grants, the species point list and the Society events page.
- **member**: no officer tools.

To change a role, pick it in the **Role** dropdown. For any officer or admin, a title box appears ("Title (e.g. President)") with suggestions: President, Vice President, Treasurer, Secretary, Events Coordinator, Membership Chair. You can type anything. The title saves when you click out of the box; clear it to remove the title.

The screen shows the same role choices to every officer. Any limit on who may promote whom is enforced by the database, and a refused change shows the database's error at the top of the roster.

Judges for the Breeder Award Program are not set here. See [Society judging and appeals](/admin/help/society-judging-and-appeals).

## How do I add a member by hand?
Use **Add a member** under the roster, for example to carry over existing members.

1. Enter **Name** and/or **Email (optional)**. At least one is required ("Enter at least a name or an email.").
2. If the Society charges dues, you'll see **Already paid through (existing members only)**. Use it only for someone who already paid before joining Underground Aquarium. "This date can't be changed later."
3. Pick a role (member, officer, admin) and a plan (individual, lifetime, or **Honorary lifetime (free)**).
4. Press **Add**.

What status they get:
- Honorary: active, and the honorary grant runs (with the email, see below).
- With a paid-through date, or when the Society has no dues: active.
- Otherwise: prospect. "New members start as a prospect and aren't counted until dues are paid, online, or by setting a renewal date above."

"You can add members who don't have an account yet, they'll link up automatically when they sign up with the same email." Adding a member by hand sends no email or invite.

## How do I make someone an honorary lifetime member?
1. In their row's **Plan** column, press **Make honorary**.
2. Confirm: "Make [name] an honorary lifetime member? They'll never owe dues."

The database grants honorary lifetime membership. The member gets an in-app notice ("You're an Honorary Lifetime Member", linking to /society/home) and an email titled "You've been made an Honorary Lifetime Member of the Underground Aquarium Society" listing Membership: Honorary Lifetime, Dues: None, ever, and their member number if they have one. Their row then shows "Honorary lifetime" and the **Honorary** badge. You can also pick **Honorary lifetime (free)** when adding a member.

**Known issue:** after pressing **Make honorary** the green notice always says "[name] is now an honorary lifetime member. We've emailed them.", even if they have no email on file or sending failed. Check [Email queue and health](/admin/help/email-queue-and-health) if it matters.

There's no button to take honorary status away. Change the member's honorary and plan columns in the club members table in Supabase.

## How do I change someone's plan?
Pick individual or lifetime in the **Plan** dropdown. Lifetime here only changes what they'll be charged: the next time they pay online they pay the lifetime price instead of the annual one. Until they've paid it, the badge shows **Owes**. For a free lifetime membership use **Make honorary** instead. Family plans are retired; old family rows still display as "family", indented under their main member with "Family of [name]" and a **Covered** badge.

## What member details can officers see?
The roster shows name, @username, email and phone. An applicant's full application (phone, mailing address, experience, interests, how they heard about the Society and their note) is shown on their card under **Member requests**.

**Known issue:** once an applicant is approved, only their phone shows on the roster. Their address and other application answers are still stored (in the club member details table) but no screen shows them. Look them up in Supabase if you need a mailing address.

Members can change their own roster name and contact email under **Your details** on the Society page (/c/underground-aquarium-society?manage=1).

## How do I remove a member?
Press the trash can on their row and confirm "Remove [name] from the club?". Their roster row is deleted outright and they lose access to the member area. No email is sent. Their dues payment history is kept.

Members can leave on their own with **Leave the Society** on the Society page; see [Leaving the Society](/help/leaving-the-society).

## What's in Club settings?
Owners and admins can open **Club settings**:

- **Upload logo** (any image file).
- **Club name** (required: "Club name can't be empty."), **Description**, **City**, **State**.
- **Annual dues (USD)** and **Lifetime membership (one-time)**. Covered in [Society dues admin](/admin/help/society-dues-admin).
- **Organizer & verification**: **Organizer name**, **Contact email**, **Contact phone**, **Public link (website / Facebook / IG)**, **Meeting info (where & when)** and **Nonprofit status (optional)**.
- **Public club (shows on member profiles and discovery)**.

Press **Save changes**; "Saved" appears. Ticking **Public club** requires every organizer field except nonprofit: "To list your club publicly, fill in the organizer name, email, phone, a public link, and meeting info below."

Changing the name changes it everywhere, including emails and new certificates.

## What does the "In review" badge on Club settings mean?
It shows when **Public club** is on but the club's approved flag is off. The settings then say "Pending review, your club won't appear in the public directory until an admin approves it." This comes from the old multi-club directory, which has been retired (every /clubs address now goes to /society). There's no screen to approve a club. If you want the badge gone, set approved to true on the Society's row in the clubs table in Supabase.

## What is the Delete club section?
It's left over from when members could run their own clubs. Only the owner sees it. It says "Deleting the club removes all members, invites, and dues records. This can't be undone." Pressing **Delete club** asks you to type the club name, and on a match deletes the Society completely: roster, invites and dues history. A wrong name shows "Name didn't match, nothing was deleted."

**Known issue:** on the Society this would wipe out the whole Society. Never use it. There's no need for it now that there's only one Society.

## Common problems
**"Officers only" when I'm a site admin.** Your Society role isn't owner, admin or officer. Fix your row in the club members table in Supabase.

**A dropdown change shows a red error.** The database refused it (usually a permission rule). The roster refreshes back to the saved value on reload.

**A hand-added member didn't link to their account.** Linking needs the same email on both. Check the roster email matches the email they signed up with, then have them open the Society page again.

**The member count on the Society page doesn't match the roster.** The public headcount comes from its own database count, which may only count members in good standing. The roster lists everyone except applicants.
