"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { listBets } from "@/lib/bets/client";
import type { Bet } from "@/lib/bets/types";
import { NewBetModal } from "./NewBetModal";
import { EditBetModal } from "./EditBetModal";

const INITIAL_BANKROLL = 10_000;

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function signedEuros(value: number) {
  const formatted = euros(Math.abs(value));

  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;

  return formatted;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: Bet["status"]) {
  if (status === "pending") return "Ouvert";
  if (status === "win") return "Gagné";
  if (status === "loss") return "Perdu";
  if (status === "void") return "Remboursé";
  if (status === "cashout") return "Cash out";

  return status;
}

function confidenceStars(confidence: number | null) {
  if (!confidence) return "☆☆☆☆☆";

  return Array.from({ length: 5 }, (_, index) =>
    index < confidence ? "★" : "☆"
  ).join("");
}

function valueLabel(value: Bet["value_rating"]) {
  if (value === "low") return "Value faible";
  if (value === "medium") return "Value moyenne";
  if (value === "high") return "Value forte";

  return null;
}

function betReferenceDate(bet: Bet) {
  return new Date(bet.updated_at ?? bet.kickoff_at ?? bet.created_at);
}

export function BetsWorkspace({
  mode,
}: {
  mode: "dashboard" | "bets";
}) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

  useEffect(() => {
    listBets()
      .then(setBets)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Lecture des paris impossible."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const pending = bets.filter((bet) => bet.status === "pending");

    const settled = bets.filter((bet) =>
      ["win", "loss", "void", "cashout"].includes(bet.status)
    );

    const decisive = settled.filter(
      (bet) => bet.status === "win" || bet.status === "loss"
    );

    const wins = decisive.filter((bet) => bet.status === "win");
    const losses = decisive.filter((bet) => bet.status === "loss");

    const totalStakedSettled = settled.reduce(
      (sum, bet) => sum + Number(bet.stake),
      0
    );

    const profit = settled.reduce(
      (sum, bet) => sum + Number(bet.profit_loss ?? 0),
      0
    );

    const exposure = pending.reduce(
      (sum, bet) => sum + Number(bet.stake),
      0
    );

    const bankroll = INITIAL_BANKROLL + profit;

    const roi =
      totalStakedSettled > 0
        ? (profit / totalStakedSettled) * 100
        : 0;

    const winRate =
      decisive.length > 0
        ? (wins.length / decisive.length) * 100
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const profit30Days = settled
      .filter((bet) => betReferenceDate(bet) >= thirtyDaysAgo)
      .reduce(
        (sum, bet) => sum + Number(bet.profit_loss ?? 0),
        0
      );

    const bestWin = wins.reduce<Bet | null>((best, bet) => {
      if (!best) return bet;

      return Number(bet.profit_loss ?? 0) >
        Number(best.profit_loss ?? 0)
        ? bet
        : best;
    }, null);

    const worstLoss = losses.reduce<Bet | null>((worst, bet) => {
      if (!worst) return bet;

      return Number(bet.profit_loss ?? 0) <
        Number(worst.profit_loss ?? 0)
        ? bet
        : worst;
    }, null);

    return {
      pendingCount: pending.length,
      settledCount: settled.length,
      winsCount: wins.length,
      lossesCount: losses.length,
      exposure,
      profit,
      bankroll,
      roi,
      winRate,
      profit30Days,
      bestWin,
      worstLoss,
    };
  }, [bets]);

  function addBet(bet: Bet) {
    setBets((current) => [bet, ...current]);
  }

  function replaceBet(updatedBet: Bet) {
    setBets((current) =>
      current.map((bet) =>
        bet.id === updatedBet.id ? updatedBet : bet
      )
    );
  }

  const header =
    mode === "dashboard" ? (
      <PageHeader
        title="Dashboard"
        subtitle="Pilotage de ta bankroll et de tes performances"
        action={
          <button
            className="primary"
            onClick={() => setModalOpen(true)}
          >
            + Nouveau pari
          </button>
        }
      />
    ) : (
      <PageHeader
        title="Paris"
        subtitle="Saisie, suivi et historique"
        action={
          <button
            className="primary"
            onClick={() => setModalOpen(true)}
          >
            + Ajouter
          </button>
        }
      />
    );

  return (
    <section>
      {header}

      {error && <div className="app-alert">{error}</div>}

      {mode === "dashboard" && (
        <>
          <div className="kpi-grid dashboard-kpis">
            <KpiCard
              label="Bankroll"
              value={euros(metrics.bankroll)}
              detail={`Capital initial : ${euros(INITIAL_BANKROLL)}`}
            />

            <KpiCard
              label="Profit net"
              value={signedEuros(metrics.profit)}
              detail={`${metrics.settledCount} pari(s) clôturé(s)`}
            />

            <KpiCard
              label="ROI"
              value={`${metrics.roi.toFixed(1)} %`}
              detail="Profit rapporté aux mises clôturées"
            />

            <KpiCard
              label="Win rate"
              value={`${metrics.winRate.toFixed(1)} %`}
              detail={`${metrics.winsCount} gagné(s) · ${metrics.lossesCount} perdu(s)`}
            />

            <KpiCard
              label="Performance 30 jours"
              value={signedEuros(metrics.profit30Days)}
              detail="Résultats des 30 derniers jours"
            />

            <KpiCard
              label="Paris ouverts"
              value={String(metrics.pendingCount)}
              detail={`Exposition : ${euros(metrics.exposure)}`}
            />

            <KpiCard
              label="Meilleure victoire"
              value={
                metrics.bestWin
                  ? signedEuros(
                      Number(metrics.bestWin.profit_loss ?? 0)
                    )
                  : "—"
              }
              detail={
                metrics.bestWin
                  ? `${metrics.bestWin.home_team} – ${metrics.bestWin.away_team}`
                  : "Aucun pari gagné"
              }
            />

            <KpiCard
              label="Plus forte perte"
              value={
                metrics.worstLoss
                  ? signedEuros(
                      Number(metrics.worstLoss.profit_loss ?? 0)
                    )
                  : "—"
              }
              detail={
                metrics.worstLoss
                  ? `${metrics.worstLoss.home_team} – ${metrics.worstLoss.away_team}`
                  : "Aucun pari perdu"
              }
            />
          </div>

          <div className="two-cols dashboard-panels">
            <article className="card">
              <div className="card-heading">
                <div>
                  <h2>Paris récents</h2>
                  <p>
                    Clique sur un pari pour le modifier ou le clôturer.
                  </p>
                </div>
              </div>

              <BetRows
                bets={bets.slice(0, 5)}
                loading={loading}
                onSelect={setSelectedBet}
              />
            </article>

            <article className="card">
              <div className="card-heading">
                <div>
                  <h2>Lecture rapide</h2>
                  <p>
                    Les indicateurs importants à surveiller.
                  </p>
                </div>
              </div>

              <div className="dashboard-summary">
                <SummaryLine
                  label="Capital engagé"
                  value={euros(metrics.exposure)}
                />

                <SummaryLine
                  label="Paris clôturés"
                  value={String(metrics.settledCount)}
                />

                <SummaryLine
                  label="Résultat global"
                  value={signedEuros(metrics.profit)}
                />

                <SummaryLine
                  label="Rendement"
                  value={`${metrics.roi.toFixed(1)} %`}
                />

                <div className="dashboard-insight">
                  {metrics.settledCount === 0
                    ? "Clôture plusieurs paris pour commencer à obtenir une lecture fiable de tes performances."
                    : metrics.profit > 0
                      ? "La bankroll progresse. L’objectif est maintenant de confirmer ce rendement sur un volume plus important."
                      : metrics.profit < 0
                        ? "La bankroll est en retrait. Il faudra analyser les marchés, les cotes et les mises avant d’augmenter l’exposition."
                        : "La bankroll est actuellement à l’équilibre."}
                </div>
              </div>
            </article>
          </div>
        </>
      )}

      {mode === "bets" && (
        <article className="card table-card">
          <BetsTable
            bets={bets}
            loading={loading}
            onSelect={setSelectedBet}
          />
        </article>
      )}

      <NewBetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={addBet}
      />

      <EditBetModal
        bet={selectedBet}
        onClose={() => setSelectedBet(null)}
        onUpdated={replaceBet}
      />
    </section>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BetRows({
  bets,
  loading,
  onSelect,
}: {
  bets: Bet[];
  loading: boolean;
  onSelect: (bet: Bet) => void;
}) {
  if (loading) {
    return <div className="empty">Chargement…</div>;
  }

  if (!bets.length) {
    return <div className="empty">Aucun pari enregistré.</div>;
  }

  return (
    <div className="recent-bets">
      {bets.map((bet) => {
        const tags = bet.tags ?? [];
        const betValueLabel = valueLabel(bet.value_rating);

        return (
          <button
            type="button"
            className="recent-bet premium-bet-row"
            key={bet.id}
            onClick={() => onSelect(bet)}
          >
            <div className="premium-bet-main">
              <div className="premium-bet-title">
                <strong>
                  {bet.home_team} – {bet.away_team}
                </strong>

                <span className={`bet-status ${bet.status}`}>
                  {statusLabel(bet.status)}
                </span>
              </div>

              <small>
                {bet.market} · {bet.selection}
              </small>

              <div className="bet-decision-meta">
                <span
                  className="bet-confidence"
                  aria-label={`Confiance ${bet.confidence ?? 0} sur 5`}
                >
                  {confidenceStars(bet.confidence)}
                </span>

                {betValueLabel && (
                  <span
                    className={`value-badge ${bet.value_rating ?? ""}`}
                  >
                    {betValueLabel}
                  </span>
                )}

                {tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bet-tag"
                  >
                    {tag}
                  </span>
                ))}

                {tags.length > 3 && (
                  <span className="bet-tag">
                    +{tags.length - 3}
                  </span>
                )}
              </div>
            </div>

            <div className="recent-bet-value">
              <strong>{Number(bet.odds).toFixed(2)}</strong>

              <small>
                {bet.profit_loss == null
                  ? euros(Number(bet.stake))
                  : signedEuros(Number(bet.profit_loss))}
              </small>
            </div>
          </button>
        );
      })}
    </div>
  );
}
function BetsTable({
  bets,
  loading,
  onSelect,
}: {
  bets: Bet[];
  loading: boolean;
  onSelect: (bet: Bet) => void;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Match</th>
          <th>Marché</th>
          <th>Décision</th>
          <th>Bookmaker</th>
          <th>Cote</th>
          <th>Mise</th>
          <th>Statut</th>
          <th>P/L</th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan={9} className="empty-cell">
              Chargement…
            </td>
          </tr>
        ) : bets.length ? (
          bets.map((bet) => {
            const tags = bet.tags ?? [];
            const betValueLabel = valueLabel(bet.value_rating);

            return (
              <tr
                key={bet.id}
                className="clickable-row"
                onClick={() => onSelect(bet)}
              >
                <td>
                  {formatDate(
                    bet.kickoff_at ?? bet.created_at
                  )}
                </td>

                <td>
                  <strong className="table-match">
                    {bet.home_team} – {bet.away_team}
                  </strong>

                  <small className="table-subtitle">
                    {bet.competition}
                  </small>
                </td>

                <td>
                  {bet.market}

                  <small className="table-subtitle">
                    {bet.selection}
                  </small>
                </td>

                <td>
                  <div className="table-decision">
                    <span
                      className="bet-confidence table-stars"
                      aria-label={`Confiance ${bet.confidence ?? 0} sur 5`}
                    >
                      {confidenceStars(bet.confidence)}
                    </span>

                    {betValueLabel && (
                      <span
                        className={`value-badge ${bet.value_rating ?? ""}`}
                      >
                        {betValueLabel}
                      </span>
                    )}

                    {tags.length > 0 && (
                      <small className="table-subtitle decision-tags">
                        {tags.slice(0, 3).join(" · ")}
                        {tags.length > 3
                          ? ` · +${tags.length - 3}`
                          : ""}
                      </small>
                    )}
                  </div>
                </td>

                <td>{bet.bookmaker}</td>

                <td>
                  {Number(bet.odds).toFixed(2)}
                </td>

                <td>
                  {euros(Number(bet.stake))}
                </td>

                <td>
                  <span
                    className={`bet-status ${bet.status}`}
                  >
                    {statusLabel(bet.status)}
                  </span>
                </td>

                <td>
                  {bet.profit_loss == null
                    ? "—"
                    : signedEuros(
                        Number(bet.profit_loss)
                      )}
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={9} className="empty-cell">
              Aucun pari enregistré.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
