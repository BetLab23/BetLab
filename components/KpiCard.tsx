export function KpiCard({label,value,detail}:{label:string;value:string;detail?:string}){
  return <article className="card kpi"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>
}
