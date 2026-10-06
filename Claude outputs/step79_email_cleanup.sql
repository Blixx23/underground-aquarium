-- Step 79: failed emails that need you, and ones that don't.
--
-- Adds email_queue.cleared_at. A failed row with cleared_at set stays in the history but
-- stops counting as a failed email (no badge, no Dashboard item, no AI team mention, no
-- alert email). The site sets it for mail that was skipped on purpose: the do-not-email
-- list, placeholder addresses, duplicates, cancels and opt-outs. The new Clear button
-- sets it for anything you've looked at and don't want to retry.
--
-- Also clears what's already there: the skipped rows and the two Sept 26 test emails
-- that failed before the sender address was set up.
--
-- Safe to run more than once. Run this BEFORE the code goes live.

begin;

alter table public.email_queue add column if not exists cleared_at timestamptz;

update public.email_queue
set cleared_at = coalesce(alerted_at, now())
where status = 'failed'
  and cleared_at is null
  and (
    last_error like 'Not sent:%'
    or last_error = 'Cancelled from the admin panel'
    or last_error = 'Removed from outreach at their request'
    or last_error in ('Moved to the wholesale list', 'Shop hidden from the directory')
    or kind = 'campaign_test'
  );

commit;
