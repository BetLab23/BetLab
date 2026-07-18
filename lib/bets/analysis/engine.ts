import type { Bet } from "@/lib/bets/types";

import type {
  AnalysisAnswer,
  BetAnalysisReport,
  SegmentPerformance,
} from "./types";

type SegmentExtractor = (bet: Bet) => string[];

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

function percentage(value: number) {
  return `${value.toFixed(1)} %`;
}

function isSettledBet(bet: Bet) {
  return bet.status !== "pending";
}

function countsForPerformance(bet: Bet) {
  return (
    bet.status !== "pending" &&
    bet.status !== "void" &&
    bet.profit_loss !== null
  );
}

function getProfit(bet: Bet) {
  return Number(bet.profit_loss ?? 0);
}

function getStake(bet: Bet) {
  return Number(bet.stake ?? 0);
}

function calculateRoi(profit: number, stake: number) {
  if (stake <= 0) return 0;
  return (profit / stake) * 100;
}

function calculateWinRate(wins: number, losses: number) {
  const decisions = wins + losses;

  if (decisions <= 0) return 0;

  return (wins / decisions) * 100;
}

function getOddsRange(odds: number) {
  if (odds < 1.5) return "1.00 – 1.49";
  if (odds < 2) return "1.50 – 1.99";
  if (odds < 3) return "2.00 – 2.99";

  return "3.00 et plus";
}

function getConfidenceLabel(confidence: number | null) {
  if (!confidence) return "Non renseignée";

  return `${confidence} étoile${confidence > 1 ? "s" : ""}`;
}

function getValueLabel(value: Bet["value_rating"]) {
  if (value === "low") return "Faible";
  if (value === "medium") return "Moyenne";
  if (value === "high") return "Forte";

  return "Non renseignée";
}

function createSegmentPerformance(
  bets: Bet[],
  extractor: SegmentExtractor
): SegmentPerformance[] {
  const groups = new Map<string, Bet[]>();

  for (const bet of bets) {
    const extractedKeys = extractor(bet)
      .map((key) => key.trim())
      .filter(Boolean);

    const uniqueKeys = [...new Set(extractedKeys)];

    for (const key of uniqueKeys) {
      const existingBets = groups.get(key) ?? [];
      existingBets.push(bet);
      groups.set(key, existingBets);
    }
  }

  return [...groups.entries()]
    .map(([key, groupBets]) => {
      const performanceBets = groupBets.filter(countsForPerformance);

      const wins = performanceBets.filter(
        (bet) => bet.status === "win"
      ).length;

      const losses = performanceBets.filter(
        (bet) => bet.status === "loss"
      ).length;

      const voids = groupBets.filter(
        (bet) => bet.status === "void"
      ).length;

      const stake = performanceBets.reduce(
        (sum, bet) => sum + getStake(bet),
        0
      );

      const profit = performanceBets.reduce(
        (sum, bet) => sum + getProfit(bet),
        0
      );

      return {
        key,
        label: key,
        bets: performanceBets.length,
        wins,
        losses,
        voids,
        stake,
        profit,
        roi: calculateRoi(profit, stake),
        winRate: calculateWinRate(wins, losses),
      };
    })
    .filter((segment) => segment.bets > 0)
    .sort((a, b) => b.bets - a.bets);
}

function findBestSegment(
  segments: SegmentPerformance[],
  minimumBets = 2
) {
  return [...segments]
    .filter((segment) => segment.bets >= minimumBets)
    .sort((a, b) => b.roi - a.roi)[0];
}

function findWorstSegment(
  segments: SegmentPerformance[],
  minimumBets = 2
) {
  return [...segments]
    .filter((segment) => segment.bets >= minimumBets)
    .sort((a, b) => a.roi - b.roi)[0];
}

function findSegmentByQuestion(
  question: string,
  segments: SegmentPerformance[]
) {
  const normalizedQuestion = normalizeText(question);

  return segments.find((segment) =>
    normalizedQuestion.includes(
      normalizeText(segment.label)
    )
  );
}

function describeSegment(segment: SegmentPerformance) {
  return `${segment.label} affiche un résultat de ${signedEuros(
    segment.profit
  )}, un ROI de ${percentage(segment.roi)} et un win rate de ${percentage(
    segment.winRate
  )} sur ${segment.bets} pari(s) clôturé(s).`;
}

