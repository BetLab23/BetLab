# BetLab — Phase 1 V0.1

Fondation de la vraie application BetLab :
- Next.js App Router + TypeScript ;
- interface responsive Windows / iPhone ;
- navigation fonctionnelle ;
- manifest PWA ;
- structure Supabase SSR ;
- schéma SQL sécurisé avec Row Level Security ;
- projet prêt à déployer sur Vercel.

## Lancer sur Windows

1. Installer Node.js LTS.
2. Ouvrir un terminal dans ce dossier.
3. Exécuter :

```bash
npm install
npm run dev
```

4. Ouvrir `http://localhost:3000`.

## Brancher Supabase

1. Créer un projet Supabase.
2. Copier `.env.example` vers `.env.local`.
3. Renseigner :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Exécuter `supabase/schema.sql` dans le SQL Editor de Supabase.

## Déployer

Importer le projet dans GitHub, puis dans Vercel. Vercel détectera automatiquement Next.js.
Ajouter les deux variables Supabase dans les variables d'environnement Vercel.

## Phase suivante

- connexion privée ;
- enregistrement réel des paris ;
- synchronisation PC ↔ iPhone ;
- ingestion automatique des rencontres ;
- page d'analyse d'un match.
