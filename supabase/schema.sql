create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_external_id text,
  competition text not null,
  kickoff_at timestamptz,
  home_team text not null,
  away_team text not null,
  market text not null,
  selection text not null,
  odds numeric(8,3) not null check (odds > 1),
  stake numeric(12,2) not null check (stake > 0),
  confidence smallint check (confidence between 1 and 10),
  status text not null default 'pending' check (status in ('pending','win','loss','void','cashout')),
  profit_loss numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_external_id text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, fixture_external_id)
);

alter table public.profiles enable row level security;
alter table public.bets enable row level security;
alter table public.watchlist enable row level security;

create policy "profiles own rows" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "bets own rows" on public.bets
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "watchlist own rows" on public.watchlist
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
