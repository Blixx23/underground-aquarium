---
title: Renewals
category: Admin basics
summary: The Renewals tab on the Dashboard: one table of everything that expires (domains, the DMCA agent, subscriptions), warnings on the Dashboard, and the Renewed button.
order: 15
keywords: renewals, expirations, expiring, domain expiry, dmca renewal, copyright agent, subscriptions, google workspace, bluehost, auto-renew, deadlines, reminders
pages: /admin/renewals, /admin
---

Renewals is a tab on the [Dashboard](/admin): one table of everything the site depends on that can expire. Domains, the DMCA copyright agent, subscriptions, licenses. Open it from **Dashboard → Renewals**, or go to [/admin/renewals](/admin/renewals).

## What's in the table
Each row shows what it is, who it's with and which account it's under, its kind, when it expires, how long is left, how often it renews and whether auto-renew is on, and what it costs. The line at the top adds up roughly what everything costs per year.

Rows turn **amber** inside their warning window and **red** once expired. "unknown" in the Left column means the expiry date hasn't been filled in yet.

## Warnings
Every row has **Warn me (days before)**, 30 by default. From that day on it shows on the Dashboard as **Renewals coming up**, counts in the Dashboard badge, and the AI team's morning brief sees it.

## When something renews
Click **Renewed** on the row. The expiry date moves forward by its renewal period (a year for a yearly domain, three years for the DMCA agent). The button only appears once a row has both an expiry date and a renewal period. For anything else, click the pencil and change the date.

## Adding, editing and deleting
**Add** opens the form. The pencil edits a row. The bin, then **Delete**, removes it for good. Only put the account email in the Account field, never a password.

## Rows added at setup
- **DMCA designated agent (DMCA-1081928)**: expires October 4, 2029, every 3 years, $6, warning 60 days ahead. If it lapses, the site loses its protection from copyright claims over what members post. If the address or phone changes, update the Terms page too.
- **undergroundaquarium.com domain** (Bluehost): add the expiry date and check auto-renew.
- **Google Workspace**: add the renewal date and price.

## Troubleshooting
"Couldn't load renewals" saying the table doesn't exist means step68_renewals.sql hasn't been run in Supabase yet.
