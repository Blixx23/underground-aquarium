import { SOCIETY_SLUG } from "@/lib/config";

/**
 * The one-page map of the database the agents read before they query.
 * It's a guide to what the tables mean, not a summary of the data: the
 * agents still query the real rows themselves.
 *
 * Private columns (emails, phones, addresses, payment details, message
 * bodies) are blocked at the database level and aren't listed here.
 */
export const TABLE_MAP = `
# Database map (Postgres, read-only through query_database)

Times are timestamptz in UTC. Chris is in America/Los_Angeles: use
(created_at at time zone 'America/Los_Angeles')::date for "his" day.
If a column you try is private you'll get "permission denied": pick other columns.
Status values below are the common ones; when unsure, check with select status, count(*) from x group by 1.
You can also look up columns: select column_name from information_schema.columns where table_name = 'x'.

## Members
- profiles: one row per member. created_at = sign-up time. username, full_name, last_active_date,
  login_streak, bubble_balance, suspended_at, deleted_at, is_admin. Exclude is_admin and deleted rows from member counts.
- follows (follower_id, following_id, created_at), user_trophies, bubble_events (user_id, delta, reason, created_at).

## The Society (paid membership, $25/yr: the only live revenue)
- clubs: the Society is the row where slug = '${SOCIETY_SLUG}'. Other rows are local clubs
  (approved, is_public, dues_amount_cents).
- club_members: club_id, user_id, status (for example 'active' or 'pending'), tier, honorary,
  joined_at, paid_through (dues good until), member_number, role, officer_title.
  Society members = club_members joined to the Society club id.
- dues_payments: dues paid (amount and dates; check columns), dues_reminders.
- spawn_logs (status, species_name, decided_at), society_certificates (kind, status), club_award_submissions.

## Classifieds marketplace (free, local pickup)
- listings: title, category, status ('active' is live; check the others), price_cents, is_free, is_wanted,
  region_slug, state_code, views, created_at, expires_at, user_id.
- listing_threads (listing_id, buyer_id, seller_id, last_message_at), listing_messages (thread_id, sender_id, created_at;
  bodies are private). market_regions, listing_region_counts.
- orders/products: the retired paid marketplace (a few legacy orders).

## Local fish stores (best traffic on the site)
- fish_stores: name, slug, city, state, status ('pending' = suggested by a member, waiting for approval), claimed_by,
  updated_at, wholesale_stage / wholesale_at (wholesale-only businesses, kept off the directory).
- store_claims (status 'pending' = an owner claiming a shop), store_edit_suggestions (status 'open' = a shop fix waiting),
  store_reviews (rating, created_at), store_ratings, store_posts (owner posts), store_favorites, store_photos,
  review_responses, store_special_hours.

## Community
- forum_threads: title, slug, category_id, author_id, reply_count, last_activity_at, created_at, hidden_at, is_seeded
  (seeded = starter threads, exclude from activity). forum_posts: thread_id, author_id, is_op, created_at, hidden_at.
  forum_categories (slug, name).
- feed_posts (user_id, created_at), community_feed (feed_type, title, href, like_count, comment_count, created_at).
- tanks (public community tanks: name, is_public, score, updated_at), tank_comments, tank_votes.
- events: title, status ('pending' = waiting for approval), starts_at, city, state. event_rsvps.

## Moderation queues (what "waiting on Chris" means)
- reports: status 'open' (target_type, reason, target_url, created_at).
- tank_reports: status 'open'.
- feedback: status 'new' or 'in_progress' (kind, message, page_url).
- species_suggestions, species_photos, species_videos, glossary_suggestions: status 'pending'.
- store_claims 'pending', store_edit_suggestions 'open', fish_stores 'pending', events 'pending'.
- club_members for the Society with status 'pending'.

## Learning
- courses (slug, title, level, is_published, members_only), course_completions (user_id, course_id, completed_at),
  course_section_progress, course_exam_attempts (score, passed, created_at).

## Species guide and content
- species (common_name, slug, water_type, care_level), species_photos, species_videos,
  glossary_terms, public_breeding_guides.

## Email
- email_queue: kind, status ('queued', 'sent', 'failed'), bulk, attempts, fail_reason, created_at, sent_at
  (addresses and contents are private).
- email_campaigns (key, name, active), email_campaign_steps, email_campaign_enrollments (store_id, status, sent_count,
  next_send_at, stop_reason, cycle).
- email_settings: paused, bulk_paused, daily_bulk_cap.

## The AI team itself
- ops_findings (your tickets: worker_key, kind, risk, status, title, created_at), ops_runs (past runs, cost_cents),
  ops_memory, ops_workers.
`.trim();

/** Where things are handled, so a finding can link straight to the right page. */
export const ADMIN_LINKS = `
Admin pages to link findings to (paths on ${"https://www.undergroundaquarium.com"}):
/admin/reports (flagged posts and members), /admin/tank-reports, /admin/feedback, /admin/species (suggested fish),
/admin/species-photos, /admin/species-videos, /admin/glossary, /admin/stores (store claims),
/admin/store-fixes, /admin/pending-shops (member-suggested shops), /admin/shops, /admin/wholesale,
/admin/events, /admin/email (queue and failures), /admin/campaigns, /admin/site-stats, /admin/shop-stats,
/admin/courses, /c/${SOCIETY_SLUG}/admin (Society roster and dues). Public pages: /forums/..., /fish/<slug>,
/aquarium-stores and /stores/<slug>, /marketplace/<state>/<region>, /listing/<slug>.
`.trim();
