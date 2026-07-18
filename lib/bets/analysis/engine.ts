import type { Bet } from "@/lib/bets/types";

import type {
  AnalysisAnswer,
  AnalysisValue,
  BetAnalysisReport,
  CrossAnalysisFilters,
  CrossAnalysisPerformance,
  CrossAnalysisResult,
  ParsedAnalysisQuery,
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

function createEmptyCrossFilters(): CrossAnalysisFilters {
  return {
    sports: [],
    competitions: [],
    markets: [],
    bookmakers: [],
    confidenceLevels: [],
    values: [],
    tags: [],
    minimumOdds: null,
    maximumOdds: null,
  };
}

function uniqueTextValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function detectKnownValues(
  question: string,
  values: string[]
) {
  const normalizedQuestion = normalizeText(question);

  return uniqueTextValues(values).filter((value) =>
    normalizedQuestion.includes(normalizeText(value))
  );
}

function parseQuestionNumber(value: string) {
  return Number(value.replace(",", "."));
}

function parseOddsFilters(
  normalizedQuestion: string,
  filters: CrossAnalysisFilters,
  detectedFilters: string[]
) {
  const betweenMatch = normalizedQuestion.match(
    /(?:entre|de)\s+(\d+(?:[.,]\d+)?)\s+(?:et|a)\s+(\d+(?:[.,]\d+)?)/
  );

  if (betweenMatch) {
    const first = parseQuestionNumber(betweenMatch[1]);
    const second = parseQuestionNumber(betweenMatch[2]);

    filters.minimumOdds = Math.min(first, second);
    filters.maximumOdds = Math.max(first, second);
    detectedFilters.push(
      `Cotes : ${filters.minimumOdds.toFixed(2)} à ${filters.maximumOdds.toFixed(2)}`
    );
    return;
  }

  const minimumMatch = normalizedQuestion.match(
    /(?:cote(?:s)?\s*)?(?:superieure?s?|au-dessus|plus de|minimum|min)\s*(?:a|de|:)?\s*(\d+(?:[.,]\d+)?)/
  );

  if (minimumMatch) {
    filters.minimumOdds = parseQuestionNumber(minimumMatch[1]);
    detectedFilters.push(
      `Cote minimale : ${filters.minimumOdds.toFixed(2)}`
    );
  }

  const maximumMatch = normalizedQuestion.match(
    /(?:cote(?:s)?\s*)?(?:inferieure?s?|en-dessous|moins de|maximum|max)\s*(?:a|de|:)?\s*(\d+(?:[.,]\d+)?)/
  );

  if (maximumMatch) {
    filters.maximumOdds = parseQuestionNumber(maximumMatch[1]);
    detectedFilters.push(
      `Cote maximale : ${filters.maximumOdds.toFixed(2)}`
    );
  }
}

export function parseAnalysisQuery(
  question: string,
  bets: Bet[]
): ParsedAnalysisQuery {
  const filters = createEmptyCrossFilters();
  const detectedFilters: string[] = [];
  const normalizedQuestion = normalizeText(question);

  filters.sports = detectKnownValues(
    question,
    bets.map((bet) => bet.sport)
  );

  filters.competitions = detectKnownValues(
    question,
    bets.map((bet) => bet.competition)
  );

  filters.markets = detectKnownValues(
    question,
    bets.map((bet) => bet.market)
  );

  filters.bookmakers = detectKnownValues(
    question,
    bets.map((bet) => bet.bookmaker)
  );

  filters.tags = detectKnownValues(
    question,
    bets.flatMap((bet) => bet.tags)
  );

  filters.sports.forEach((value) =>
    detectedFilters.push(`Sport : ${value}`)
  );

  filters.competitions.forEach((value) =>
    detectedFilters.push(`Compétition : ${value}`)
  );

  filters.markets.forEach((value) =>
    detectedFilters.push(`Marché : ${value}`)
  );

  filters.bookmakers.forEach((value) =>
    detectedFilters.push(`Bookmaker : ${value}`)
  );

  filters.tags.forEach((value) =>
    detectedFilters.push(`Tag : ${value}`)
  );

  const confidenceMatches = [
    ...normalizedQuestion.matchAll(
      /(?:confiance\s*(?:de|:)?\s*)?([1-5])\s*(?:etoile?s?|★)/g
    ),
  ];

  filters.confidenceLevels = [
    ...new Set(
      confidenceMatches.map((match) => Number(match[1]))
    ),
  ];

  filters.confidenceLevels.forEach((confidence) =>
    detectedFilters.push(`Confiance : ${confidence} étoile${confidence > 1 ? "s" : ""}`)
  );

  const valueMatches: Array<{
    value: AnalysisValue;
    patterns: string[];
    label: string;
  }> = [
    {
      value: "high",
      patterns: [
        "value forte",
        "forte value",
        "valeur forte",
        "haute value",
      ],
      label: "Forte",
    },
    {
      value: "medium",
      patterns: [
        "value moyenne",
        "moyenne value",
        "valeur moyenne",
      ],
      label: "Moyenne",
    },
    {
      value: "low",
      patterns: [
        "value faible",
        "faible value",
        "valeur faible",
      ],
      label: "Faible",
    },
  ];

  for (const valueMatch of valueMatches) {
    if (
      valueMatch.patterns.some((pattern) =>
        normalizedQuestion.includes(pattern)
      )
    ) {
      filters.values.push(valueMatch.value);
      detectedFilters.push(`Value : ${valueMatch.label}`);
    }
  }

  parseOddsFilters(
    normalizedQuestion,
    filters,
    detectedFilters
  );

  return {
    filters,
    detectedFilters: [...new Set(detectedFilters)],
  };
}

function matchesTextFilter(
  value: string,
  acceptedValues: string[]
) {
  if (acceptedValues.length === 0) return true;

  const normalizedValue = normalizeText(value);

  return acceptedValues.some(
    (acceptedValue) =>
      normalizeText(acceptedValue) === normalizedValue
  );
}

function betMatchesCrossFilters(
  bet: Bet,
  filters: CrossAnalysisFilters
) {
  const odds = Number(bet.odds);

  if (!matchesTextFilter(bet.sport, filters.sports)) {
    return false;
  }

  if (
    !matchesTextFilter(
      bet.competition,
      filters.competitions
    )
  ) {
    return false;
  }

  if (!matchesTextFilter(bet.market, filters.markets)) {
    return false;
  }

  if (
    !matchesTextFilter(
      bet.bookmaker,
      filters.bookmakers
    )
  ) {
    return false;
  }

  if (
    filters.confidenceLevels.length > 0 &&
    !filters.confidenceLevels.includes(
      Number(bet.confidence ?? 0)
    )
  ) {
    return false;
  }

  if (
    filters.values.length > 0 &&
    !filters.values.includes(
      bet.value_rating as AnalysisValue
    )
  ) {
    return false;
  }

  if (
    filters.tags.length > 0 &&
    !filters.tags.some((requestedTag) =>
      bet.tags.some(
        (tag) =>
          normalizeText(tag) === normalizeText(requestedTag)
      )
    )
  ) {
    return false;
  }

  if (
    filters.minimumOdds !== null &&
    odds < filters.minimumOdds
  ) {
    return false;
  }

  if (
    filters.maximumOdds !== null &&
    odds > filters.maximumOdds
  ) {
    return false;
  }

  return true;
}

function calculateCrossPerformance(
  bets: Bet[]
): CrossAnalysisPerformance {
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

  const stake = performanceBets.reduce(
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
    totalBets: bets.length,
    settledBets: settledBets.length,
    pendingBets: pendingBets.length,
    wins,
    losses,
    voids,
    stake,
    exposure,
    profit,
    roi: calculateRoi(profit, stake),
    winRate: calculateWinRate(wins, losses),
  };
}

export function analyzeCrossFilters(
  question: string,
  bets: Bet[]
): CrossAnalysisResult {
  const parsedQuery = parseAnalysisQuery(question, bets);

  const matchingBets = bets.filter((bet) =>
    betMatchesCrossFilters(bet, parsedQuery.filters)
  );

  return {
    filters: parsedQuery.filters,
    detectedFilters: parsedQuery.detectedFilters,
    performance: calculateCrossPerformance(matchingBets),
  };
}

function buildCrossAnalysisAnswer(
  result: CrossAnalysisResult
): AnalysisAnswer {
  const { performance, detectedFilters } = result;
  const filterDescription = detectedFilters.join(" + ");

  if (performance.totalBets === 0) {
    return {
      title: "Analyse croisée",
      answer:
        `Je n’ai trouvé aucun pari correspondant à la combinaison suivante : ${filterDescription}.`,
      highlights: detectedFilters,
    };
  }

  if (performance.settledBets === 0) {
    return {
      title: "Analyse croisée",
      answer:
        `J’ai trouvé ${performance.totalBets} pari(s) correspondant à ${filterDescription}, mais aucun n’est encore clôturé. L’exposition actuelle est de ${euros(
          performance.exposure
        )}.`,
      highlights: [
        `${performance.pendingBets} pari(s) ouvert(s)`,
        `Exposition : ${euros(performance.exposure)}`,
      ],
    };
  }

  const reliabilitySentence =
    performance.wins + performance.losses < 5
      ? " L’échantillon reste limité : cette tendance doit être considérée comme provisoire."
      : "";

  return {
    title: "Analyse croisée",
    answer:
      `Sur la combinaison ${filterDescription}, tu affiches un résultat de ${signedEuros(
        performance.profit
      )}, un ROI de ${percentage(
        performance.roi
      )} et un win rate de ${percentage(
        performance.winRate
      )} sur ${performance.wins + performance.losses} pari(s) exploitable(s).${reliabilitySentence}`,
    highlights: [
      `Mises : ${euros(performance.stake)}`,
      `${performance.wins} gagné(s) / ${performance.losses} perdu(s)`,
      performance.pendingBets > 0
        ? `Ouverts : ${performance.pendingBets}`
        : "Aucun pari ouvert",
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
  const crossAnalysis = analyzeCrossFilters(question, bets);

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

  if (crossAnalysis.detectedFilters.length >= 2) {
    return buildCrossAnalysisAnswer(crossAnalysis);
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

export type ProactiveInsight = {
  id: string;
  tone: "positive" | "warning" | "neutral";
  title: string;
  description: string;
  metric: string;
};

type CategorizedSegment = {
  category: string;
  segment: SegmentPerformance;
};

function getAllCategorizedSegments(
  report: BetAnalysisReport
): CategorizedSegment[] {
  return [
    ...report.sports.map((segment) => ({
      category: "Sport",
      segment,
    })),

    ...report.competitions.map((segment) => ({
      category: "Compétition",
      segment,
    })),

    ...report.markets.map((segment) => ({
      category: "Marché",
      segment,
    })),

    ...report.bookmakers.map((segment) => ({
      category: "Bookmaker",
      segment,
    })),

    ...report.confidence.map((segment) => ({
      category: "Confiance",
      segment,
    })),

    ...report.value.map((segment) => ({
      category: "Value",
      segment,
    })),

    ...report.odds.map((segment) => ({
      category: "Cotes",
      segment,
    })),

    ...report.tags.map((segment) => ({
      category: "Tag",
      segment,
    })),
  ];
}

function findBestCategorizedSegment(
  segments: CategorizedSegment[],
  minimumBets: number
) {
  return [...segments]
    .filter(({ segment }) => segment.bets >= minimumBets)
    .sort((a, b) => {
      if (b.segment.profit !== a.segment.profit) {
        return b.segment.profit - a.segment.profit;
      }

      return b.segment.roi - a.segment.roi;
    })[0];
}

function findWorstCategorizedSegment(
  segments: CategorizedSegment[],
  minimumBets: number
) {
  return [...segments]
    .filter(({ segment }) => segment.bets >= minimumBets)
    .sort((a, b) => {
      if (a.segment.profit !== b.segment.profit) {
        return a.segment.profit - b.segment.profit;
      }

      return a.segment.roi - b.segment.roi;
    })[0];
}

function getInsightMinimumBets(settledBets: number) {
  if (settledBets >= 100) return 10;
  if (settledBets >= 50) return 7;
  if (settledBets >= 20) return 4;

  return 2;
}

export function generateProactiveInsights(
  bets: Bet[]
): ProactiveInsight[] {
  const report = analyzeBets(bets);
  const insights: ProactiveInsight[] = [];

  const settledCount =
    report.global.wins +
    report.global.losses;

  if (settledCount === 0) {
    return [
      {
        id: "no-settled-bets",
        tone: "neutral",
        title: "Historique en construction",
        description:
          "Aucun pari exploitable n’est encore clôturé. Les premiers enseignements apparaîtront après l’enregistrement de plusieurs résultats.",
        metric: `${report.global.pendingBets} pari(s) ouvert(s)`,
      },
    ];
  }

  if (settledCount < 5) {
    insights.push({
      id: "limited-sample",
      tone: "neutral",
      title: "Échantillon encore limité",
      description:
        "Les tendances détectées doivent rester provisoires. Quelques résultats peuvent encore modifier fortement le ROI et le classement des segments.",
      metric: `${settledCount} pari(s) analysé(s)`,
    });
  }

  const minimumBets = getInsightMinimumBets(settledCount);

  const categorizedSegments =
    getAllCategorizedSegments(report).filter(
      ({ segment }) =>
        segment.label !== "Non renseigné" &&
        segment.label !== "Non renseignée" &&
        segment.label !== "Sans tag"
    );

  const bestSegment = findBestCategorizedSegment(
    categorizedSegments,
    minimumBets
  );

  if (
    bestSegment &&
    bestSegment.segment.profit > 0 &&
    bestSegment.segment.roi > 0
  ) {
    insights.push({
      id: `best-${bestSegment.category}-${bestSegment.segment.key}`,
      tone: "positive",
      title: "Segment performant détecté",
      description:
        `${bestSegment.segment.label} est actuellement l’un de tes meilleurs segments dans la catégorie ${bestSegment.category.toLocaleLowerCase(
          "fr-FR"
        )}. Il affiche ${signedEuros(
          bestSegment.segment.profit
        )} de résultat pour un ROI de ${percentage(
          bestSegment.segment.roi
        )}.`,
      metric: `${bestSegment.segment.bets} pari(s)`,
    });
  }

  const worstSegment = findWorstCategorizedSegment(
    categorizedSegments,
    minimumBets
  );

  if (
    worstSegment &&
    worstSegment.segment.profit < 0 &&
    worstSegment.segment.roi < 0
  ) {
    insights.push({
      id: `worst-${worstSegment.category}-${worstSegment.segment.key}`,
      tone: "warning",
      title: "Segment à surveiller",
      description:
        `${worstSegment.segment.label} concentre actuellement une partie importante des pertes dans la catégorie ${worstSegment.category.toLocaleLowerCase(
          "fr-FR"
        )}. Son résultat est de ${signedEuros(
          worstSegment.segment.profit
        )}, avec un ROI de ${percentage(
          worstSegment.segment.roi
        )}.`,
      metric: `${worstSegment.segment.bets} pari(s)`,
    });
  }

  const riskyConfidence = [...report.confidence]
    .filter(
      (segment) =>
        segment.bets >= minimumBets &&
        segment.label !== "Non renseignée" &&
        segment.roi < 0
    )
    .sort((a, b) => a.roi - b.roi)[0];

  if (riskyConfidence) {
    insights.push({
      id: `confidence-${riskyConfidence.key}`,
      tone: "warning",
      title: "Confiance à recalibrer",
      description:
        `Les paris classés ${riskyConfidence.label} affichent actuellement un ROI de ${percentage(
          riskyConfidence.roi
        )}. Ton niveau de conviction ne se traduit donc pas encore par un avantage mesurable sur ce segment.`,
      metric: signedEuros(riskyConfidence.profit),
    });
  }

  const riskyOddsRange = [...report.odds]
    .filter(
      (segment) =>
        segment.bets >= minimumBets &&
        segment.roi < 0
    )
    .sort((a, b) => a.roi - b.roi)[0];

  if (riskyOddsRange) {
    insights.push({
      id: `odds-${riskyOddsRange.key}`,
      tone: "warning",
      title: "Plage de cotes défavorable",
      description:
        `La plage ${riskyOddsRange.label} affiche actuellement un ROI de ${percentage(
          riskyOddsRange.roi
        )}. Elle mérite une analyse plus stricte avant d’y augmenter le volume ou les mises.`,
      metric: `${riskyOddsRange.bets} pari(s)`,
    });
  }

  const pendingBets = bets.filter(
    (bet) => bet.status === "pending"
  );

  if (
    pendingBets.length > 0 &&
    report.global.exposure > 0
  ) {
    const bookmakerExposure = new Map<string, number>();

    for (const bet of pendingBets) {
      const bookmaker =
        bet.bookmaker.trim() || "Non renseigné";

      bookmakerExposure.set(
        bookmaker,
        (bookmakerExposure.get(bookmaker) ?? 0) +
          getStake(bet)
      );
    }

    const mainBookmaker = [...bookmakerExposure.entries()]
      .map(([bookmaker, exposure]) => ({
        bookmaker,
        exposure,
        share:
          (exposure / report.global.exposure) * 100,
      }))
      .sort((a, b) => b.exposure - a.exposure)[0];

    if (
      mainBookmaker &&
      mainBookmaker.share >= 60 &&
      pendingBets.length >= 2
    ) {
      insights.push({
        id: `exposure-${mainBookmaker.bookmaker}`,
        tone: "warning",
        title: "Exposition concentrée",
        description:
          `${percentage(
            mainBookmaker.share
          )} de ton exposition actuelle est concentrée chez ${mainBookmaker.bookmaker}. Cette concentration ne constitue pas nécessairement un problème, mais elle mérite d’être surveillée.`,
        metric: euros(mainBookmaker.exposure),
      });
    }
  }

  const confidenceMissing = bets.filter(
    (bet) => bet.confidence === null
  ).length;

  const valueMissing = bets.filter(
    (bet) => bet.value_rating === null
  ).length;

  const metadataMissing =
    confidenceMissing + valueMissing;

  if (
    bets.length >= 5 &&
    metadataMissing > bets.length * 0.5
  ) {
    insights.push({
      id: "missing-metadata",
      tone: "neutral",
      title: "Données à compléter",
      description:
        "Une partie importante de l’historique ne contient pas encore toutes les informations de confiance ou de value. Cela limite la précision des analyses stratégiques.",
      metric: `${metadataMissing} champ(s) manquant(s)`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "stable-performance",
      tone: "neutral",
      title: "Aucune anomalie majeure",
      description:
        "Le moteur ne détecte actuellement aucun segment suffisamment représentatif qui exige une attention particulière.",
      metric: `ROI global ${percentage(
        report.global.roi
      )}`,
    });
  }

  return insights.slice(0, 4);
}
