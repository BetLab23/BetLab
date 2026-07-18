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

function getAssistantAnalysis(metrics: AssistantMetrics) {
  if (metrics.settledCount === 0) {
    return {
      greeting: "Bonjour Valentin.",
      title: "Je commence à construire ton historique.",
      summary:
        "Je manque encore de paris clôturés pour produire une analyse fiable. Continue à enregistrer tes décisions, leur niveau de confiance et leur value.",
      recommendations: [
        "Renseigne systématiquement la confiance et la value.",
        "Clôture les paris terminés pour alimenter les statistiques.",
      ],
    };
  }

  if (metrics.profit > 0 && metrics.roi >= 10) {
    return {
      greeting: "Bonjour Valentin.",
      title: "Ta dynamique actuelle est positive.",
      summary:
        "Ta bankroll progresse et ton rendement est élevé. Le principal enjeu est maintenant de confirmer cette performance sur un échantillon plus important.",
      recommendations: [
        "Conserve une gestion de mise disciplinée.",
        "Ne considère pas encore ce ROI comme définitivement acquis.",
      ],
    };
  }

  if (metrics.profit > 0) {
    return {
      greeting: "Bonjour Valentin.",
      title: "Ta bankroll progresse.",
      summary:
        "Les résultats sont positifs, mais le rendement doit encore être consolidé. La priorité reste la qualité des décisions plutôt que l’augmentation rapide des mises.",
      recommendations: [
        "Privilégie les paris présentant une value identifiable.",
        "Évite d’augmenter l’exposition après une courte série positive.",
      ],
    };
  }

  if (metrics.profit < 0) {
    return {
      greeting: "Bonjour Valentin.",
      title: "Ta bankroll traverse une phase de recul.",
      summary:
        "Avant d’augmenter ton exposition, il faut identifier les marchés, les tags et les niveaux de confiance associés aux pertes.",
      recommendations: [
        "Conserve ou réduis temporairement le niveau des mises.",
        "Analyse les décisions perdantes avant de chercher à te refaire.",
      ],
    };
  }

  return {
    greeting: "Bonjour Valentin.",
    title: "Ta bankroll est actuellement à l’équilibre.",
    summary:
      "Les résultats ne dégagent pas encore de tendance nette. Le prochain objectif est d’identifier les décisions qui créent réellement de la value.",
    recommendations: [
      "Continue à documenter chaque décision.",
      "Attends davantage de volume avant de tirer une conclusion.",
    ],
  };
}

export function BetAssistant({
  bets,
  metrics,
}: {
  bets: Bet[];
  metrics: AssistantMetrics;
}) {
  const analysis = getAssistantAnalysis(metrics);

  const pendingHighValueBets = bets.filter(
    (bet) =>
      bet.status === "pending" &&
      bet.value_rating === "high"
  );

  const highConfidencePendingBets = bets.filter(
    (bet) =>
      bet.status === "pending" &&
      Number(bet.confidence ?? 0) >= 4
  );

  return (
    <section className="bet-assistant">
      <div className="bet-assistant-topbar">
        <div className="bet-assistant-identity">
          <div className="bet-assistant-avatar" aria-hidden="true">
            B
          </div>

          <div>
            <span className="bet-assistant-eyebrow">
              Assistante BetLab
            </span>

            <h2>Analyse de ta stratégie</h2>
          </div>
        </div>

        <div className="bet-assistant-online">
          <span />
          Analyse locale
        </div>
      </div>

      <div className="bet-assistant-content">
        <div className="bet-assistant-message">
          <p className="bet-assistant-greeting">
            {analysis.greeting}
          </p>

          <h3>{analysis.title}</h3>

          <p className="bet-assistant-summary">
            {analysis.summary}
          </p>

          <div className="bet-assistant-signals">
            <div className="bet-assistant-signal">
              <span>Bankroll</span>
              <strong>{euros(metrics.bankroll)}</strong>
            </div>

            <div className="bet-assistant-signal">
              <span>Résultat global</span>
              <strong
                className={
                  metrics.profit > 0
                    ? "positive"
                    : metrics.profit < 0
                      ? "negative"
                      : ""
                }
              >
                {signedEuros(metrics.profit)}
              </strong>
            </div>

            <div className="bet-assistant-signal">
              <span>ROI</span>
              <strong>{metrics.roi.toFixed(1)} %</strong>
            </div>

            <div className="bet-assistant-signal">
              <span>Win rate</span>
              <strong>{metrics.winRate.toFixed(1)} %</strong>
            </div>
          </div>

          <div className="bet-assistant-recommendation">
            <span className="bet-assistant-section-label">
              Recommandation actuelle
            </span>

            <ul>
              {analysis.recommendations.map((recommendation) => (
                <li key={recommendation}>
                  <span aria-hidden="true">✓</span>
                  <p>{recommendation}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="bet-assistant-focus">
          <span className="bet-assistant-section-label">
            Surveillance
          </span>

          <div className="bet-assistant-focus-item">
            <div>
              <strong>{metrics.pendingCount}</strong>
              <span>Paris ouverts</span>
            </div>

            <small>
              {euros(metrics.exposure)} engagés
            </small>
          </div>

          <div className="bet-assistant-focus-item">
            <div>
              <strong>{pendingHighValueBets.length}</strong>
              <span>Value forte</span>
            </div>

            <small>
              Paris encore ouverts
            </small>
          </div>

          <div className="bet-assistant-focus-item">
            <div>
              <strong>{highConfidencePendingBets.length}</strong>
              <span>Confiance élevée</span>
            </div>

            <small>
              Niveau 4 ou 5 étoiles
            </small>
          </div>

          <div className="bet-assistant-alert">
            <span aria-hidden="true">!</span>

            <p>
              {metrics.pendingCount === 0
                ? "Aucune exposition en cours actuellement."
                : pendingHighValueBets.length > 0
                  ? `${pendingHighValueBets.length} pari(s) ouvert(s) sont classés en value forte.`
                  : "Aucun pari ouvert n’est actuellement classé en value forte."}
            </p>
          </div>
        </aside>
      </div>

      <div className="bet-assistant-prompt">
        <div>
          <span>Poser une question à l’assistante</span>

          <p>
            Le dialogue interactif sera activé lors de la connexion du moteur IA.
          </p>
        </div>

        <button type="button" disabled>
          Bientôt
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
