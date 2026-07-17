import { PageHeader } from "@/components/PageHeader";
export default function Bankroll(){return <section>
<PageHeader title="Bankroll" subtitle="Capital, unités de mise et exposition"/>
<article className="card form-card">
<label>Bankroll initiale<input type="number" defaultValue="10000"/></label>
<label>Valeur d'une unité<input type="number" defaultValue="100"/></label>
<label>Exposition maximale (%)<input type="number" defaultValue="10"/></label>
<button className="primary">Enregistrer</button>
</article></section>}
