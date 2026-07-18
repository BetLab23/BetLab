"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { createBet } from "@/lib/bets/client";
import type { Bet } from "@/lib/bets/types";

const initialForm = {
  sport: "Football",
  competition: "",
  kickoff_at: "",
  home_team: "",
  away_team: "",
  market: "",
  selection: "",
  bookmaker: "",
  odds: "",
  stake: "",
  confidence: "5",
  notes: "",
};

export function NewBetModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (bet: Bet) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const bet = await createBet({
        sport: form.sport.trim(),
        competition: form.competition.trim(),
        kickoff_at: form.kickoff_at ? new Date(form.kickoff_at).toISOString() : null,
        home_team: form.home_team.trim(),
        away_team: form.away_team.trim(),
        market: form.market.trim(),
        selection: form.selection.trim(),
        bookmaker: form.bookmaker.trim(),
        odds: Number(form.odds),
        stake: Number(form.stake),
        confidence: form.confidence ? Number(form.confidence) : null,
        notes: form.notes.trim() || null,
      });
      onCreated(bet);
      setForm(initialForm);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'enregistrer le pari.");
    } finally {
      setSaving(false);
    }
  }

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-bet-title" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div><h2 id="new-bet-title">Nouveau pari</h2><p>Enregistrement direct dans Supabase</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20}/></button>
        </header>

        <form className="bet-form" onSubmit={submit}>
          <div className="form-grid">
            <label>Sport<input required value={form.sport} onChange={(e)=>update("sport",e.target.value)}/></label>
            <label>Compétition<input required value={form.competition} onChange={(e)=>update("competition",e.target.value)} placeholder="Ligue 1"/></label>
            <label>Équipe à domicile<input required value={form.home_team} onChange={(e)=>update("home_team",e.target.value)}/></label>
            <label>Équipe à l'extérieur<input required value={form.away_team} onChange={(e)=>update("away_team",e.target.value)}/></label>
            <label>Date du match<input type="datetime-local" value={form.kickoff_at} onChange={(e)=>update("kickoff_at",e.target.value)}/></label>
            <label>Bookmaker<input required value={form.bookmaker} onChange={(e)=>update("bookmaker",e.target.value)} placeholder="Betclic"/></label>
            <label>Marché<input required value={form.market} onChange={(e)=>update("market",e.target.value)} placeholder="Résultat du match"/></label>
            <label>Sélection<input required value={form.selection} onChange={(e)=>update("selection",e.target.value)} placeholder="Victoire domicile"/></label>
            <label>Cote<input required min="1.01" step="0.01" type="number" value={form.odds} onChange={(e)=>update("odds",e.target.value)}/></label>
            <label>Mise (€)<input required min="0.01" step="0.01" type="number" value={form.stake} onChange={(e)=>update("stake",e.target.value)}/></label>
            <label>Confiance / 10<input min="1" max="10" type="number" value={form.confidence} onChange={(e)=>update("confidence",e.target.value)}/></label>
          </div>
          <label>Notes<textarea rows={3} value={form.notes} onChange={(e)=>update("notes",e.target.value)} placeholder="Raisonnement, contexte, risques…"/></label>
          {error && <div className="form-error">{error}</div>}
          <footer className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Annuler</button>
            <button className="primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le pari"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
