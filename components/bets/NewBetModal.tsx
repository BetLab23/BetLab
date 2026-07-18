"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { createBet } from "@/lib/bets/client";
import type { Bet, ValueRating } from "@/lib/bets/types";
import { StarRating } from "@/components/bets/StarRating";

const availableTags = [
  "Forme",
  "Statistiques",
  "Blessures",
  "Motivation",
  "IA",
  "Live",
  "Feeling",
];

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
  confidence: 3 as number | null,
  value_rating: "medium" as ValueRating,
  tags: [] as string[],
  analysis: "",
  notes: "",
};

export function NewBetModal({
  open,
  onClose,
  onCreated,
}: {
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
        kickoff_at: form.kickoff_at
          ? new Date(form.kickoff_at).toISOString()
          : null,
        home_team: form.home_team.trim(),
        away_team: form.away_team.trim(),
        market: form.market.trim(),
        selection: form.selection.trim(),
        bookmaker: form.bookmaker.trim(),
        odds: Number(form.odds),
        stake: Number(form.stake),
        confidence: form.confidence,
        value_rating: form.value_rating,
        tags: form.tags,
        analysis: form.analysis.trim() || null,
        notes: form.notes.trim() || null,
      });

      onCreated(bet);
      setForm(initialForm);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'enregistrer le pari."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateText(
    name:
      | "sport"
      | "competition"
      | "kickoff_at"
      | "home_team"
      | "away_team"
      | "market"
      | "selection"
      | "bookmaker"
      | "odds"
      | "stake"
      | "analysis"
      | "notes",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function toggleTag(tag: string) {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="new-bet-title">Nouveau pari</h2>
            <p>Fiche de décision BetLab</p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </header>

        <form className="bet-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              Sport
              <input
                required
                value={form.sport}
                onChange={(event) =>
                  updateText("sport", event.target.value)
                }
              />
            </label>

            <label>
              Compétition
              <input
                required
                value={form.competition}
                onChange={(event) =>
                  updateText("competition", event.target.value)
                }
                placeholder="Ligue 1"
              />
            </label>

            <label>
              Équipe à domicile
              <input
                required
                value={form.home_team}
                onChange={(event) =>
                  updateText("home_team", event.target.value)
                }
              />
            </label>

            <label>
              Équipe à l&apos;extérieur
              <input
                required
                value={form.away_team}
                onChange={(event) =>
                  updateText("away_team", event.target.value)
                }
              />
            </label>

            <label>
              Date du match
              <input
                type="datetime-local"
                value={form.kickoff_at}
                onChange={(event) =>
                  updateText("kickoff_at", event.target.value)
                }
              />
            </label>

            <label>
              Bookmaker
              <input
                required
                value={form.bookmaker}
                onChange={(event) =>
                  updateText("bookmaker", event.target.value)
                }
                placeholder="Betclic"
              />
            </label>

            <label>
              Marché
              <input
                required
                value={form.market}
                onChange={(event) =>
                  updateText("market", event.target.value)
                }
                placeholder="Résultat du match"
              />
            </label>

            <label>
              Sélection
              <input
                required
                value={form.selection}
                onChange={(event) =>
                  updateText("selection", event.target.value)
                }
                placeholder="Victoire domicile"
              />
            </label>

            <label>
              Cote
              <input
                required
                min="1.01"
                step="0.01"
                type="number"
                value={form.odds}
                onChange={(event) =>
                  updateText("odds", event.target.value)
                }
              />
            </label>

            <label>
              Mise (€)
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={form.stake}
                onChange={(event) =>
                  updateText("stake", event.target.value)
                }
              />
            </label>
          </div>

          <StarRating
            value={form.confidence}
            onChange={(confidence) =>
              setForm((current) => ({
                ...current,
                confidence,
              }))
            }
          />

          <fieldset className="decision-fieldset">
            <legend>Value estimée</legend>

            <div className="decision-options">
              {[
                { value: "low", label: "Faible" },
                { value: "medium", label: "Moyenne" },
                { value: "high", label: "Forte" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    form.value_rating === option.value
                      ? "decision-option active"
                      : "decision-option"
                  }
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      value_rating: option.value as ValueRating,
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="decision-fieldset">
            <legend>Raisons du pari</legend>

            <div className="tag-selector">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={
                    form.tags.includes(tag)
                      ? "tag-option active"
                      : "tag-option"
                  }
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Analyse personnelle
            <textarea
              rows={4}
              value={form.analysis}
              onChange={(event) =>
                updateText("analysis", event.target.value)
              }
              placeholder="Pourquoi ce pari présente-t-il une opportunité ?"
            />
          </label>

          <label>
            Notes complémentaires
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) =>
                updateText("notes", event.target.value)
              }
              placeholder="Risques, informations à vérifier…"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <footer className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={onClose}
            >
              Annuler
            </button>

            <button className="primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer le pari"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
