---
title: The AI team
category: Admin basics
summary: How the AI operating team works: the morning brief, findings, the reviewer, switching workers on and off, teaching them, the monthly cap, and the Fix with Claude button.
order: 15
keywords: ai team, ops, digital workers, agents, morning brief, findings, coo, analyst, chief of staff, cmo, community manager, partnerships, reviewer, memory, cap, claude, github fix, anthropic api key
pages: /admin/ops, /admin
---

The AI team is a set of digital workers that read the site every day, keep score against goals, and draft work for you. They can only read the database. They never email members, post anything, change data or touch money. Everything they find lands on **/admin/ops** for you to act on.

## What does each worker do?
- **Morning session** (COO, Analyst and Chief of Staff in one run, daily at 6:30 am): checks every admin queue, email delivery and anything stuck; records yesterday's numbers against the site's normal; then writes your morning brief and emails it to you.
- **Community Manager** (once a day from 8 am, only if there's new activity): finds unanswered threads, new members to welcome, posts worth featuring, and anything that looks like trouble. Drafts replies for you to post.
- **CMO** (Mondays): drafts the week's 7 Instagram captions for your 3x3 grid and up to 3 ideas.
- **Partnerships** (Tuesdays): works the shop outreach pipeline and drafts follow-up emails for you to send.
- **Weekly review** (Mondays): four-week trends, the team's cost and usefulness, one recommendation. On the first Monday of the month it also tidies every worker's memory.
- **AI reviewer** (after runs): checks new findings before you see them. Approves, rejects with a reason, or passes to you.
- **Support Desk** and **QA / Site Health** are listed but need Gmail or the GitHub routine connected first.

Only the morning session is switched on at the start. Turn the others on from **The team** on /admin/ops.

## What is a finding?
A finding is a ticket: something a worker thinks you should act on, with evidence. Each one has a kind (queue item, message draft, data problem, bug, decision, idea), a risk (low, medium, high) and a status:

- **Not reviewed yet**: new, waiting for the reviewer (or for you, if the reviewer is off).
- **Open**: waiting on you. "AI-checked" means the reviewer approved it.
- **Fix in progress**: sent to GitHub for Claude to fix.
- **Done**: you marked it done. The worker re-checks next run and marks it **verified fixed**, or reopens it.
- **Dismissed**: you or the reviewer threw it out. Restore brings it back.

## How do the workers learn?
Every worker has a memory it reads before each run. It saves baselines (what's normal for this site), rules and threads it's following. You teach it three ways:

1. **Thumbs up or down** on a finding, with an optional "why". Down means "don't flag things like this"; up means "more like this".
2. **Teach** under the latest brief: type an instruction and it's saved as a rule.
3. **Restore** a finding the reviewer rejected, which teaches the reviewer it was wrong.

Open **What the team remembers** at the bottom of /admin/ops to see every memory and retire anything wrong.

## What does it cost, and how is it capped?
Each run uses Claude through the site's Anthropic API key. The cost of every run is logged in the run log. The monthly cap (default $50) is shown at the top of the page; edit it there. When the month's spend reaches the cap, every worker stops until the 1st. At today's traffic expect roughly $8 to $15 a month. Quiet days cost almost nothing because workers that wait for activity don't wake up.

To stop everything at once, press **Team is on** to pause the whole team.

## How does Fix with Claude work?
Bug findings show a **Fix with Claude** button once the GitHub token is set up. It opens a GitHub issue that mentions @claude. The Claude workflow in the repo writes the fix on a new branch and links a pull request; Vercel builds a preview of that branch. Check the preview, then merge the pull request on GitHub to deploy it. Nothing goes live without your merge. Claude is told not to touch payments, sign-in or database structure.

## What needs setting up?
- **ANTHROPIC_API_KEY** in Vercel (Settings, Environment Variables), then redeploy. Without it nothing runs and the page shows a warning.
- **ops_team_setup.sql** run once in the Supabase SQL Editor. Without it the page says the tables are missing.
- For Fix with Claude: **OPS_GITHUB_TOKEN** in Vercel (a fine-grained GitHub token with Issues read and write on the repo), plus the Claude GitHub App installed on the repo and **ANTHROPIC_API_KEY** added as a GitHub Actions secret.

## Can the workers see private information?
No. They query through a read-only database login that is blocked from emails, phone numbers, addresses, payment details, tokens and private message bodies. Each query is limited to one SELECT, 50 rows and 10 seconds, and each run to 15 queries.

## Troubleshooting
- **"Skipped: Switched off"**: the worker is off; turn it on under The team.
- **"Skipped: Nothing new"**: no new activity since its last run, so it stayed asleep. That's normal.
- **"Skipped: Monthly cap reached"**: raise the cap or wait for the 1st.
- **"Already running"**: a run started in the last 15 minutes. Wait for it.
- **Error mentioning the Claude API**: check the API key in Vercel and your Anthropic billing.
- **No morning email**: check /admin/email for the ops_brief send, and that email isn't paused.
