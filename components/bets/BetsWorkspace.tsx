"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { listBets } from "@/lib/bets/client";
import type { Bet } from "@/lib/bets/types";
import { NewBetModal } from "./NewBetModal";

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function BetsWorkspace({ mode }: { mode: "dashboard" | "bets" }) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    listBets()
      .then(setBets)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Lecture des paris impossible."))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const open = bets.filter((bet) => bet.status === "pending");
    const closed = bets.filter((bet) => bet.status !== "pending");
    const totalStakedClosed = closed.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const profit = closed.reduce((sum, bet) => sum + Number(bet.profit_loss ?? 0), 0);
    const exposure = open.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const bankroll = 10000 + profit;
    const roi = totalStakedClosed > 0 ? (profit / totalStakedClosed) * 100 : 0;
    return { open: open.length, exposure, profit, bankroll, roi };
  }, [bets]);

  function addBet(bet: Bet) {
    setBets((current) => [bet, ...current]);
  }

  const header = mode === "dashboard"
    ? <PageHeader title="Dashboard" subtitle="Vue d'ensemble de ton activité" action={<button className="primary" onClick={()=>setModalOpen(true)}>+ Nouveau pari</button>}/>
    : <PageHeader title="Paris" subtitle="Saisie, suivi et historique" action={<button className="primary" onClick={()=>setModalOpen(true)}>+ Ajouter</button>}/>;

  return <section>
    {header}
    {error && <div className="app-alert">{error}</div>}

    {mode === "dashboard" && <>
      <div className="kpi-grid">
        <KpiCard label="Bankroll" value={euros(metrics.bankroll)} detail="Base actuelle : 10 000 €"/>
        <KpiCard label="Profit net" value={euros(metrics.profit)} detail="Paris clôturés"/>
        <KpiCard label="ROI" value={`${metrics.roi.toFixed(1)} %`} detail="Sur mises clôturées"/>
        <KpiCard label="Paris ouverts" value={String(metrics.open)} detail={`Exposition : ${euros(metrics.exposure)}`}/>
      </div>
      <div className="two-cols">
        <article className="card"><h2>Paris récents</h2><BetRows bets={bets.slice(0,5)} loading={loading}/></article>
        <article className="card"><h2>À analyser</h2><div className="empty">Aucun match sélectionné.</div></article>
      </div>
    </>}

    {mode === "bets" && <article className="card table-card"><BetsTable bets={bets} loading={loading}/></article>}
    <NewBetModal open={modalOpen} onClose={()=>setModalOpen(false)} onCreated={addBet}/>
  </section>;
}

function BetRows({ bets, loading }: { bets: Bet[]; loading: boolean }) {
  if (loading) return <div className="empty">Chargement…</div>;
  if (!bets.length) return <div className="empty">Aucun pari enregistré.</div>;
  return <div className="recent-bets">{bets.map((bet)=><div className="recent-bet" key={bet.id}>
    <div><strong>{bet.home_team} – {bet.away_team}</strong><small>{bet.market} · {bet.selection}</small></div>
    <div className="recent-bet-value"><strong>{Number(bet.odds).toFixed(2)}</strong><small>{euros(Number(bet.stake))}</small></div>
  </div>)}</div>;
}

function BetsTable({ bets, loading }: { bets: Bet[]; loading: boolean }) {
  return <table><thead><tr><th>Date</th><th>Match</th><th>Marché</th><th>Bookmaker</th><th>Cote</th><th>Mise</th><th>Statut</th><th>P/L</th></tr></thead>
    <tbody>{loading ? <tr><td colSpan={8} className="empty-cell">Chargement…</td></tr> : bets.length ? bets.map((bet)=><tr key={bet.id}>
      <td>{date(bet.kickoff_at ?? bet.created_at)}</td><td>{bet.home_team} – {bet.away_team}</td><td>{bet.market}<small className="table-subtitle">{bet.selection}</small></td><td>{bet.bookmaker}</td><td>{Number(bet.odds).toFixed(2)}</td><td>{euros(Number(bet.stake))}</td><td><span className={`bet-status ${bet.status}`}>{bet.status}</span></td><td>{bet.profit_loss == null ? "—" : euros(Number(bet.profit_loss))}</td>
    </tr>) : <tr><td colSpan={8} className="empty-cell">Aucun pari enregistré.</td></tr>}</tbody></table>;
}
