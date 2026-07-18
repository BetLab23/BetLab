import type { Bet } from "@/lib/bets/types";

import type {
  DecisionScoreComponent,
  DecisionScoreReport,
  DecisionScoreTone,
} from "./types";

const MAXIMUM_SCORE = 100 as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number) {
  return Math.round(value);
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getStake(bet: Bet) {
  return Number(bet.stake ?? 0);
}

function getProfit(bet: Bet) {
  return Number(bet.profit_loss ?? 0);
}

function isPerformanceBet(bet: Bet) {
  return (
    bet.status !== "pending" &&
    bet.status !== "void" &&
    bet.profit_loss !== null
  );
}

function getTone(percentage: number): DecisionScoreTone {
  if (percentage >= 85) return "excellent";
  if (percentage >= 70) return "good";
  if (percentage >= 50) return "warning";

  return "critical";
}

function getScoreLabel(
  tone: DecisionScoreTone,
  reliable: boolean
) {
  if (!reliable) return "Score provisoire";

  if (tone === "excellent") return "Processus excellent";
  if (tone === "good") return "Processus solide";
  if (tone === "warning") return "Processus perfectible";
  if (tone === "critical") return "Processus fragile";

  return "Historique insuffisant";
}

function getMedian(values: number[]) {
  if (values.length === 0) return 0;

  const sortedValues = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (
      sortedValues[middle - 1] +
      sortedValues[middle]
    ) / 2;
  }

  return sortedValues[middle];
}

function calculateRoi(bets: Bet[]) {
  const performanceBets = bets.filter(isPerformanceBet);

  const stake = performanceBets.reduce(
    (sum, bet) => sum + getStake(bet),
    0
  );

  const profit = performanceBets.reduce(
    (sum, bet) => sum + getProfit(bet),
    0
  );

  if (stake <= 0) return 0;

  return (profit / stake) * 100;
}

function buildComponent(
  component: Omit<
    DecisionScoreComponent,
    "percentage" | "tone"
  >
): DecisionScoreComponent {
  const percentage =
    component.maximumScore > 0
      ? (component.score / component.maximumScore) * 100
      : 0;

  return {
    ...component,
    score: round(
      clamp(
        component.score,
        0,
        component.maximumScore
      )
    ),
    percentage: round(clamp(percentage, 0, 100)),
    tone: getTone(percentage),
  };
}

function scoreStakeManagement(
  bets: Bet[]
): DecisionScoreComponent {
  const maximumScore = 20;
  const validStakes = bets
    .map(getStake)
    .filter((stake) => stake > 0);

  if (validStakes.length === 0) {
    return buildComponent({
      id: "stakeManagement",
      label: "Gestion des mises",
      score: 0,
      maximumScore,
      summary:
        "Aucune mise exploitable n’est encore disponible.",
      evidence: [
        "Renseigne les mises pour évaluer leur cohérence.",
      ],
    });
  }

  const medianStake = getMedian(validStakes);
  const averageStake =
    validStakes.reduce((sum, stake) => sum + stake, 0) /
    validStakes.length;

  const largestStake = Math.max(...validStakes);
  const smallestStake = Math.min(...validStakes);

  const extremeStakes = validStakes.filter(
    (stake) =>
      medianStake > 0 &&
      stake > medianStake * 2.5
  ).length;

  const extremeShare =
    extremeStakes / validStakes.length;

  const dispersion =
    averageStake > 0
      ? (largestStake - smallestStake) / averageStake
      : 0;

  let score = maximumScore;

  score -= extremeShare * 12;
  score -= clamp(dispersion - 1.5, 0, 3) * 2;

  const evidence = [
    `Mise médiane : ${medianStake.toFixed(2)} €`,
    `Mise maximale : ${largestStake.toFixed(2)} €`,
  ];

  if (extremeStakes > 0) {
    evidence.push(
      `${extremeStakes} mise(s) dépassent 2,5× la mise médiane.`
    );
  } else {
    evidence.push(
      "Aucune mise excessivement éloignée de la médiane."
    );
  }

  const summary =
    score >= 16
      ? "Les mises restent globalement cohérentes et maîtrisées."
      : score >= 11
        ? "La gestion des mises est correcte, mais quelques écarts méritent d’être surveillés."
        : "Les mises sont trop irrégulières pour garantir une gestion du risque stable.";

  return buildComponent({
    id: "stakeManagement",
    label: "Gestion des mises",
    score,
    maximumScore,
    summary,
    evidence,
  });
}

