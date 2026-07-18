"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  answerBetQuestion,
  generateProactiveInsights,
} from "@/lib/bets/analysis/engine";
import type {
  AnalysisAnswer,
} from "@/lib/bets/analysis/types";
import type {
  ProactiveInsight,
} from "@/lib/bets/analysis/engine";
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

type ConversationMessage =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
      title: string;
      highlights: string[];
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
        "Le moteur peut maintenant rechercher les compétitions, marchés, bookmakers, cotes, tags et niveaux de confiance associés aux pertes.",
      recommendations: [
        "Conserve ou réduis temporairement le niveau des mises.",
        "Demande-moi pourquoi tu perds afin d’identifier les segments à surveiller.",
      ],
    };
  }

  return {
    greeting: "Bonjour Valentin.",
    title: "Ta bankroll est actuellement à l’équilibre.",
    summary:
      "Les résultats ne dégagent pas encore de tendance nette. Le moteur peut néanmoins comparer tes différents segments de performance.",
    recommendations: [
      "Continue à documenter chaque décision.",
      "Compare les compétitions, les bookmakers et les niveaux de confiance.",
    ],
  };
}

function getInsightIcon(tone: ProactiveInsight["tone"]) {
  if (tone === "positive") return "↗";
  if (tone === "warning") return "!";
  return "i";
}

