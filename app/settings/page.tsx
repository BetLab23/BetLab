import { PageHeader } from "@/components/PageHeader";
export default function Settings(){return <section>
<PageHeader title="Paramètres" subtitle="Compte, synchronisation et installation"/>
<div className="two-cols">
<article className="card"><h2>Synchronisation</h2><p className="muted">La structure Supabase est prête. Il reste à renseigner les deux variables d'environnement du projet.</p><span className="status pending">Non connectée</span></article>
<article className="card"><h2>Installation PWA</h2><p className="muted">Sur iPhone : Safari → Partager → Ajouter à l'écran d'accueil. Sur Windows : installer depuis Edge ou Chrome.</p><span className="status ready">Manifest prêt</span></article>
</div></section>}