function scoreConfidence(
  bets: Bet[]
): DecisionScoreComponent {
  const maximumScore = 20;

  const ratedBets = bets.filter(
    (bet) =>
      isPerformanceBet(bet) &&
      bet.confidence !== null
  );

  if (ratedBets.length < 3) {
    return buildComponent({
      id: "confidence",
      label: "Cohérence de la confiance",
      score: 10,
      maximumScore,
      summary:
        "L’historique est encore trop limité pour juger précisément la calibration de la confiance.",
      evidence: [
        `${ratedBets.length} pari(s) clôturé(s) avec une confiance renseignée.`,
      ],
    });
  }

  const grouped = new Map<number, Bet[]>();

  for (const bet of ratedBets) {
    const confidence = Number(bet.confidence ?? 0);
    const group = grouped.get(confidence) ?? [];

    group.push(bet);
    grouped.set(confidence, group);
  }

  const levels = [...grouped.entries()]
    .map(([confidence, groupBets]) => ({
      confidence,
      bets: groupBets.length,
      roi: calculateRoi(groupBets),
      averageStake:
        groupBets.reduce(
          (sum, bet) => sum + getStake(bet),
          0
        ) / groupBets.length,
    }))
    .sort((a, b) => a.confidence - b.confidence);

  let inversions = 0;
  let comparisons = 0;

  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1];
    const current = levels[index];

    if (previous.bets < 2 || current.bets < 2) continue;

    comparisons += 1;

    if (current.roi < previous.roi - 10) {
      inversions += 1;
    }
  }

  const highConfidenceBets = ratedBets.filter(
    (bet) => Number(bet.confidence ?? 0) >= 4
  );

  const highConfidenceRoi =
    highConfidenceBets.length > 0
      ? calculateRoi(highConfidenceBets)
      : 0;

  let score = 14;

  if (comparisons > 0) {
    score +=
      (1 - inversions / comparisons) * 4;
  }

  if (
    highConfidenceBets.length >= 2 &&
    highConfidenceRoi >= 0
  ) {
    score += 2;
  }

  if (
    highConfidenceBets.length >= 2 &&
    highConfidenceRoi < -10
  ) {
    score -= 4;
  }

  const evidence = levels.map(
    (level) =>
      `${level.confidence}★ : ${level.bets} pari(s), ROI ${level.roi.toFixed(
        1
      )} %`
  );

  const summary =
    score >= 16
      ? "Les niveaux de confiance sont globalement cohérents avec les résultats observés."
      : score >= 11
        ? "La confiance est partiellement calibrée, mais certains niveaux se distinguent mal."
        : "Les paris les plus confiants ne performent pas suffisamment mieux que les autres.";

  return buildComponent({
    id: "confidence",
    label: "Cohérence de la confiance",
    score,
    maximumScore,
    summary,
    evidence,
  });
}

function scoreValue(
  bets: Bet[]
): DecisionScoreComponent {
  const maximumScore = 20;

  const ratedBets = bets.filter(
    (bet) =>
      isPerformanceBet(bet) &&
      bet.value_rating !== null
  );

  if (ratedBets.length < 3) {
    return buildComponent({
      id: "value",
      label: "Utilisation de la value",
      score: 10,
      maximumScore,
      summary:
        "Il manque encore suffisamment de paris clôturés avec une value renseignée.",
      evidence: [
        `${ratedBets.length} pari(s) clôturé(s) avec une value renseignée.`,
      ],
    });
  }

  const low = ratedBets.filter(
    (bet) => bet.value_rating === "low"
  );

  const medium = ratedBets.filter(
    (bet) => bet.value_rating === "medium"
  );

  const high = ratedBets.filter(
    (bet) => bet.value_rating === "high"
  );

  const lowRoi = calculateRoi(low);
  const mediumRoi = calculateRoi(medium);
  const highRoi = calculateRoi(high);

  const missingValueCount = bets.filter(
    (bet) => bet.value_rating === null
  ).length;

  const completionRate =
    bets.length > 0
      ? 1 - missingValueCount / bets.length
      : 0;

  let score = 8 + completionRate * 6;

  if (high.length >= 2 && highRoi >= mediumRoi) {
    score += 3;
  }

  if (
    medium.length >= 2 &&
    low.length >= 2 &&
    mediumRoi >= lowRoi
  ) {
    score += 2;
  }

  if (high.length >= 2 && highRoi < -10) {
    score -= 4;
  }

  const evidence = [
    `Value forte : ${high.length} pari(s), ROI ${highRoi.toFixed(
      1
    )} %`,
    `Value moyenne : ${medium.length} pari(s), ROI ${mediumRoi.toFixed(
      1
    )} %`,
    `Value faible : ${low.length} pari(s), ROI ${lowRoi.toFixed(
      1
    )} %`,
  ];

  const summary =
    score >= 16
      ? "La classification de la value est bien renseignée et semble utile pour hiérarchiser les opportunités."
      : score >= 11
        ? "La value apporte déjà de l’information, mais sa hiérarchie reste encore partiellement confirmée."
        : "La value est insuffisamment renseignée ou ne distingue pas encore les paris les plus performants.";

  return buildComponent({
    id: "value",
    label: "Utilisation de la value",
    score,
    maximumScore,
    summary,
    evidence,
  });
}

