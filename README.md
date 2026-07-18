# BetLab Core 0.3

Première version fonctionnelle de gestion des paris :

- connexion Supabase vérifiée ;
- session utilisateur anonyme Supabase ;
- création d'un pari ;
- lecture des paris ;
- dashboard dynamique (bankroll de référence 10 000 €, profit, ROI, exposition) ;
- page Paris alimentée par Supabase.

## Installation Supabase obligatoire

1. Dans Supabase : **Authentication → Providers → Anonymous Sign-Ins**, activer les connexions anonymes.
2. Dans **SQL Editor**, exécuter `supabase/schema.sql` si le schéma initial n'a jamais été installé.
3. Exécuter ensuite `supabase/v0.3_migration.sql`.
4. Conserver dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Le dépôt reste compatible avec le déploiement automatique GitHub → Vercel.
