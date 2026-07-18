"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateBet } from "@/lib/bets/client";
import type { Bet, BetStatus } from "@/lib/bets/types";

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function EditBetModal({ bet, onClose, onUpdated }: {
  bet: Bet | null;
  onClose: () => void;
  onUpdated: (bet: Bet) => void;
}) {
  const [form, setForm] = useState({
    kickoff_at: "", bookmaker: "", odds: "", stake: "", confidence: "", notes: "", status: "pending" as BetStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bet) return;
    setForm({
      kickoff_at: toLocalDateTime(bet.kickoff_at),
      bookmaker: bet.bookmaker,
      odds: String(bet.odds),
      stake: String(bet.stake),
      confidence: bet.confidence == null ? "" : String(bet.confidence),
      notes: bet.notes ?? "",
      status: bet.status,
    });
    setError("");
  }, [bet]);

  if (!bet) return null;
  const currentBet = bet;

  function profitLoss(status: BetStatus, odds: number, stake: number) {
    if (status === "win") return Number(((odds - 1) * stake).toFixed(2));
    if (status === "loss") return -stake;
    if (status === "void") return 0;
    return currentBet.profit_loss;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const odds = Number(form.odds);
      const stake = Number(form.stake);
      const updated = await updateBet(currentBet.id, {
        kickoff_at: form.kickoff_at ? new Date(form.kickoff_at).toISOString() : null,
        bookmaker: form.bookmaker.trim(),
        odds,
        stake,
        confidence: form.confidence ? Number(form.confidence) : null,
        notes: form.notes.trim() || null,
        status: form.status,
        profit_loss: profitLoss(form.status, odds, stake),
      });
      onUpdated(updated);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Modification impossible.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-bet-title" onMouseDown={(e)=>e.stopPropagation()}>
      <header className="modal-header">
        <div><h2 id="edit-bet-title">Modifier le pari</h2><p>{currentBet.home_team} – {currentBet.away_team}</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20}/></button>
      </header>
      <form className="bet-form" onSubmit={submit}>
        <div className="form-grid">
          <label>Date du match<input type="datetime-local" value={form.kickoff_at} onChange={(e)=>setForm({...form,kickoff_at:e.target.value})}/></label>
          <label>Bookmaker<input required value={form.bookmaker} onChange={(e)=>setForm({...form,bookmaker:e.target.value})}/></label>
          <label>Cote<input required min="1.01" step="0.01" type="number" value={form.odds} onChange={(e)=>setForm({...form,odds:e.target.value})}/></label>
          <label>Mise (€)<input required min="0.01" step="0.01" type="number" value={form.stake} onChange={(e)=>setForm({...form,stake:e.target.value})}/></label>
          <label>Confiance / 10<input min="1" max="10" type="number" value={form.confidence} onChange={(e)=>setForm({...form,confidence:e.target.value})}/></label>
          <label>Statut<select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as BetStatus})}>
            <option value="pending">Ouvert</option><option value="win">Gagné</option><option value="loss">Perdu</option><option value="void">Remboursé</option><option value="cashout">Cash out</option>
          </select></label>
        </div>
        <label>Notes<textarea rows={4} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/></label>
        <div className="settle-actions">
          <button type="button" className="settle win" onClick={()=>setForm({...form,status:"win"})}>Gagné</button>
          <button type="button" className="settle loss" onClick={()=>setForm({...form,status:"loss"})}>Perdu</button>
          <button type="button" className="settle void" onClick={()=>setForm({...form,status:"void"})}>Remboursé</button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <footer className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={saving}>{saving?"Enregistrement…":"Enregistrer"}</button></footer>
      </form>
    </section>
  </div>;
}
