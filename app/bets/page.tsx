import { PageHeader } from "@/components/PageHeader";
export default function Bets(){return <section>
<PageHeader title="Paris" subtitle="Saisie, suivi et historique" action={<button className="primary">+ Ajouter</button>}/>
<article className="card table-card"><table><thead><tr><th>Date</th><th>Match</th><th>Marché</th><th>Cote</th><th>Mise</th><th>Statut</th><th>P/L</th></tr></thead>
<tbody><tr><td colSpan={7} className="empty-cell">Aucun pari enregistré.</td></tr></tbody></table></article>
</section>}