export function BetAssistant({
  bets,
  metrics,
}: {
  bets: Bet[];
  metrics: AssistantMetrics;
}) {
  const analysis = getAssistantAnalysis(metrics);

  const proactiveInsights = useMemo(
    () => generateProactiveInsights(bets),
    [bets]
  );

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    ConversationMessage[]
  >([]);

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

  function askAssistant(rawQuestion: string) {
    const cleanQuestion = rawQuestion.trim();

    if (!cleanQuestion) return;

    const result: AnalysisAnswer = answerBetQuestion(
      cleanQuestion,
      bets
    );

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: cleanQuestion,
      },
      {
        role: "assistant",
        title: result.title,
        content: result.answer,
        highlights: result.highlights,
      },
    ]);

    setQuestion("");
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    askAssistant(question);
  }

  return (
    <section className="bet-assistant">
      <div className="bet-assistant-topbar">
        <div className="bet-assistant-identity">
          <div
            className="bet-assistant-avatar"
            aria-hidden="true"
          >
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
          Moteur actif
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
              <strong>
                {metrics.roi.toFixed(1)} %
              </strong>
            </div>

            <div className="bet-assistant-signal">
              <span>Win rate</span>
              <strong>
                {metrics.winRate.toFixed(1)} %
              </strong>
            </div>
          </div>

          <div className="bet-assistant-recommendation">
            <span className="bet-assistant-section-label">
              Recommandation actuelle
            </span>

            <ul>
              {analysis.recommendations.map(
                (recommendation) => (
                  <li key={recommendation}>
                    <span aria-hidden="true">✓</span>
                    <p>{recommendation}</p>
                  </li>
                )
              )}
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
              <strong>
                {pendingHighValueBets.length}
              </strong>
              <span>Value forte</span>
            </div>

            <small>Paris encore ouverts</small>
          </div>

          <div className="bet-assistant-focus-item">
            <div>
              <strong>
                {highConfidencePendingBets.length}
              </strong>
              <span>Confiance élevée</span>
            </div>

            <small>Niveau 4 ou 5 étoiles</small>
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

      <div className="assistant-insights">
        <div className="assistant-insights-header">
          <div>
            <span className="bet-assistant-section-label">
              Insights BetLab
            </span>

            <h3>Signaux détectés automatiquement</h3>
          </div>

          <span className="assistant-insights-count">
            {proactiveInsights.length} signal
            {proactiveInsights.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="assistant-insights-grid">
          {proactiveInsights.map((insight) => (
            <article
              key={insight.id}
              className={`assistant-insight-card ${insight.tone}`}
            >
              <div
                className="assistant-insight-icon"
                aria-hidden="true"
              >
                {getInsightIcon(insight.tone)}
              </div>

              <div className="assistant-insight-content">
                <div className="assistant-insight-heading">
                  <strong>{insight.title}</strong>
                  <small>{insight.metric}</small>
                </div>

                <p>{insight.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="assistant-conversation">
          {messages.slice(-8).map(
            (message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`assistant-conversation-message ${message.role}`}
              >
                <span className="assistant-message-author">
                  {message.role === "assistant"
                    ? "BetLab"
                    : "Toi"}
                </span>

                {message.role === "assistant" && (
                  <strong className="assistant-message-title">
                    {message.title}
                  </strong>
                )}

                <p>{message.content}</p>

                {message.role === "assistant" &&
                  message.highlights.length > 0 && (
                    <div className="assistant-message-highlights">
                      {message.highlights.map(
                        (highlight) => (
                          <small key={highlight}>
                            {highlight}
                          </small>
                        )
                      )}
                    </div>
                  )}
              </div>
            )
          )}
        </div>
      )}

      <div className="assistant-suggestions">
        <button
          type="button"
          onClick={() =>
            askAssistant("Pourquoi je perds ?")
          }
        >
          Pourquoi je perds ?
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant(
              "Quel bookmaker est le plus performant ?"
            )
          }
        >
          Bookmakers
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant(
              "Quelle compétition fonctionne le mieux ?"
            )
          }
        >
          Compétitions
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant(
              "Analyse mes niveaux de confiance"
            )
          }
        >
          Confiance
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant(
              "Analyse mes plages de cotes"
            )
          }
        >
          Cotes
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant(
              "Quels tags performent le mieux ?"
            )
          }
        >
          Tags
        </button>
      </div>

      <form
        className="bet-assistant-prompt interactive"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          placeholder="Ex. Pourquoi je perds ?"
          aria-label="Question pour l’assistante BetLab"
        />

        <button
          type="submit"
          disabled={!question.trim()}
        >
          Envoyer
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <style jsx>{`
        .assistant-insights {
          margin: 0 22px 20px;
          padding-top: 20px;
          border-top: 1px solid
            rgba(143, 162, 189, 0.14);
        }

        .assistant-insights-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .assistant-insights-header h3 {
          margin: 5px 0 0;
          color: var(--text);
          font-size: 15px;
          line-height: 1.3;
        }

        .assistant-insights-count {
          flex-shrink: 0;
          padding: 6px 9px;
          border: 1px solid
            rgba(143, 162, 189, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.02);
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
        }

        .assistant-insights-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .assistant-insight-card {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          min-width: 0;
          padding: 13px;
          border: 1px solid
            rgba(143, 162, 189, 0.14);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.018);
        }

        .assistant-insight-card.positive {
          border-color: rgba(73, 214, 165, 0.22);
          background: rgba(73, 214, 165, 0.055);
        }

        .assistant-insight-card.warning {
          border-color: rgba(244, 178, 85, 0.24);
          background: rgba(244, 178, 85, 0.055);
        }

        .assistant-insight-card.neutral {
          border-color: rgba(113, 167, 255, 0.2);
          background: rgba(113, 167, 255, 0.045);
        }

        .assistant-insight-icon {
          display: grid;
          place-items: center;
          flex: 0 0 28px;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          color: var(--muted);
          background: rgba(143, 162, 189, 0.1);
          font-size: 13px;
          font-weight: 900;
        }

        .assistant-insight-card.positive
          .assistant-insight-icon {
          color: var(--accent);
          background: rgba(73, 214, 165, 0.12);
        }

        .assistant-insight-card.warning
          .assistant-insight-icon {
          color: #f4b255;
          background: rgba(244, 178, 85, 0.12);
        }

        .assistant-insight-card.neutral
          .assistant-insight-icon {
          color: #91b9ff;
          background: rgba(113, 167, 255, 0.1);
        }

        .assistant-insight-content {
          min-width: 0;
        }

        .assistant-insight-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .assistant-insight-heading strong {
          color: var(--text);
          font-size: 12px;
          line-height: 1.35;
        }

        .assistant-insight-heading small {
          flex-shrink: 0;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
        }

        .assistant-insight-content p {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.55;
        }

        .assistant-conversation {
          display: grid;
          gap: 10px;
          margin: 0 22px 16px;
          padding-top: 18px;
          border-top: 1px solid
            rgba(143, 162, 189, 0.14);
        }

        .assistant-conversation-message {
          max-width: 82%;
          padding: 12px 14px;
          border-radius: 13px;
        }

        .assistant-message-author {
          display: block;
          margin-bottom: 5px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .assistant-message-title {
          display: block;
          margin-bottom: 6px;
          color: var(--text);
          font-size: 13px;
        }

        .assistant-conversation-message p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
        }

        .assistant-conversation-message.user {
          justify-self: end;
          background: rgba(113, 167, 255, 0.12);
          border: 1px solid
            rgba(113, 167, 255, 0.25);
        }

        .assistant-conversation-message.user
          .assistant-message-author {
          color: #91b9ff;
        }

        .assistant-conversation-message.assistant {
          justify-self: start;
          background: rgba(73, 214, 165, 0.08);
          border: 1px solid
            rgba(73, 214, 165, 0.2);
        }

        .assistant-conversation-message.assistant
          .assistant-message-author {
          color: var(--accent);
        }

        .assistant-message-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .assistant-message-highlights small {
          padding: 5px 8px;
          border: 1px solid
            rgba(73, 214, 165, 0.18);
          border-radius: 999px;
          background: rgba(73, 214, 165, 0.06);
          color: var(--muted);
          font-size: 10px;
        }

        .assistant-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 22px 12px;
        }

        .assistant-suggestions button {
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 8px 11px;
          background: rgba(255, 255, 255, 0.02);
          color: var(--muted);
          font-size: 11px;
          cursor: pointer;
        }

        .assistant-suggestions button:hover {
          border-color: rgba(73, 214, 165, 0.35);
          color: var(--text);
        }

        .bet-assistant-prompt.interactive input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-size: 13px;
        }

        .bet-assistant-prompt.interactive
          input::placeholder {
          color: var(--muted);
        }

        .bet-assistant-prompt.interactive button {
          cursor: pointer;
          opacity: 1;
        }

        .bet-assistant-prompt.interactive
          button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        @media (max-width: 760px) {
          .assistant-insights-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .assistant-insights {
            margin-right: 17px;
            margin-left: 17px;
          }

          .assistant-insights-header {
            align-items: flex-start;
          }

          .assistant-insight-heading {
            display: grid;
            gap: 4px;
          }

          .assistant-conversation {
            margin-right: 17px;
            margin-left: 17px;
          }

          .assistant-conversation-message {
            max-width: 94%;
          }

          .assistant-suggestions {
            margin-right: 17px;
            margin-left: 17px;
          }
        }
      `}</style>
    </section>
  );
}