function buildRankingAnswer(
  title: string,
  segments: SegmentPerformance[],
  requestedSegment?: SegmentPerformance
): AnalysisAnswer {
  if (requestedSegment) {
    return {
      title,
      answer: describeSegment(requestedSegment),
      highlights: [
        `${requestedSegment.bets} pari(s) analysé(s)`,
        `Mises : ${euros(requestedSegment.stake)}`,
        `Résultat : ${signedEuros(requestedSegment.profit)}`,
      ],
    };
  }

  if (segments.length === 0) {
    return {
      title,
      answer:
        "Je ne dispose pas encore de suffisamment de paris clôturés pour produire cette analyse.",
      highlights: [],
    };
  }

  const best = findBestSegment(segments);
  const worst = findWorstSegment(segments);

  if (!best && !worst) {
    const mostUsed = segments[0];

    return {
      title,
      answer:
        `L’échantillon est encore limité. Le segment le plus représenté est ${mostUsed.label} avec ${mostUsed.bets} pari(s) clôturé(s).`,
      highlights: [
        `ROI : ${percentage(mostUsed.roi)}`,
        `Résultat : ${signedEuros(mostUsed.profit)}`,
      ],
    };
  }

  const sentences: string[] = [];

  if (best) {
    sentences.push(
      `Le segment le plus performant est ${best.label}, avec un ROI de ${percentage(
        best.roi
      )} et un résultat de ${signedEuros(best.profit)}.`
    );
  }

  if (worst && worst.key !== best?.key) {
    sentences.push(
      `Le segment le moins performant est ${worst.label}, avec un ROI de ${percentage(
        worst.roi
      )} et un résultat de ${signedEuros(worst.profit)}.`
    );
  }

  return {
    title,
    answer: sentences.join(" "),
    highlights: [
      best
        ? `Meilleur : ${best.label}`
        : "Meilleur segment non déterminé",
      worst
        ? `À surveiller : ${worst.label}`
        : "Aucun segment négatif significatif",
    ],
  };
}

export function analyzeBets(bets: Bet[]): BetAnalysisReport {
  const pendingBets = bets.filter(
    (bet) => bet.status === "pending"
  );

  const settledBets = bets.filter(isSettledBet);
  const performanceBets = bets.filter(countsForPerformance);

  const wins = performanceBets.filter(
    (bet) => bet.status === "win"
  ).length;

  const losses = performanceBets.filter(
    (bet) => bet.status === "loss"
  ).length;

  const voids = settledBets.filter(
    (bet) => bet.status === "void"
  ).length;

  const totalStake = performanceBets.reduce(
    (sum, bet) => sum + getStake(bet),
    0
  );

  const exposure = pendingBets.reduce(
    (sum, bet) => sum + getStake(bet),
    0
  );

  const profit = performanceBets.reduce(
    (sum, bet) => sum + getProfit(bet),
    0
  );

  return {
    global: {
      totalBets: bets.length,
      pendingBets: pendingBets.length,
      settledBets: settledBets.length,
      wins,
      losses,
      voids,
      totalStake,
      exposure,
      profit,
      roi: calculateRoi(profit, totalStake),
      winRate: calculateWinRate(wins, losses),
    },

    sports: createSegmentPerformance(
      bets,
      (bet) => [bet.sport || "Non renseigné"]
    ),

    competitions: createSegmentPerformance(
      bets,
      (bet) => [bet.competition || "Non renseignée"]
    ),

    markets: createSegmentPerformance(
      bets,
      (bet) => [bet.market || "Non renseigné"]
    ),

    bookmakers: createSegmentPerformance(
      bets,
      (bet) => [bet.bookmaker || "Non renseigné"]
    ),

    confidence: createSegmentPerformance(
      bets,
      (bet) => [getConfidenceLabel(bet.confidence)]
    ),

    value: createSegmentPerformance(
      bets,
      (bet) => [getValueLabel(bet.value_rating)]
    ),

    odds: createSegmentPerformance(
      bets,
      (bet) => [getOddsRange(Number(bet.odds))]
    ),

    tags: createSegmentPerformance(
      bets,
      (bet) =>
        bet.tags.length > 0
          ? bet.tags
          : ["Sans tag"]
    ),
  };
}