function scoreDiversification(
  bets: Bet[]
): DecisionScoreComponent {
  const maximumScore = 15;

  if (bets.length === 0) {
    return buildComponent({
      id: "diversification",
      label: "Diversification",
      score: 0,
      maximumScore,
      summary:
        "Aucun pari n’est disponible pour mesurer la diversification.",
      evidence: [],
    });
  }

  const bookmakerStakes = new Map<string, number>();
  const competitionStakes = new Map<string, number>();

  let totalStake = 0;

  for (const bet of bets) {
    const stake = getStake(bet);

    if (stake <= 0) continue;

    totalStake += stake;

    const bookmaker =
      bet.bookmaker.trim() || "Non renseigné";

    const competition =
      bet.competition.trim() || "Non renseignée";

    bookmakerStakes.set(
      bookmaker,
      (bookmakerStakes.get(bookmaker) ?? 0) + stake
    );

    competitionStakes.set(
      competition,
      (competitionStakes.get(competition) ?? 0) +
        stake
    );
  }

  if (totalStake <= 0) {
    return buildComponent({
      id: "diversification",
      label: "Diversification",
      score: 7,
      maximumScore,
      summary:
        "Les mises doivent être renseignées pour mesurer correctement la concentration.",
      evidence: [],
    });
  }

  const mainBookmakerShare =
    Math.max(...bookmakerStakes.values()) / totalStake;

  const mainCompetitionShare =
    Math.max(...competitionStakes.values()) / totalStake;

  let score = maximumScore;

  if (mainBookmakerShare > 0.7) score -= 4;
  else if (mainBookmakerShare > 0.55) score -= 2;

  if (mainCompetitionShare > 0.65) score -= 5;
  else if (mainCompetitionShare > 0.5) score -= 2;

  if (bookmakerStakes.size === 1 && bets.length >= 5) {
    score -= 2;
  }

  if (competitionStakes.size === 1 && bets.length >= 5) {
    score -= 2;
  }

  const evidence = [
    `${bookmakerStakes.size} bookmaker(s) utilisé(s)`,
    `${competitionStakes.size} compétition(s) représentée(s)`,
    `Bookmaker principal : ${(mainBookmakerShare * 100).toFixed(
      1
    )} % des mises`,
    `Compétition principale : ${(mainCompetitionShare * 100).toFixed(
      1
    )} % des mises`,
  ];

  const summary =
    score >= 12
      ? "L’exposition est suffisamment répartie pour limiter les concentrations excessives."
      : score >= 8
        ? "La diversification est acceptable, mais une partie importante des mises reste concentrée."
        : "L’historique est fortement concentré sur un nombre limité de segments.";

  return buildComponent({
    id: "diversification",
    label: "Diversification",
    score,
    maximumScore,
    summary,
    evidence,
  });
}

function scoreDiscipline(
  bets: Bet[]
): DecisionScoreComponent {
  const maximumScore = 15;

  if (bets.length === 0) {
    return buildComponent({
      id: "discipline",
      label: "Discipline des données",
      score: 0,
      maximumScore,
      summary:
        "Aucune donnée n’est disponible pour évaluer la discipline de suivi.",
      evidence: [],
    });
  }

  const requiredChecks = bets.map((bet) => {
    const fields = [
      bet.sport,
      bet.competition,
      bet.market,
      bet.bookmaker,
    ];

    const textFieldsComplete = fields.every(
      (field) =>
        typeof field === "string" &&
        normalizeText(field).length > 0
    );

    const stakeComplete = getStake(bet) > 0;
    const oddsComplete = Number(bet.odds) > 1;
    const confidenceComplete =
      bet.confidence !== null;
    const valueComplete =
      bet.value_rating !== null;

    const completed = [
      textFieldsComplete,
      stakeComplete,
      oddsComplete,
      confidenceComplete,
      valueComplete,
    ].filter(Boolean).length;

    return completed / 5;
  });

  const completionRate =
    requiredChecks.reduce(
      (sum, rate) => sum + rate,
      0
    ) / requiredChecks.length;

  const score = completionRate * maximumScore;

  const confidenceMissing = bets.filter(
    (bet) => bet.confidence === null
  ).length;

  const valueMissing = bets.filter(
    (bet) => bet.value_rating === null
  ).length;

  const invalidOdds = bets.filter(
    (bet) => Number(bet.odds) <= 1
  ).length;

  const evidence = [
    `Complétude globale : ${(completionRate * 100).toFixed(
      1
    )} %`,
    `${confidenceMissing} confiance(s) manquante(s)`,
    `${valueMissing} value(s) manquante(s)`,
  ];

  if (invalidOdds > 0) {
    evidence.push(
      `${invalidOdds} cote(s) invalide(s) ou manquante(s)`
    );
  }

  const summary =
    score >= 12
      ? "L’historique est bien renseigné et exploitable pour des analyses fiables."
      : score >= 8
        ? "Le suivi est globalement correct, mais plusieurs informations restent incomplètes."
        : "La qualité des données limite fortement la précision des analyses.";

  return buildComponent({
    id: "discipline",
    label: "Discipline des données",
    score,
    maximumScore,
    summary,
    evidence,
  });
}

