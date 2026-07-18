"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateBet } from "@/lib/bets/client";
import type {
  Bet,
  BetStatus,
  ValueRating,
} from "@/lib/bets/types";
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

function toLocalDateTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
}

type EditForm = {
  kickoff_at: string;
  bookmaker: string;
  odds: string;
  stake: string;
  confidence: number | null;
  value_rating: ValueRating | null;
  tags: string[];
  analysis: string;
  notes: string;
  status: BetStatus;
};

const emptyForm: EditForm = {
  kickoff_at: "",
  bookmaker: "",
  odds: "",
  stake: "",
  confidence: null,
  value_rating: null,
  tags: [],
  analysis: "",
  notes: "",
  status: "pending",
};

export function EditBetModal({
  bet,
  onClose,
  onUpdated,
}: {
  bet: Bet | null;
  onClose: () => void;
  onUpdated: (bet: Bet) => void;
}) {
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bet) return;

    setForm({
      kickoff_at: toLocalDateTime(bet.kickoff_at),
      bookmaker: bet.bookmaker,
      odds: String(bet.odds),
      stake: String(bet.stake),
      confidence: bet.confidence,
      value_rating: bet.value_rating,
      tags: bet.tags ?? [],
      analysis: bet.analysis ?? "",
      notes: bet.notes ?? "",
      status: bet.status,
    });

    setError("");
  }, [bet]);

  if (!bet) return null;

  const currentBet = bet;

  function calculateProfitLoss(
    status: BetStatus,
    odds: number,
    stake: number
  ) {
    if (status === "win") {
      return Number(((odds - 1) * stake).toFixed(2));
    }

    if (status === "loss") {
      return -stake;
    }

    if (status === "void") {
      return 0;
    }

    return currentBet.profit_loss;
  }

  function updateText(
    name:
      | "kickoff_at"
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const odds = Number(form.odds);
      const stake = Number(form.stake);

      const updated = await updateBet(currentBet.id, {
        kickoff_at: form.kickoff_at
          ? new Date(form.kickoff_at).toISOString()
          : null,
        bookmaker: form.bookmaker.trim(),
        odds,
        stake,
        confidence: form.confidence,
        value_rating: form.value_rating,
        tags: form.tags,
        analysis: form.analysis.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
        profit_loss: calculateProfitLoss(
          form.status,
          odds,
          stake
        ),
      });

      onUpdated(updated);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Modification impossible."
      );
    } finally {
      setSaving(false);
    }
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
        aria-labelledby="edit-bet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="edit-bet-title">Modifier le pari</h2>
            <p>
              {currentBet.home_team} – {currentBet.away_team}
            </p>
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

            <label>
              Statut
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as BetStatus,
                  }))
                }
              >
                <option value="pending">Ouvert</option>
                <option value="win">Gagné</option>
                <option value="loss">Perdu</option>
                <option value="void">Remboursé</option>
                <option value="cashout">Cash out</option>
              </select>
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
                      value_rating:
                        option.value as ValueRating,
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

          <div className="settle-actions">
            <button
              type="button"
              className="settle win"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  status: "win",
                }))
              }
            >
              Gagné
            </button>

            <button
              type="button"
              className="settle loss"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  status: "loss",
                }))
              }
            >
              Perdu
            </button>

            <button
              type="button"
              className="settle void"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  status: "void",
                }))
              }
            >
              Remboursé
            </button>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <footer className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={onClose}
            >
              Annuler
            </button>

            <button
              className="primary"
              disabled={saving}
            >
              {saving
                ? "Enregistrement…"
                : "Enregistrer"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
