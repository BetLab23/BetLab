"use client";

import { FormEvent, useState } from "react";
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

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
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

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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

function buildAssistantAnswer(
  question: string,
  bets: Bet[],
  metrics: AssistantMetrics
) {
  const normalizedQuestion = normalizeText(question);

  const pendingBets = bets.filter(
    (bet) => bet.status === "pending"
  );

  const highValuePendingBets = pendingBets.filter(
    (bet) => bet.value_rating === "high"
  );

  const highConfidencePendingBets = pendingBets.filter(
    (bet) => Number(bet.confidence ?? 0) >= 4
  );

  if (
    normalizedQuestion.includes("roi") ||
    normalizedQuestion.includes("rendement")
  ) {
    if (metrics.settledCount === 0) {
      return "Ton ROI est actuellement de 0 %, car aucun pari n’a encore été clôturé.";
    }

    return `Ton ROI est de ${metrics.roi.toFixed(
      1
    )} %. Il est calculé à partir de ${metrics.settledCount} pari(s) clôturé(s). ${
      metrics.roi > 0
        ? "Le rendement est positif, mais il faudra davantage de volume pour juger sa solidité."
        : metrics.roi < 0
          ? "Le rendement est négatif. Il faut analyser les segments qui concentrent les pertes."
          : "Le rendement est actuellement neutre."
    }`;
  }

  if (
    normalizedQuestion.includes("bankroll") ||
    normalizedQuestion.includes("capital")
  ) {
    return `Ta bankroll actuelle est de ${euros(
      metrics.bankroll
    )}. Ton résultat cumulé est de ${signedEuros(metrics.profit)}. ${
      metrics.profit > 0
        ? "Elle progresse par rapport au capital initial."
        : metrics.profit < 0
          ? "Elle est actuellement en retrait par rapport au capital initial."
          : "Elle est au même niveau que le capital initial."
    }`;
  }

  if (
    normalizedQuestion.includes("profit") ||
    normalizedQuestion.includes("perte") ||
    normalizedQuestion.includes("gagne") ||
    normalizedQuestion.includes("resultat")
  ) {
    return `Ton résultat global est de ${signedEuros(
      metrics.profit
    )}. Sur les 30 derniers jours, ton résultat est de ${signedEuros(
      metrics.profit30Days
    )}.`;
  }

  if (
    normalizedQuestion.includes("ouvert") ||
    normalizedQuestion.includes("exposition") ||
    normalizedQuestion.includes("engage")
  ) {
    return `Tu as ${metrics.pendingCount} pari(s) ouvert(s), avec une exposition totale de ${euros(
      metrics.exposure
    )}. ${
      metrics.pendingCount > 0
        ? "Cette somme reste exposée jusqu’à la clôture des paris."
        : "Aucun capital n’est actuellement engagé."
    }`;
  }

  if (
    normalizedQuestion.includes("value") ||
    normalizedQuestion.includes("valeur")
  ) {
    if (highValuePendingBets.length === 0) {
      return "Aucun de tes paris ouverts n’est actuellement classé en value forte.";
    }

    const exposure = highValuePendingBets.reduce(
      (sum, bet) => sum + Number(bet.stake),
      0
    );

    return `Tu as ${highValuePendingBets.length} pari(s) ouvert(s) classé(s) en value forte, pour une mise totale de ${euros(
      exposure
    )}. Attention : une value forte ne garantit pas que le pari sera gagnant.`;
  }

  if (
    normalizedQuestion.includes("confiance") ||
    normalizedQuestion.includes("etoile")
  ) {
    return `${highConfidencePendingBets.length} de tes paris ouverts ont une confiance de 4 ou 5 étoiles. ${
      highConfidencePendingBets.length > 0
        ? "Il faudra comparer leurs résultats futurs avec ceux des paris moins bien notés."
        : "Aucun pari ouvert n’a actuellement une confiance élevée."
    }`;
  }

  if (
    normalizedQuestion.includes("win rate") ||
    normalizedQuestion.includes("taux de victoire") ||
    normalizedQuestion.includes("pourcentage de victoire")
  ) {
    return `Ton win rate est de ${metrics.winRate.toFixed(
      1
    )} %. Cet indicateur doit être interprété avec les cotes moyennes : un taux de victoire élevé n’est pas forcément rentable, et inversement.`;
  }

  if (
    normalizedQuestion.includes("conseil") ||
    normalizedQuestion.includes("recommande") ||
    normalizedQuestion.includes("faire")
  ) {
    if (metrics.settledCount < 20) {
      return "Ma recommandation principale est de continuer à enregistrer précisément tes paris sans augmenter brutalement les mises. Ton historique est encore trop limité pour conclure avec une forte fiabilité.";
    }

    if (metrics.profit < 0) {
      return "Je te recommande de stabiliser ou réduire les mises, puis d’identifier les marchés, tags et niveaux de confiance qui concentrent les pertes.";
    }

    return "Je te recommande de conserver une taille de mise disciplinée et de vérifier que tes résultats positifs se répètent sur un volume plus important.";
  }

  if (
    normalizedQuestion.includes("bonjour") ||
    normalizedQuestion.includes("salut") ||
    normalizedQuestion.includes("ca va")
  ) {
    return `Bonjour Valentin. J’ai actuellement ${bets.length} pari(s) dans ton historique et je suis prête à analyser tes principaux indicateurs.`;
  }

  return "Je peux actuellement répondre sur ta bankroll, ton ROI, ton résultat, ton exposition, tes paris ouverts, leur niveau de confiance et leur value. Le moteur IA complet sera connecté dans une prochaine version.";
}

