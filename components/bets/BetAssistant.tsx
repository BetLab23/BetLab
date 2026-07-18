"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  answerBetQuestion,
  generateProactiveInsights,
} from "@/lib/bets/analysis/engine";
import { calculateDecisionScore } from "@/lib/bets/analysis/decisionScore";
import { generateCoachReport } from "@/lib/bets/analysis/coach";
import type {
  AnalysisAnswer,
  DecisionScoreComponent,
  DecisionScoreTone,
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

type CopilotMode = "alfred" | "lara" | "duo";

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

function getDecisionToneLabel(tone: DecisionScoreTone) {
  if (tone === "excellent") return "Excellent";
  if (tone === "good") return "Solide";
  if (tone === "warning") return "À améliorer";
  if (tone === "critical") return "Fragile";

  return "Provisoire";
}

function getComponentScoreLabel(
  component: DecisionScoreComponent
) {
  return `${component.score} / ${component.maximumScore}`;
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

  const decisionScore = useMemo(
    () => calculateDecisionScore(bets),
    [bets]
  );

  const coachReport = useMemo(
    () => generateCoachReport(bets, decisionScore),
    [bets, decisionScore]
  );

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    ConversationMessage[]
  >([]);
  const [copilotMode, setCopilotMode] =
    useState<CopilotMode>("alfred");
  const [personasUnlocked, setPersonasUnlocked] =
    useState(false);

  const copilotIdentity =
    copilotMode === "alfred"
      ? {
          name: "Alfred",
          eyebrow: "Copilote BetLab",
          subtitle: "Calme, rigoureux et structuré",
          image: "/alfred-avatar.png",
        }
      : copilotMode === "lara"
        ? {
            name: "Lara",
            eyebrow: "Copilote BetLab",
            subtitle: "Chaleureuse, intuitive et directe",
            image: "/lara-avatar.png",
          }
        : {
            name: "Alfred & Lara",
            eyebrow: "Duo de copilotes BetLab",
            subtitle: "Deux personnalités, un même moteur",
            image: "",
          };

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

    const normalizedCommand = cleanQuestion
      .toLocaleLowerCase("fr-FR")
      .replace(/[.!?]+$/g, "")
      .trim();

    if (normalizedCommand === "fin batmobile") {
      setPersonasUnlocked(false);
      setCopilotMode("alfred");

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          title: "Accès spécial refermé",
          content:
            "Retour au mode Alfred. Lara et le mode Duo sont désormais masqués.",
          highlights: [
            "Mode Alfred",
            "Copilotes masqués",
          ],
        },
      ]);

      setQuestion("");
      return;
    }

    if (
      copilotMode === "alfred" &&
      normalizedCommand === "batmobile"
    ) {
      setPersonasUnlocked(true);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          title: "Accès copilotes déverrouillé",
          content:
            "Code reconnu. Lara et le mode Duo sont désormais disponibles.",
          highlights: [
            "Lara activée",
            "Mode Duo activé",
          ],
        },
      ]);

      setQuestion("");
      return;
    }

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
          {copilotMode === "duo" ? (
            <div
              className="bet-assistant-avatar-stack"
              aria-label="Alfred et Lara"
            >
              <img
                src="/alfred-avatar.png"
                alt="Alfred"
              />
              <img
                src="/lara-avatar.png"
                alt="Lara"
              />
            </div>
          ) : (
            <img
              className="bet-assistant-avatar-image"
              src={copilotIdentity.image}
              alt={copilotIdentity.name}
            />
          )}

          <div>
            <span className="bet-assistant-eyebrow">
              {copilotIdentity.eyebrow}
            </span>

            <h2>{copilotIdentity.name}</h2>

            <p className="bet-assistant-persona-subtitle">
              {copilotIdentity.subtitle}
            </p>
          </div>
        </div>

        <div className="bet-assistant-actions">
          {personasUnlocked && (
            <div
              className="copilot-selector"
              role="group"
              aria-label="Choisir le copilote"
            >
              <button
                type="button"
                className={
                  copilotMode === "alfred" ? "active" : ""
                }
                onClick={() => setCopilotMode("alfred")}
              >
                <img
                  src="/alfred-avatar.png"
                  alt=""
                  aria-hidden="true"
                />
                Alfred
              </button>

              <button
                type="button"
                className={
                  copilotMode === "lara" ? "active" : ""
                }
                onClick={() => setCopilotMode("lara")}
              >
                <img
                  src="/lara-avatar.png"
                  alt=""
                  aria-hidden="true"
                />
                Lara
              </button>

              <button
                type="button"
                className={
                  copilotMode === "duo" ? "active" : ""
                }
                onClick={() => setCopilotMode("duo")}
              >
                Duo
              </button>
            </div>
          )}

          <div className="bet-assistant-online">
            <span />
            Moteur actif
          </div>
        </div>
      </div>

      <div className="bet-assistant-content">
        <div className="bet-assistant-message">
          <p className="bet-assistant-greeting">
            {copilotMode === "alfred"
              ? "Alfred à ton service."
              : copilotMode === "lara"
                ? "Lara est avec toi."
                : analysis.greeting}
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

      <div className="decision-score">
        <div className="decision-score-header">
          <div>
            <span className="bet-assistant-section-label">
              Decision Score
            </span>

            <h3>Qualité de ton processus de décision</h3>
          </div>

          <div
            className={`decision-score-badge ${decisionScore.tone}`}
          >
            <strong>{decisionScore.score}</strong>
            <span>/ 100</span>
          </div>
        </div>

        <div className="decision-score-summary">
          <div>
            <strong>{decisionScore.label}</strong>
            <span>
              {getDecisionToneLabel(decisionScore.tone)}
            </span>
          </div>

          <p>
            {decisionScore.isReliable
              ? `Score calculé sur ${decisionScore.sampleSize} pari(s) clôturé(s) exploitables.`
              : `Score provisoire calculé sur ${decisionScore.sampleSize} pari(s) clôturé(s). La fiabilité complète commence à 10.`}
          </p>
        </div>

        <div className="decision-score-components">
          {decisionScore.components.map((component) => (
            <article
              key={component.id}
              className={`decision-score-component ${component.tone}`}
            >
              <div className="decision-score-component-heading">
                <div>
                  <strong>{component.label}</strong>
                  <small>{component.summary}</small>
                </div>

                <span>
                  {getComponentScoreLabel(component)}
                </span>
              </div>

              <div className="decision-score-progress">
                <span
                  style={{
                    width: `${component.percentage}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>

        {(decisionScore.strengths.length > 0 ||
          decisionScore.warnings.length > 0) && (
          <div className="decision-score-analysis">
            {decisionScore.strengths.length > 0 && (
              <div className="decision-score-list strengths">
                <span>Points forts</span>

                <ul>
                  {decisionScore.strengths.map(
                    (strength) => (
                      <li key={strength}>{strength}</li>
                    )
                  )}
                </ul>
              </div>
            )}

            {decisionScore.warnings.length > 0 && (
              <div className="decision-score-list warnings">
                <span>À surveiller</span>

                <ul>
                  {decisionScore.warnings.map(
                    (warning) => (
                      <li key={warning}>{warning}</li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="coach-report">
        <div className="coach-report-header">
          <div>
            <span className="bet-assistant-section-label">
              AI Coach
            </span>

            <h3>Diagnostic de ton processus</h3>
          </div>

          <span
            className={`coach-report-status ${
              coachReport.isReliable
                ? "reliable"
                : "provisional"
            }`}
          >
            {coachReport.isReliable
              ? "Diagnostic fiable"
              : "Diagnostic provisoire"}
          </span>
        </div>

        <p className="coach-report-summary">
          {coachReport.summary}
        </p>

        <div className="coach-report-meta">
          <span>
            {coachReport.sampleSize} pari
            {coachReport.sampleSize > 1 ? "s" : ""} analysé
            {coachReport.sampleSize > 1 ? "s" : ""}
          </span>

          <span>
            {coachReport.detectedBiases.length} biais détecté
            {coachReport.detectedBiases.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="coach-report-grid">
          {coachReport.observations.length > 0 && (
            <section className="coach-report-section observations">
              <span className="coach-report-section-title">
                Observations
              </span>

              <div className="coach-report-items">
                {coachReport.observations.map((item) => (
                  <article key={item.id} className="coach-report-item">
                    <div>
                      <strong>{item.title}</strong>
                      {item.metric && <small>{item.metric}</small>}
                    </div>

                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {coachReport.strengths.length > 0 && (
            <section className="coach-report-section strengths">
              <span className="coach-report-section-title">
                Points forts
              </span>

              <div className="coach-report-items">
                {coachReport.strengths.map((item) => (
                  <article key={item.id} className="coach-report-item">
                    <div>
                      <strong>{item.title}</strong>
                      {item.metric && <small>{item.metric}</small>}
                    </div>

                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {coachReport.weaknesses.length > 0 && (
            <section className="coach-report-section weaknesses">
              <span className="coach-report-section-title">
                Axes d’amélioration
              </span>

              <div className="coach-report-items">
                {coachReport.weaknesses.map((item) => (
                  <article key={item.id} className="coach-report-item">
                    <div>
                      <strong>{item.title}</strong>
                      {item.metric && <small>{item.metric}</small>}
                    </div>

                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {coachReport.recommendations.length > 0 && (
            <section className="coach-report-section recommendations">
              <span className="coach-report-section-title">
                Recommandations
              </span>

              <div className="coach-report-items">
                {coachReport.recommendations.map((item) => (
                  <article key={item.id} className="coach-report-item">
                    <div>
                      <strong>{item.title}</strong>
                      {item.metric && <small>{item.metric}</small>}
                    </div>

                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {coachReport.detectedBiases.length > 0 && (
          <section className="coach-biases">
            <div className="coach-biases-header">
              <span>Biais détectés</span>
              <small>
                Analyse comportementale automatique
              </small>
            </div>

            <div className="coach-biases-grid">
              {coachReport.detectedBiases.map((item) => (
                <article
                  key={item.id}
                  className={`coach-bias-card ${item.tone}`}
                >
                  <div className="coach-bias-icon" aria-hidden="true">
                    !
                  </div>

                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {coachReport.observations.length === 0 &&
          coachReport.strengths.length === 0 &&
          coachReport.weaknesses.length === 0 &&
          coachReport.recommendations.length === 0 &&
          coachReport.detectedBiases.length === 0 && (
            <div className="coach-report-empty">
              <strong>Historique encore limité</strong>
              <p>
                Le coach commencera à produire un diagnostic détaillé
                dès que davantage de paris clôturés seront disponibles.
              </p>
            </div>
          )}
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
          placeholder="Pose une question à Alfred..."
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
        .bet-assistant-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .bet-assistant-identity {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .bet-assistant-identity h2 {
          margin: 3px 0 0;
        }

        .bet-assistant-avatar-image {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          object-fit: cover;
          object-position: center 24%;
          border: 1px solid rgba(208, 174, 104, 0.35);
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .bet-assistant-avatar-stack {
          position: relative;
          width: 79px;
          height: 56px;
          flex: 0 0 79px;
        }

        .bet-assistant-avatar-stack img {
          position: absolute;
          top: 0;
          width: 54px;
          height: 54px;
          object-fit: cover;
          object-position: center 24%;
          border: 2px solid #10151c;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .bet-assistant-avatar-stack img:first-child {
          left: 0;
        }

        .bet-assistant-avatar-stack img:last-child {
          right: 0;
        }

        .bet-assistant-persona-subtitle {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.4;
        }

        .bet-assistant-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        .copilot-selector {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px;
          border: 1px solid rgba(143, 162, 189, 0.14);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.018);
        }

        .copilot-selector button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 32px;
          padding: 5px 9px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--muted);
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }

        .copilot-selector button:hover {
          color: var(--text);
          transform: translateY(-1px);
        }

        .copilot-selector button.active {
          background: rgba(208, 174, 104, 0.12);
          color: #e5c680;
          box-shadow:
            inset 0 0 0 1px
            rgba(208, 174, 104, 0.2);
        }

        .copilot-selector img {
          width: 22px;
          height: 22px;
          object-fit: cover;
          object-position: center 24%;
          border-radius: 7px;
        }

        .decision-score {
          margin: 0 22px 20px;
          padding: 20px;
          border: 1px solid
            rgba(143, 162, 189, 0.14);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.018);
        }

        .decision-score-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .decision-score-header h3 {
          margin: 5px 0 0;
          color: var(--text);
          font-size: 16px;
        }

        .decision-score-badge {
          display: flex;
          align-items: baseline;
          gap: 4px;
          flex-shrink: 0;
          padding: 10px 13px;
          border: 1px solid
            rgba(143, 162, 189, 0.18);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
        }

        .decision-score-badge strong {
          color: var(--text);
          font-size: 25px;
          line-height: 1;
        }

        .decision-score-badge span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
        }

        .decision-score-badge.excellent {
          border-color: rgba(73, 214, 165, 0.3);
          background: rgba(73, 214, 165, 0.08);
        }

        .decision-score-badge.good {
          border-color: rgba(113, 167, 255, 0.3);
          background: rgba(113, 167, 255, 0.07);
        }

        .decision-score-badge.warning {
          border-color: rgba(244, 178, 85, 0.3);
          background: rgba(244, 178, 85, 0.07);
        }

        .decision-score-badge.critical {
          border-color: rgba(245, 108, 108, 0.3);
          background: rgba(245, 108, 108, 0.07);
        }

        .decision-score-badge.insufficient {
          border-color: rgba(143, 162, 189, 0.22);
        }

        .decision-score-summary {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          margin-top: 14px;
          padding: 12px 13px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
        }

        .decision-score-summary > div {
          display: grid;
          gap: 3px;
          flex-shrink: 0;
        }

        .decision-score-summary strong {
          color: var(--text);
          font-size: 13px;
        }

        .decision-score-summary span {
          color: var(--accent);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .decision-score-summary p {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.5;
          text-align: right;
        }

        .decision-score-components {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .decision-score-component {
          padding: 12px;
          border: 1px solid
            rgba(143, 162, 189, 0.13);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.016);
        }

        .decision-score-component-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .decision-score-component-heading > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .decision-score-component-heading strong {
          color: var(--text);
          font-size: 11px;
        }

        .decision-score-component-heading small {
          color: var(--muted);
          font-size: 9px;
          line-height: 1.4;
        }

        .decision-score-component-heading > span {
          flex-shrink: 0;
          color: var(--text);
          font-size: 11px;
          font-weight: 800;
        }

        .decision-score-progress {
          height: 5px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(143, 162, 189, 0.12);
        }

        .decision-score-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #91b9ff;
        }

        .decision-score-component.excellent
          .decision-score-progress span {
          background: var(--accent);
        }

        .decision-score-component.warning
          .decision-score-progress span {
          background: #f4b255;
        }

        .decision-score-component.critical
          .decision-score-progress span {
          background: #f56c6c;
        }

        .decision-score-analysis {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .decision-score-list {
          padding: 12px 13px;
          border: 1px solid
            rgba(143, 162, 189, 0.13);
          border-radius: 13px;
        }

        .decision-score-list > span {
          display: block;
          margin-bottom: 8px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .decision-score-list.strengths > span {
          color: var(--accent);
        }

        .decision-score-list.warnings > span {
          color: #f4b255;
        }

        .decision-score-list ul {
          display: grid;
          gap: 7px;
          margin: 0;
          padding-left: 16px;
        }

        .decision-score-list li {
          color: var(--muted);
          font-size: 10px;
          line-height: 1.45;
        }

        .coach-report {
          margin: 0 22px 20px;
          padding: 20px;
          border: 1px solid rgba(143, 162, 189, 0.14);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.018);
        }

        .coach-report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .coach-report-header h3 {
          margin: 5px 0 0;
          color: var(--text);
          font-size: 16px;
        }

        .coach-report-status {
          flex-shrink: 0;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .coach-report-status.reliable {
          border: 1px solid rgba(73, 214, 165, 0.28);
          background: rgba(73, 214, 165, 0.08);
          color: var(--accent);
        }

        .coach-report-status.provisional {
          border: 1px solid rgba(244, 178, 85, 0.25);
          background: rgba(244, 178, 85, 0.07);
          color: #f4b255;
        }

        .coach-report-summary {
          margin: 14px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .coach-report-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .coach-report-meta span {
          padding: 6px 9px;
          border: 1px solid rgba(143, 162, 189, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.02);
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
        }

        .coach-report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .coach-report-section {
          min-width: 0;
          padding: 13px;
          border: 1px solid rgba(143, 162, 189, 0.13);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.016);
        }

        .coach-report-section-title {
          display: block;
          margin-bottom: 10px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .coach-report-section.observations
          .coach-report-section-title {
          color: #91b9ff;
        }

        .coach-report-section.strengths
          .coach-report-section-title {
          color: var(--accent);
        }

        .coach-report-section.weaknesses
          .coach-report-section-title {
          color: #f4b255;
        }

        .coach-report-section.recommendations
          .coach-report-section-title {
          color: #b9a5ff;
        }

        .coach-report-items {
          display: grid;
          gap: 10px;
        }

        .coach-report-item {
          padding-top: 10px;
          border-top: 1px solid rgba(143, 162, 189, 0.1);
        }

        .coach-report-item:first-child {
          padding-top: 0;
          border-top: 0;
        }

        .coach-report-item > div {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .coach-report-item strong {
          color: var(--text);
          font-size: 11px;
          line-height: 1.4;
        }

        .coach-report-item small {
          flex-shrink: 0;
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
        }

        .coach-report-item p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .coach-biases {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(143, 162, 189, 0.12);
        }

        .coach-biases-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .coach-biases-header span {
          color: #f56c6c;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .coach-biases-header small {
          color: var(--muted);
          font-size: 9px;
        }

        .coach-biases-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .coach-bias-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(244, 178, 85, 0.22);
          border-radius: 13px;
          background: rgba(244, 178, 85, 0.05);
        }

        .coach-bias-card.critical {
          border-color: rgba(245, 108, 108, 0.28);
          background: rgba(245, 108, 108, 0.06);
        }

        .coach-bias-icon {
          display: grid;
          place-items: center;
          flex: 0 0 26px;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: rgba(244, 178, 85, 0.12);
          color: #f4b255;
          font-size: 12px;
          font-weight: 900;
        }

        .coach-bias-card.critical .coach-bias-icon {
          background: rgba(245, 108, 108, 0.12);
          color: #f56c6c;
        }

        .coach-bias-card strong {
          color: var(--text);
          font-size: 11px;
        }

        .coach-bias-card p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .coach-report-empty {
          margin-top: 14px;
          padding: 14px;
          border: 1px dashed rgba(143, 162, 189, 0.18);
          border-radius: 13px;
          text-align: center;
        }

        .coach-report-empty strong {
          color: var(--text);
          font-size: 12px;
        }

        .coach-report-empty p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.5;
        }

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
          .bet-assistant-topbar {
            align-items: stretch;
            flex-direction: column;
          }

          .bet-assistant-actions {
            width: 100%;
            align-items: stretch;
            flex-direction: column;
          }

          .copilot-selector {
            width: 100%;
          }

          .copilot-selector button {
            flex: 1;
          }

          .decision-score-components,
          .decision-score-analysis,
          .coach-report-grid,
          .coach-biases-grid,
          .assistant-insights-grid {
            grid-template-columns: 1fr;
          }

          .decision-score-summary {
            display: grid;
          }

          .decision-score-summary p {
            text-align: left;
          }
        }

        @media (max-width: 520px) {
          .decision-score,
          .coach-report,
          .assistant-insights {
            margin-right: 17px;
            margin-left: 17px;
          }

          .decision-score,
          .coach-report {
            padding: 16px;
          }

          .decision-score-header {
            align-items: flex-start;
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
