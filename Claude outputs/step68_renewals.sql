-- Step 68: Renewals tracker (Admin > Dashboard > Renewals)
-- A table of everything that expires: domains, the DMCA agent, subscriptions, licenses.
-- Admin only: RLS is on with no policies, so only the server (service role) reads or writes it.
--
-- Replaces the earlier key-dates version. If you already ran that one, this removes
-- its table (it only held the two starter rows).

drop table if exists public.important_dates;

create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'other',          -- domain, legal, subscription, hosting, license, other
  provider text,                                -- who it's with (Bluehost, Copyright Office, Google...)
  account text,                                 -- which login manages it (an email, never a password)
  expires_on date,                              -- null = not known yet
  renew_months integer check (renew_months is null or renew_months between 1 and 120),
  auto_renew boolean,                           -- null = not sure
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  remind_days integer not null default 30 check (remind_days between 0 and 365),
  remind_on date,                               -- expires_on minus remind_days, kept by the app
  link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists renewals_remind_idx on public.renewals (remind_on);

alter table public.renewals enable row level security;

-- The AI team can read it (nothing private in here).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'ops_reader') then
    grant select on public.renewals to ops_reader;
  end if;
end $$;

-- What we already know. Fill in the blanks (expiry dates, costs) on the page.
insert into public.renewals (name, kind, provider, account, expires_on, renew_months, auto_renew, cost_cents, remind_days, remind_on, link, notes)
select * from (values
  ('DMCA designated agent (DMCA-1081928)', 'legal', 'U.S. Copyright Office', 'chris@undergroundaquarium.com',
   date '2029-10-04', 36, false, 600, 60, date '2029-10-04' - 60, 'https://dmca.copyright.gov',
   'Lapsing loses the safe harbor for what members post. If the address or phone changes, update the Terms page too.'),
  ('undergroundaquarium.com domain', 'domain', 'Bluehost', null,
   null::date, 12, null::boolean, null::integer, 60, null::date, 'https://my.bluehost.com',
   'Add the expiry date from Bluehost. Also check auto-renew is on and the card on file is current.'),
  ('Google Workspace (chris@ and support@)', 'subscription', 'Google', 'chris@undergroundaquarium.com',
   null::date, 12, true, null::integer, 30, null::date, 'https://admin.google.com',
   'Business email. Add the renewal date and price from the Google Admin billing page.')
) as v(name, kind, provider, account, expires_on, renew_months, auto_renew, cost_cents, remind_days, remind_on, link, notes)
where not exists (select 1 from public.renewals r where r.name = v.name);

select name, expires_on from public.renewals order by expires_on nulls last;