export function answerBetQuestion(
  question: string,
  bets: Bet[]
): AnalysisAnswer {
  const report = analyzeBets(bets);
  const normalizedQuestion = normalizeText(question);

  if (report.global.settledBets === 0) {
    return {
      title: "Historique insuffisant",
      answer:
        "Aucun pari n’est encore clôturé. Je pourrai analyser ta performance dès que des résultats seront enregistrés.",
      highlights: [
        `${report.global.pendingBets} pari(s) ouvert(s)`,
        `${euros(report.global.exposure)} exposés`,
      ],
    };
  }

  if (
    normalizedQuestion.includes("pourquoi") &&
    (
      normalizedQuestion.includes("perd") ||
      normalizedQuestion.includes("negatif") ||
      normalizedQuestion.includes("baisse")
    )
  ) {
    const candidates = [
      ...report.competitions,
      ...report.markets,
      ...report.bookmakers,
      ...report.confidence,
      ...report.value,
      ...report.odds,
      ...report.tags,
    ];

    const worstSegments = candidates
      .filter(
        (segment) =>
          segment.bets >= 2 &&
          segment.profit < 0
      )
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 3);

    if (worstSegments.length === 0) {
      return {
        title: "Origine des pertes",
        answer:
          "Je ne détecte pas encore de segment négatif suffisamment représentatif. Il faut davantage de paris clôturés pour isoler une cause fiable.",
        highlights: [
          `Résultat global : ${signedEuros(report.global.profit)}`,
          `ROI global : ${percentage(report.global.roi)}`,
        ],
      };
    }

    return {
      title: "Origine probable des pertes",
      answer:
        `Les pertes les plus importantes sont actuellement associées à ${worstSegments
          .map(
            (segment) =>
              `${segment.label} (${signedEuros(
                segment.profit
              )}, ROI ${percentage(segment.roi)})`
          )
          .join(", ")}. Ces résultats restent à confirmer avec davantage de volume.`,
      highlights: worstSegments.map(
        (segment) =>
          `${segment.label} : ${segment.bets} pari(s)`
      ),
    };
  }

  if (
    normalizedQuestion.includes("roi") ||
    normalizedQuestion.includes("rendement")
  ) {
    return {
      title: "Rendement global",
      answer:
        `Ton ROI global est de ${percentage(
          report.global.roi
        )}, pour un résultat de ${signedEuros(
          report.global.profit
        )} sur ${euros(report.global.totalStake)} misés.`,
      highlights: [
        `${report.global.settledBets} pari(s) clôturé(s)`,
        `Win rate : ${percentage(report.global.winRate)}`,
      ],
    };
  }

  if (
    normalizedQuestion.includes("bookmaker") ||
    normalizedQuestion.includes("betclic") ||
    normalizedQuestion.includes("winamax") ||
    normalizedQuestion.includes("unibet")
  ) {
    return buildRankingAnswer(
      "Analyse par bookmaker",
      report.bookmakers,
      findSegmentByQuestion(question, report.bookmakers)
    );
  }

  if (
    normalizedQuestion.includes("competition") ||
    normalizedQuestion.includes("championnat") ||
    findSegmentByQuestion(question, report.competitions)
  ) {
    return buildRankingAnswer(
      "Analyse par compétition",
      report.competitions,
      findSegmentByQuestion(question, report.competitions)
    );
  }

  if (
    normalizedQuestion.includes("sport") ||
    findSegmentByQuestion(question, report.sports)
  ) {
    return buildRankingAnswer(
      "Analyse par sport",
      report.sports,
      findSegmentByQuestion(question, report.sports)
    );
  }

  if (
    normalizedQuestion.includes("marche") ||
    normalizedQuestion.includes("selection")
  ) {
    return buildRankingAnswer(
      "Analyse par marché",
      report.markets,
      findSegmentByQuestion(question, report.markets)
    );
  }

  if (
    normalizedQuestion.includes("confiance") ||
    normalizedQuestion.includes("etoile")
  ) {
    return buildRankingAnswer(
      "Analyse par confiance",
      report.confidence,
      findSegmentByQuestion(question, report.confidence)
    );
  }

  if (
    normalizedQuestion.includes("value") ||
    normalizedQuestion.includes("valeur")
  ) {
    return buildRankingAnswer(
      "Analyse par value",
      report.value,
      findSegmentByQuestion(question, report.value)
    );
  }

  if (
    normalizedQuestion.includes("cote") ||
    normalizedQuestion.includes("odds")
  ) {
    return buildRankingAnswer(
      "Analyse par plage de cote",
      report.odds,
      findSegmentByQuestion(question, report.odds)
    );
  }

  if (
    normalizedQuestion.includes("tag") ||
    normalizedQuestion.includes("strategie")
  ) {
    return buildRankingAnswer(
      "Analyse par tag",
      report.tags,
      findSegmentByQuestion(question, report.tags)
    );
  }

  if (
    normalizedQuestion.includes("exposition") ||
    normalizedQuestion.includes("ouvert") ||
    normalizedQuestion.includes("engage")
  ) {
    return {
      title: "Exposition actuelle",
      answer:
        `Tu as ${report.global.pendingBets} pari(s) ouvert(s), représentant une exposition totale de ${euros(
          report.global.exposure
        )}.`,
      highlights: [
        `${report.global.totalBets} pari(s) enregistrés`,
        `${report.global.settledBets} pari(s) clôturés`,
      ],
    };
  }

  const bestCompetition = findBestSegment(
    report.competitions
  );

  const worstCompetition = findWorstSegment(
    report.competitions
  );

  return {
    title: "Synthèse BetLab",
    answer:
      `Ton résultat global est de ${signedEuros(
        report.global.profit
      )}, avec un ROI de ${percentage(
        report.global.roi
      )} et un win rate de ${percentage(
        report.global.winRate
      )}. ${
        bestCompetition
          ? `${bestCompetition.label} est actuellement ta compétition la plus performante.`
          : ""
      } ${
        worstCompetition &&
        worstCompetition.key !== bestCompetition?.key
          ? `${worstCompetition.label} est la compétition à surveiller.`
          : ""
      }`.trim(),
    highlights: [
      `${report.global.settledBets} pari(s) clôturé(s)`,
      `${report.global.pendingBets} pari(s) ouvert(s)`,
      `Exposition : ${euros(report.global.exposure)}`,
    ],
  };
}
