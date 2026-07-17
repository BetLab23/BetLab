import { PageHeader } from "@/components/PageHeader";
export default function Matches(){
 return <section>
  <PageHeader title="Match Center" subtitle="Première journée 2026–2027 et futures données automatiques"/>
  <div className="filters">
   <button className="pill active">Tous</button><button className="pill">Premier League</button>
   <button className="pill">La Liga</button><button className="pill">Serie A</button>
   <button className="pill">Bundesliga</button><button className="pill">Ligue 1</button>
  </div>
  <div className="fixtures"><article className="fixture card">
<div><span className="league">Premier League</span><small>21 août 2026 · 21:00</small></div>
<div className="teams"><strong>Arsenal</strong><span>—</span><strong>Coventry City</strong></div>
<button className="secondary">Analyser</button>
</article>
<article className="fixture card">
<div><span className="league">Premier League</span><small>22 août 2026 · 13:30</small></div>
<div className="teams"><strong>Hull City</strong><span>—</span><strong>Manchester United</strong></div>
<button className="secondary">Analyser</button>
</article>
<article className="fixture card">
<div><span className="league">La Liga</span><small>15 août 2026 · 17:30</small></div>
<div className="teams"><strong>Deportivo Alavés</strong><span>—</span><strong>Getafe</strong></div>
<button className="secondary">Analyser</button>
</article>
<article className="fixture card">
<div><span className="league">Serie A</span><small>22 août 2026 · 18:30</small></div>
<div className="teams"><strong>Inter</strong><span>—</span><strong>Monza</strong></div>
<button className="secondary">Analyser</button>
</article>
<article className="fixture card">
<div><span className="league">Bundesliga</span><small>28 août 2026 · 20:30</small></div>
<div className="teams"><strong>Bayern Munich</strong><span>—</span><strong>VfB Stuttgart</strong></div>
<button className="secondary">Analyser</button>
</article>
<article className="fixture card">
<div><span className="league">Ligue 1</span><small>22 août 2026 · À confirmer</small></div>
<div className="teams"><strong>Marseille</strong><span>—</span><strong>Strasbourg</strong></div>
<button className="secondary">Analyser</button>
</article></div>
 </section>
}
