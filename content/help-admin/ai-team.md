---
title: The AI team
category: Admin basics
summary: How the AI operating team works: the morning brief, answering findings with Yes, No or Something else, the reviewer, switching workers on and off, teaching them, the monthly cap, and Claude fixes.
order: 15
keywords: ai team, yes no something else, dismiss finding, approve suggestion, send shop email, ops, digital workers, agents, morning brief, findings, coo, analyst, chief of staff, cmo, community manager, partnerships, reviewer, memory, cap, claude, github fix, anthropic api key
pages: /admin/ops, /admin
---

The AI team is a set of digital workers that read the site every day, keep score against goals, and draft work for you. They can only read the database. On their own they never email anyone, post anything, change data or touch money. Everything they find lands on **/admin/ops** with a suggestion, and nothing happens until you say yes.

## What does each worker do?
- **Morning session** (COO, Analyst and Chief of Staff in one run, daily at 6:30 am): checks every admin queue, email delivery and anything stuck; records yesterday's numbers against the site's normal; then writes your morning brief and emails it to you.
- **Community Manager** (once a day from 8 am, only if there's new activity): finds unanswered threads, new members to welcome, posts worth featuring, and anything that looks like trouble. Drafts replies for you to post.
- **CMO** (Mondays): drafts the week's 7 Instagram captions for your 3x3 grid and up to 3 ideas.
- **Partnerships** (Tuesdays): works the shop outreach pipeline and drafts follow-up emails for you to send.
- **Weekly review** (Mondays): four-week trends, the team's cost and usefulness, one recommendation. On the first Monday of the month it also tidies every worker's memory.
- **AI reviewer** (after runs): checks new findings before you see them. Approves, rejects with a reason, or passes to you.
- **QA / Site Health** (Wednesdays at 9 am): loads the main pages and a sample of shops, species, listings and courses as a signed-out visitor, checks links, and files anything broken, slow or out of date (old fee or checkout wording, family plans and so on). Pages under /my, /account and /admin redirecting to login is expected.

Only the morning session is switched on at the start. Turn the others on with the switch on each worker's row under **The team** on /admin/ops. Tap a row to see what that worker does, its last result, its cost and a **Run now** button. A green dot means it's running fine, red means its last run didn't finish, and gray means it's off.

## What is a finding?
A finding is something a worker thinks you should act on. Each card under **Waiting on you** tells you:

- **How soon**: Urgent, This week, or When you have time.
- **What it is**: Something is broken, Data to fix, A message to send, Your call, Waiting in a queue, or An idea.
- **Who found it**: Morning check, Community manager, Marketing, Shop partnerships, Weekly review or Site health check. "Double-checked" means the reviewer agreed it's worth your time.
- **The suggestion**, which you can edit, and **Show why** for the worker's reasoning and evidence.
- **If you say yes**: one line saying exactly what will happen.

## How do I answer a finding?
Edit the suggestion if you like, then press one of three buttons:

- **Yes** does it. What that means depends on the card, and the button says which:
  - **Yes, send to N shops**: an email to shops. Edit the subject and text first if you like. The site sends one email per shop from support@, filling in each shop's name and owner's first name, and replies come to your brief address. Shops with no email on file are crossed out and skipped.
  - **Yes, have Claude fix it**: a bug. Claude writes the fix on GitHub (see below).
  - **Yes, go with this**: a plan the team can carry out itself, like drafting emails or captions. It does your edited version on its next run, with nothing for you to do.
  - **Yes, I've done it**: something the team can't do for you (a Vercel or Supabase setting, approving a listing, answering a message). The suggestion says how. Do it, then press Yes, and the team re-checks it on its next run.
- **No** clears it. Add a reason if you like. The worker is told not to suggest it again.
- **Something else** sends your note back to the worker ("only the Florida shops", "wait until next month"). Tick **revise it now** to have the worker rework it straight away (a few minutes, a few cents), or leave it for the next run. The card shows your note until the new suggestion arrives.

Answered cards move to **Done** or **Dismissed** at the bottom of the page. **Bring it back** returns a dismissed one to Waiting on you.

## How do the workers learn?
Every worker has a memory it reads before each run. It saves baselines (what's normal for this site), rules and threads it's following. Every answer teaches it:

1. **Yes** tells the worker the suggestion was useful. **No** (with your reason) tells it not to raise things like this. **Something else** shows it what you'd rather do.
2. **Teach** under the latest brief: type an instruction and it's saved as a rule.
3. **Bring it back** on a finding the reviewer rejected teaches the reviewer it was wrong.

Open **What the team remembers** at the bottom of /admin/ops to see every memory and retire anything wrong.

## What does it cost, and how is it capped?
Each run uses Claude through the site's Anthropic API key. The cost of every run is logged in the run log. The monthly cap (default $50) is shown at the top of the page; edit it there. When the month's spend reaches the cap, every worker stops until the 1st. At today's traffic expect roughly $8 to $15 a month. Quiet days cost almost nothing because workers that wait for activity don't wake up.

To stop everything at once, flip the **Team on** switch at the top of the page to **Team paused**.

The page shows what needs you first (**Waiting on you**), then the headline of the latest brief (tap **Read the full brief** for the rest), then the team, then this month's spending.

## How does "Yes, have Claude fix it" work?
Bug findings offer this once the GitHub token is set up. It opens a GitHub issue that mentions @claude. The Claude workflow in the repo writes the fix on a new branch and links a pull request; Vercel builds a preview of that branch. The card shows **Claude is working on a fix** with an **On GitHub** link. Check the preview, merge the pull request on GitHub to deploy it, then press **Done** on the card. Nothing goes live without your merge. Claude is told not to touch payments, sign-in or database structure.

## What needs setting up?
- For the Site health check: in Vercel, open the project's **Settings**, then **Deployment Protection**, then **Protection Bypass for Automation**, and create a secret. Then redeploy. Without it, Vercel's Security Checkpoint can block the checker and it can't load any pages. With it, only our own checker gets through; visitors are unaffected.
- **ANTHROPIC_API_KEY** in Vercel (Settings, Environment Variables), then redeploy. Without it nothing runs and the page shows a warning.
- **ops_team_setup.sql** run once in the Supabase SQL Editor. Without it the page says the tables are missing.
- For Claude fixes: **OPS_GITHUB_TOKEN** in Vercel (a fine-grained GitHub token with Issues read and write on the repo), plus the Claude GitHub App installed on the repo and **ANTHROPIC_API_KEY** added as a GitHub Actions secret.

## Who answers support@?
The UA Support Desk scheduled task in your Claude account (claude.ai, Scheduled tasks). It reads support@ at 8:20 am, 12:20 pm and 4:20 pm and saves reply drafts in Gmail with the labels AI Support/Handled and Needs Chris. It isn't part of the site.

## Can the workers see private information?
No. They query through a read-only database login that is blocked from emails, phone numbers, addresses, payment details, tokens and private message bodies. Each query is limited to one SELECT, 50 rows and 10 seconds, and each run to 15 queries.

## Troubleshooting
- **"Skipped: Switched off"**: the worker is off; turn it on under The team.
- **"Skipped: Nothing new"**: no new activity since its last run, so it stayed asleep. That's normal.
- **"Skipped: Monthly cap reached"**: raise the cap or wait for the 1st.
- **"Already running"**: a run started in the last 15 minutes. Wait for it.
- **Error mentioning the Claude API**: check the API key in Vercel and your Anthropic billing.
- **No morning email**: check /admin/email for the ops_brief send, and that email isn't paused.