export function BetAssistant({
  bets,
  metrics,
}: {
  bets: Bet[];
  metrics: AssistantMetrics;
}) {
  const analysis = getAssistantAnalysis(metrics);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

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

    const answer = buildAssistantAnswer(
      cleanQuestion,
      bets,
      metrics
    );

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: cleanQuestion,
      },
      {
        role: "assistant",
        content: answer,
      },
    ]);

    setQuestion("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askAssistant(question);
  }

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
          Interactive
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

            <small>{euros(metrics.exposure)} engagés</small>
          </div>

          <div className="bet-assistant-focus-item">
            <div>
              <strong>{pendingHighValueBets.length}</strong>
              <span>Value forte</span>
            </div>

            <small>Paris encore ouverts</small>
          </div>

          <div className="bet-assistant-focus-item">
            <div>
              <strong>{highConfidencePendingBets.length}</strong>
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

      {messages.length > 0 && (
        <div className="assistant-conversation">
          {messages.slice(-6).map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`assistant-conversation-message ${message.role}`}
            >
              <span>
                {message.role === "assistant"
                  ? "BetLab"
                  : "Toi"}
              </span>

              <p>{message.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="assistant-suggestions">
        <button
          type="button"
          onClick={() =>
            askAssistant("Quel est mon ROI ?")
          }
        >
          Mon ROI
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant("Quelle est mon exposition ?")
          }
        >
          Mon exposition
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant("Analyse mes paris à forte value")
          }
        >
          Value forte
        </button>

        <button
          type="button"
          onClick={() =>
            askAssistant("Que me recommandes-tu ?")
          }
        >
          Recommandation
        </button>
      </div>

      <form
        className="bet-assistant-prompt interactive"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ex. Quel est mon ROI ?"
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
        .assistant-conversation {
          display: grid;
          gap: 10px;
          margin: 0 22px 16px;
          padding-top: 18px;
          border-top: 1px solid rgba(143, 162, 189, 0.14);
        }

        .assistant-conversation-message {
          max-width: 82%;
          padding: 12px 14px;
          border-radius: 13px;
        }

        .assistant-conversation-message span {
          display: block;
          margin-bottom: 5px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .assistant-conversation-message p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
        }

        .assistant-conversation-message.user {
          justify-self: end;
          background: rgba(113, 167, 255, 0.12);
          border: 1px solid rgba(113, 167, 255, 0.25);
        }

        .assistant-conversation-message.user span {
          color: #91b9ff;
        }

        .assistant-conversation-message.assistant {
          justify-self: start;
          background: rgba(73, 214, 165, 0.08);
          border: 1px solid rgba(73, 214, 165, 0.2);
        }

        .assistant-conversation-message.assistant span {
          color: var(--accent);
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

        .bet-assistant-prompt.interactive input::placeholder {
          color: var(--muted);
        }

        .bet-assistant-prompt.interactive button {
          cursor: pointer;
          opacity: 1;
        }

        .bet-assistant-prompt.interactive button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        @media (max-width: 520px) {
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
