-- Messaging upgrades: photos in chat, archiving conversations, and live "Seen".
-- Safe to run more than once. Only adds; nothing existing changes.

-- 1. Photos in messages (public URLs in the listing-images bucket, sender's own folder, named msg-*).
alter table public.listing_messages
  add column if not exists images text[];

-- 2. Each side can archive a conversation. It comes back on its own when a newer message arrives
--    (the inbox hides it only while archived_at is later than last_message_at).
alter table public.listing_threads
  add column if not exists buyer_archived_at timestamptz,
  add column if not exists seller_archived_at timestamptz;

-- 3. Live updates for read receipts: the open conversation hears when the other person reads it.
--    listing_messages is already live (the unread badge uses it).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'listing_threads'
  ) then
    alter publication supabase_realtime add table public.listing_threads;
  end if;
end $$;
