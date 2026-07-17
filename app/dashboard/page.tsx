import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";

export default function Dashboard(){
 return <section>
  <PageHeader title="Dashboard" subtitle="Vue d'ensemble de ton activité" action={<button className="primary">+ Nouveau pari</button>}/>
  <div className="kpi-grid">
    <KpiCard label="Bankroll" value="10 000 €" detail="Capital initial"/>
    <KpiCard label="Profit net" value="0 €" detail="Aucun pari clôturé"/>
    <KpiCard label="ROI" value="0 %" detail="Sur mises clôturées"/>
    <KpiCard label="Paris ouverts" value="0" detail="Exposition : 0 €"/>
  </div>
  <div className="two-cols">
   <article className="card"><h2>Paris récents</h2><div className="empty">Aucun pari enregistré.</div></article>
   <article className="card"><h2>À analyser</h2><div className="empty">Aucun match sélectionné.</div></article>
  </div>
 </section>
}
