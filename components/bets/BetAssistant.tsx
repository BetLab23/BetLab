import type { Bet } from "@/lib/bets/types";

type AssistantMetrics = {
  pendingCount: number;
  settledCount: number;
  exposure: number;
  profit: number;
  bankroll: number;
  roi: number;
  winRate: number;
  profit30Days: number;
};

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

function assistantMessage(metrics: AssistantMetrics) {
  if (metrics.settledCount === 0) {
    return {
      title: "Analyse en attente",
      message:
        "Enregistre et clôture plusieurs paris pour que je puisse commencer à analyser tes performances.",
    };
  }

  if (metrics.profit > 0 && metrics.roi > 5) {
    return {
      title: "Dynamique positive",
      message:
        "Ta bankroll progresse avec un rendement positif. Il faut maintenant vérifier si cette performance se confirme sur davantage de paris.",
    };
  }

  if (metrics.profit > 0) {
    return {
      title: "Bankroll en progression",
      message:
        "Tes résultats sont positifs, mais le rendement reste à consolider. Continue de privilégier les paris présentant une vraie value.",
    };
  }

  if (metrics.profit < 0) {
    return {
      title: "Phase de recul",
      message:
        "La bankroll est en retrait. Avant d’augmenter les mises, analyse les marchés, les niveaux de confiance et les types de paris les moins performants.",
    };
  }

  return {
    title: "Bankroll à l’équilibre",
    message:
      "Tes résultats sont actuellement neutres. Le prochain objectif est d’identifier les décisions qui créent réellement de la value.",
  };
}

export function BetAssistant({
  bets,
  metrics,
}: {
  bets: Bet[];
  metrics: AssistantMetrics;
}) {
  const insight = assistantMessage(metrics);
  const highValueBets = bets.filter(
    (bet) =>
      bet.status === "pending" &&
      bet.value_rating === "high"
  );

  return (
    <aside className="bet-assistant card">
      <div className="assistant-header">
        <div className="assistant-avatar" aria-hidden="true">
          B
        </div>

        <div>
          <span className="assistant-eyebrow">
            Assistante BetLab
          </span>

          <h2>{insight.title}</h2>
        </div>

        <span className="assistant-status">
          Analyse locale
        </span>
      </div>

      <p className="assistant-message">
        {insight.message}
      </p>

      <div className="assistant-indicators">
        <div>
          <span>Bankroll</span>
          <strong>{euros(metrics.bankroll)}</strong>
        </div>

        <div>
          <span>Résultat</span>
          <strong>{signedEuros(metrics.profit)}</strong>
        </div>

        <div>
          <span>ROI</span>
          <strong>{metrics.roi.toFixed(1)} %</strong>
        </div>
      </div>

      <div className="assistant-focus">
        <span>Point d’attention</span>

        <p>
          {highValueBets.length > 0
            ? `${highValueBets.length} pari(s) ouvert(s) sont classés en value forte, pour une exposition totale de ${euros(metrics.exposure)}.`
            : metrics.pendingCount > 0
              ? `${metrics.pendingCount} pari(s) sont actuellement ouverts, mais aucun n’est classé en value forte.`
              : "Aucun pari n’est actuellement ouvert."}
        </p>
      </div>

      <button
        type="button"
        className="assistant-details-button"
        disabled
      >
        Voir l’analyse détaillée
        <span>Bientôt</span>
      </button>
    </aside>
  );
}
