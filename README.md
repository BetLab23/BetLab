# BetLab Core 0.2

Version prête pour GitHub et Vercel.

## Nouveauté principale

Le bandeau latéral n'est plus codé en dur. Il vérifie réellement la disponibilité de l'API Supabase via `/api/supabase-status` :

- **Supabase connecté** : URL et clé valides, API joignable.
- **Configuration incomplète** : variable Vercel absente.
- **Supabase indisponible** : clé invalide, projet arrêté ou API inaccessible.

## Variables Vercel requises

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Après modification des variables, redéployer le projet.

## Important

Cette version valide la connexion d'infrastructure. La persistance fonctionnelle des paris et de la bankroll sera branchée dans l'étape suivante, après création du schéma `supabase/schema.sql` et mise en place de l'authentification utilisateur.
