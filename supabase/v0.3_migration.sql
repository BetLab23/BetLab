-- BetLab Core 0.3 — à exécuter une seule fois dans Supabase SQL Editor.
-- Pré-requis : activer Authentication > Providers > Anonymous Sign-Ins.

alter table public.bets add column if not exists sport text not null default 'Football';
alter table public.bets add column if not exists bookmaker text not null default 'Non renseigné';

create index if not exists bets_user_created_at_idx
on public.bets(user_id, created_at desc);
