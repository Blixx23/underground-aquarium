-- Step 77: which species can crossbreed.
--
-- A small, fact-checked table of 19 pairs (each one checked by a second, independent
-- reviewer; anything only rumored was left out). The site shows them on species pages
-- ("Can it crossbreed?"), in breeding guides ("Keep the line pure"), as a note in the
-- Tank Builder, and on /breeding/crossbreeding. Not connected to the Society.
--
-- Safe to run more than once.

begin;

create table if not exists public.species_crosses (
  id uuid primary key default gen_random_uuid(),
  species_a text not null,
  species_b text not null,
  outcome text not null check (outcome in ('fertile', 'sterile', 'rare')),
  result_slug text,
  note text not null,
  confidence text not null default 'high' check (confidence in ('high', 'medium')),
  created_at timestamptz not null default now(),
  -- One row per pair, always stored in alphabetical order.
  constraint species_crosses_order check (species_a < species_b),
  constraint species_crosses_pair unique (species_a, species_b)
);

alter table public.species_crosses enable row level security;
drop policy if exists "Crossbreeding pairs are public" on public.species_crosses;
create policy "Crossbreeding pairs are public" on public.species_crosses for select using (true);
grant select on public.species_crosses to anon, authenticated;

insert into public.species_crosses (species_a, species_b, outcome, result_slug, note, confidence) values
  ($v$endlers-livebearer$v$, $v$guppy$v$, 'fertile', null, $v$Endler's and guppies interbreed freely and the young are fertile, so keep them apart if you want pure Endler's lines.$v$, 'high'),
  ($v$platy$v$, $v$swordtail$v$, 'fertile', null, $v$Platies and swordtails cross easily with fertile young; many store swordtails already carry platy genes.$v$, 'high'),
  ($v$platy$v$, $v$variatus-platy$v$, 'fertile', null, $v$Common and variatus platies cross readily with fertile young; many store platies carry genes from both.$v$, 'high'),
  ($v$swordtail$v$, $v$variatus-platy$v$, 'fertile', null, $v$Swordtails and variatus platies can cross and the young are fertile, so mixed tanks may give in between fish.$v$, 'medium'),
  ($v$molly$v$, $v$sailfin-molly$v$, 'fertile', null, $v$Short fin and sailfin mollies cross freely with fertile young; many store mollies are already mixes of the two.$v$, 'high'),
  ($v$common-goldfish$v$, $v$koi$v$, 'sterile', null, $v$Goldfish and koi can spawn together in ponds; the hybrids grow fine but are usually sterile.$v$, 'high'),
  ($v$australian-rainbowfish$v$, $v$duboulays-rainbowfish$v$, 'fertile', null, $v$These two crimson spotted rainbowfish hybridize in the wild and in tanks with fertile young; keep them apart for pure lines.$v$, 'high'),
  ($v$celestial-pearl-danio$v$, $v$emerald-dwarf-rasbora$v$, 'rare', null, $v$Celestial pearl danios and emerald dwarf rasboras can cross and hybrids are sold; how well the young breed on is unclear.$v$, 'medium'),
  ($v$pearl-danio$v$, $v$zebra-danio$v$, 'sterile', null, $v$Zebra and pearl danios have produced hybrids in lab crosses, but the young are mostly sterile, so it rarely matters in a tank.$v$, 'medium'),
  ($v$altum-angelfish$v$, $v$angelfish$v$, 'fertile', null, $v$Altum and common angels can cross in aquariums, so keep them apart to protect pure wild altum lines.$v$, 'medium'),
  ($v$convict-cichlid$v$, $v$honduran-red-point$v$, 'fertile', null, $v$Convicts and Honduran red points are close relatives that interbreed; keep only one in a tank to keep lines pure.$v$, 'medium'),
  ($v$midas-cichlid$v$, $v$red-devil-cichlid$v$, 'fertile', null, $v$Midas and red devils cross easily with fertile young, in the wild and in tanks; many store red devils are mixed.$v$, 'high'),
  ($v$midas-cichlid$v$, $v$synspilum-cichlid$v$, 'sterile', $v$blood-parrot-cichlid$v$, $v$Widely cited as the blood parrot cross; parentage is debated and most males from it are sterile.$v$, 'medium'),
  ($v$red-devil-cichlid$v$, $v$trimac-cichlid$v$, 'fertile', $v$flowerhorn-cichlid$v$, $v$Trimac crosses with red devil and midas types were the start of flowerhorns; exact parentage is debated.$v$, 'medium'),
  ($v$flowerhorn-cichlid$v$, $v$texas-cichlid$v$, 'fertile', null, $v$Texas cichlids and flowerhorns can cross; this is one claimed source of the Red Texas hybrid, though that is debated.$v$, 'medium'),
  ($v$cobalt-blue-zebra$v$, $v$red-zebra-cichlid$v$, 'fertile', null, $v$These zebra mbuna cross freely with fertile young; mixed zebra colonies soon lose their pure colors.$v$, 'high'),
  ($v$electric-blue-hap$v$, $v$peacock-cichlid$v$, 'fertile', null, $v$Peacocks and electric blue haps cross easily in mixed tanks, and hybrid blue fish often turn up in the trade.$v$, 'medium'),
  ($v$bee-shrimp$v$, $v$tiger-shrimp$v$, 'fertile', null, $v$Bee and tiger shrimp cross readily and the young breed on, so pure lines get muddied fast. Keep them in separate tanks.$v$, 'high'),
  ($v$betta$v$, $v$peaceful-betta$v$, 'fertile', null, $v$Bettas and peaceful bettas spawn together and the young are fertile, so wild imbellis lines are easily lost.$v$, 'high')
on conflict (species_a, species_b) do update
  set outcome = excluded.outcome, result_slug = excluded.result_slug, note = excluded.note, confidence = excluded.confidence;

commit;
