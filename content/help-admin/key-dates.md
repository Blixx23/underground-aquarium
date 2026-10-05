---
title: Key dates
category: Admin basics
summary: The Key dates tab on the Dashboard: renewals and deadlines you can't miss, how reminders reach the Dashboard and the AI team, and how repeating dates roll forward.
order: 15
keywords: key dates, deadlines, renewals, reminders, due dates, dmca renewal, copyright agent, domain renewal, terms effective date, calendar, expiring
pages: /admin/dates, /admin
---

Key dates is a tab on the [Dashboard](/admin) for renewals and deadlines that can't slip: the copyright agent renewal, when new Terms take effect, domain renewals, filings and so on. Open it from **Dashboard → Key dates**, or go to [/admin/dates](/admin/dates).

## How do reminders work?
Every date has a **Remind me this many days before** setting (30 by default). From that day on:

- it shows on the Dashboard as **Key dates coming up**, and counts in the Dashboard badge
- the AI team's morning brief sees it in the live queue counts

On the Key dates tab, a date inside its reminder window turns amber, and an overdue one turns red.

## Adding or changing a date
Click **Add a date** and fill in what it is, the due date, the kind (Legal, Domain & hosting, Money & taxes, Society, Other), how many days ahead to remind you, and optionally a link and notes. Click **Edit** on any date to change it.

## Repeating dates
Fill in **Repeats every (months)** for anything that comes around again: 12 for yearly, 36 for the copyright agent. When you click **Done, schedule next**, the date moves forward by that many months instead of closing, so it's never forgotten.

One-off dates show **Mark done** instead. They move to the **done** list at the bottom, where **Reopen** puts one back.

## Deleting
Click **Delete**, then **Delete for good**. It can't be undone. Use **Mark done** instead if you want a record.

## Dates added at setup
- **Renew DMCA copyright agent (DMCA-1081928)**, due October 4, 2029, every 36 months, reminding 60 days ahead. If it lapses, the site loses its protection from copyright claims over what members post. If the address or phone changes, update the Terms page too.
- **New Terms of Service take effect for existing members**, November 4, 2026.

## Troubleshooting
"Couldn't load key dates" saying the table doesn't exist means step68_key_dates.sql hasn't been run in Supabase yet.
