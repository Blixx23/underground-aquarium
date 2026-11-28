-- App builds 1.0.2 and later can set and clear the number on the app icon,
-- so only their pushes carry a badge count (older builds would be stuck with it).
alter table public.push_devices add column if not exists badges boolean not null default false;