function scorePerformance(
  bets: Bet[]
): DecisionScoreComponent {
  const maximumScore = 10;
  const performanceBets = bets.filter(isPerformanceBet);

  if (performanceBets.length === 0) {
    return buildComponent({
      id: "performance",
      label: "Performance réelle",
      score: 5,
      maximumScore,
      summary:
        "Aucun résultat exploitable n’est encore disponible.",
      evidence: [
        "Cette composante reste volontairement neutre.",
      ],
    });
  }

  const roi = calculateRoi(performanceBets);

  const wins = performanceBets.filter(
    (bet) => bet.status === "win"
  ).length;

  const losses = performanceBets.filter(
    (bet) => bet.status === "loss"
  ).length;

  const decisions = wins + losses;

  const winRate =
    decisions > 0 ? (wins / decisions) * 100 : 0;

  let score = 5;

  if (roi >= 15) score = 10;
  else if (roi >= 8) score = 9;
  else if (roi >= 3) score = 8;
  else if (roi >= 0) score = 7;
  else if (roi >= -5) score = 5;
  else if (roi >= -12) score = 3;
  else score = 1;

  const summary =
    score >= 8
      ? "La performance observée soutient actuellement la qualité du processus."
      : score >= 5
        ? "La performance reste neutre ou légèrement négative, sans remettre seule en cause le processus."
        : "Les résultats sont actuellement nettement négatifs et doivent être analysés avec les autres composantes.";

  return buildComponent({
    id: "performance",
    label: "Performance réelle",
    score,
    maximumScore,
    summary,
    evidence: [
      `ROI : ${roi.toFixed(1)} %`,
      `Win rate : ${winRate.toFixed(1)} %`,
      `${performanceBets.length} pari(s) exploitable(s)`,
    ],
  });
}

export function calculateDecisionScore(
  bets: Bet[]
): DecisionScoreReport {
  const performanceBets = bets.filter(isPerformanceBet);

  const components = [
    scoreStakeManagement(bets),
    scoreConfidence(bets),
    scoreValue(bets),
    scoreDiversification(bets),
    scoreDiscipline(bets),
    scorePerformance(bets),
  ];

  const rawScore = components.reduce(
    (sum, component) => sum + component.score,
    0
  );

  const score = round(
    clamp(rawScore, 0, MAXIMUM_SCORE)
  );

  const isReliable = performanceBets.length >= 10;
  const tone = getTone(score);

  const strengths = components
    .filter((component) => component.percentage >= 75)
    .sort(
      (a, b) => b.percentage - a.percentage
    )
    .slice(0, 3)
    .map(
      (component) =>
        `${component.label} : ${component.summary}`
    );

  const warnings = components
    .filter((component) => component.percentage < 60)
    .sort(
      (a, b) => a.percentage - b.percentage
    )
    .slice(0, 3)
    .map(
      (component) =>
        `${component.label} : ${component.summary}`
    );

  if (!isReliable) {
    warnings.unshift(
      `Le score reste provisoire avec seulement ${performanceBets.length} pari(s) clôturé(s) exploitable(s).`
    );
  }

  return {
    score,
    maximumScore: MAXIMUM_SCORE,
    percentage: score,
    tone: isReliable ? tone : "insufficient",
    label: getScoreLabel(tone, isReliable),
    sampleSize: performanceBets.length,
    isReliable,
    components,
    strengths,
    warnings: warnings.slice(0, 3),
  };
}
