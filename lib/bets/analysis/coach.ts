import type { Bet } from "@/lib/bets/types";

import { calculateDecisionScore } from "./decisionScore";
import type {
  CoachBias,
  CoachBiasType,
  CoachFinding,
  CoachFindingPriority,
  CoachFindingTone,
  CoachFindingType,
  CoachReport,
  DecisionScoreReport,
} from "./types";

type SettledBet = Bet;

type PerformanceSnapshot = {
  bets: number;
  stake: number;
  profit: number;
  roi: number;
  wins: number;
  losses: number;
  winRate: number;
  averageStake: number;
};

type SegmentSnapshot = PerformanceSnapshot & {
  key: string;
  label: string;
};

type CoachContext = {
  bets: Bet[];
  settledBets: SettledBet[];
  decisionScore: DecisionScoreReport;
  global: PerformanceSnapshot;
  confidence: SegmentSnapshot[];
  values: SegmentSnapshot[];
  bookmakers: SegmentSnapshot[];
  competitions: SegmentSnapshot[];
  markets: SegmentSnapshot[];
  odds: SegmentSnapshot[];
  recentBets: SettledBet[];
  previousBets: SettledBet[];
};

type InternalRuleResult = {
  findings?: CoachFinding[];
  biases?: CoachBias[];
};

type InternalCoachRule = {
  id: string;
  label: string;
  minimumSampleSize: number;
  evaluate: (context: CoachContext) => InternalRuleResult | null;
};

const MINIMUM_RELIABLE_SAMPLE = 10;
const MAX_FINDINGS_PER_GROUP = 4;
const MAX_BIASES = 3;

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

function getOdds(bet: Bet) {
  return Number(bet.odds ?? 0);
}

function isSettledBet(bet: Bet): bet is SettledBet {
  return (
    bet.status !== "pending" &&
    bet.status !== "void" &&
    bet.profit_loss !== null
  );
}

function getBetTimestamp(bet: Bet) {
  const rawDate =
    "placed_at" in bet && typeof bet.placed_at === "string"
      ? bet.placed_at
      : "created_at" in bet && typeof bet.created_at === "string"
        ? bet.created_at
        : "";

  const timestamp = Date.parse(rawDate);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculatePerformance(
  bets: Bet[]
): PerformanceSnapshot {
  const settled = bets.filter(isSettledBet);

  const stake = settled.reduce(
    (sum, bet) => sum + getStake(bet),
    0
  );

  const profit = settled.reduce(
    (sum, bet) => sum + getProfit(bet),
    0
  );

  const wins = settled.filter(
    (bet) => bet.status === "win"
  ).length;

  const losses = settled.filter(
    (bet) => bet.status === "loss"
  ).length;

  const decisions = wins + losses;

  return {
    bets: settled.length,
    stake,
    profit,
    roi: stake > 0 ? (profit / stake) * 100 : 0,
    wins,
    losses,
    winRate:
      decisions > 0 ? (wins / decisions) * 100 : 0,
    averageStake:
      settled.length > 0 ? stake / settled.length : 0,
  };
}

function groupPerformance(
  bets: Bet[],
  getKey: (bet: Bet) => string,
  getLabel?: (key: string) => string
): SegmentSnapshot[] {
  const groups = new Map<string, Bet[]>();

  for (const bet of bets.filter(isSettledBet)) {
    const rawKey = getKey(bet).trim();
    const key = rawKey || "non-renseigne";
    const group = groups.get(key) ?? [];

    group.push(bet);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, groupBets]) => ({
      key,
      label: getLabel ? getLabel(key) : key,
      ...calculatePerformance(groupBets),
    }))
    .sort((a, b) => {
      if (b.bets !== a.bets) return b.bets - a.bets;
      return b.roi - a.roi;
    });
}

function getOddsBucket(odds: number) {
  if (odds < 1.5) return "1.01–1.49";
  if (odds < 1.8) return "1.50–1.79";
  if (odds < 2.2) return "1.80–2.19";
  if (odds < 3) return "2.20–2.99";
  if (odds < 4) return "3.00–3.99";

  return "4.00+";
}

function getValueLabel(value: string) {
  if (value === "high") return "Value forte";
  if (value === "medium") return "Value moyenne";
  if (value === "low") return "Value faible";

  return "Non renseignée";
}

function buildContext(
  bets: Bet[],
  decisionScore: DecisionScoreReport
): CoachContext {
  const settledBets = bets
    .filter(isSettledBet)
    .sort(
      (a, b) =>
        getBetTimestamp(a) - getBetTimestamp(b)
    );

  const splitIndex = Math.floor(settledBets.length / 2);

  return {
    bets,
    settledBets,
    decisionScore,
    global: calculatePerformance(settledBets),
    confidence: groupPerformance(
      settledBets,
      (bet) => String(bet.confidence ?? "0"),
      (key) =>
        key === "0" ? "Non renseignée" : `${key}★`
    ),
    values: groupPerformance(
      settledBets,
      (bet) => String(bet.value_rating ?? ""),
      getValueLabel
    ),
    bookmakers: groupPerformance(
      settledBets,
      (bet) => bet.bookmaker
    ),
    competitions: groupPerformance(
      settledBets,
      (bet) => bet.competition
    ),
    markets: groupPerformance(
      settledBets,
      (bet) => bet.market
    ),
    odds: groupPerformance(
      settledBets,
      (bet) => getOddsBucket(getOdds(bet))
    ),
    recentBets: settledBets.slice(splitIndex),
    previousBets: settledBets.slice(0, splitIndex),
  };
}

function finding(
  ruleId: string,
  id: string,
  type: CoachFindingType,
  tone: CoachFindingTone,
  priority: CoachFindingPriority,
  title: string,
  description: string,
  metric: string | null,
  evidence: string[]
): CoachFinding {
  return {
    id,
    ruleId,
    type,
    tone,
    priority,
    title,
    description,
    metric,
    evidence,
  };
}

function bias(
  ruleId: string,
  id: string,
  type: CoachBiasType,
  tone: "warning" | "critical",
  priority: CoachFindingPriority,
  title: string,
  description: string,
  evidence: string[]
): CoachBias {
  return {
    id,
    ruleId,
    type,
    tone,
    priority,
    title,
    description,
    evidence,
  };
}

function priorityWeight(priority: CoachFindingPriority) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;

  return 1;
}

function uniqueById<T extends { id: string }>(
  values: T[]
) {
  const seen = new Set<string>();

  return values.filter((value) => {
    if (seen.has(value.id)) return false;

    seen.add(value.id);
    return true;
  });
}

function sortFindings(findings: CoachFinding[]) {
  return [...findings].sort((a, b) => {
    const priorityDifference =
      priorityWeight(b.priority) -
      priorityWeight(a.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return a.title.localeCompare(b.title, "fr");
  });
}

function sortBiases(biases: CoachBias[]) {
  return [...biases].sort((a, b) => {
    const priorityDifference =
      priorityWeight(b.priority) -
      priorityWeight(a.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    if (a.tone === b.tone) {
      return a.title.localeCompare(b.title, "fr");
    }

    return a.tone === "critical" ? -1 : 1;
  });
}

function findSegment(
  segments: SegmentSnapshot[],
  key: string
) {
  const normalizedKey = normalizeText(key);

  return segments.find(
    (segment) =>
      normalizeText(segment.key) === normalizedKey ||
      normalizeText(segment.label) === normalizedKey
  );
}

const rules: InternalCoachRule[] = [
  {
    id: "COACH_001",
    label: "Lecture globale du Decision Score",
    minimumSampleSize: 0,
    evaluate(context) {
      const { decisionScore } = context;
      const findings: CoachFinding[] = [];

      if (decisionScore.score >= 80) {
        findings.push(
          finding(
            "COACH_001",
            "decision-score-strong",
            "strength",
            "positive",
            "high",
            "Processus de décision solide",
            "Ton Decision Score indique que la qualité globale de ton processus est déjà bien structurée.",
            `${decisionScore.score} / 100`,
            decisionScore.strengths
          )
        );
      } else if (decisionScore.score < 60) {
        findings.push(
          finding(
            "COACH_001",
            "decision-score-weak",
            "weakness",
            "warning",
            "high",
            "Processus encore fragile",
            "Plusieurs dimensions de ta méthode réduisent actuellement la qualité globale de tes décisions.",
            `${decisionScore.score} / 100`,
            decisionScore.warnings
          )
        );
      }

      return findings.length > 0 ? { findings } : null;
    },
  },
  {
    id: "COACH_002",
    label: "Calibration des niveaux de confiance",
    minimumSampleSize: 6,
    evaluate(context) {
      const highConfidence = context.confidence.filter(
        (segment) =>
          Number.parseInt(segment.key, 10) >= 4
      );

      const mediumConfidence = context.confidence.filter(
        (segment) =>
          Number.parseInt(segment.key, 10) >= 2 &&
          Number.parseInt(segment.key, 10) <= 3
      );

      const highPerformance = calculatePerformance(
        context.settledBets.filter(
          (bet) => Number(bet.confidence ?? 0) >= 4
        )
      );

      const mediumPerformance = calculatePerformance(
        context.settledBets.filter((bet) => {
          const confidence = Number(
            bet.confidence ?? 0
          );

          return confidence >= 2 && confidence <= 3;
        })
      );

      const highCount = highConfidence.reduce(
        (sum, segment) => sum + segment.bets,
        0
      );

      const mediumCount = mediumConfidence.reduce(
        (sum, segment) => sum + segment.bets,
        0
      );

      if (
        highCount >= 3 &&
        mediumCount >= 3 &&
        highPerformance.roi <
          mediumPerformance.roi - 8
      ) {
        return {
          findings: [
            finding(
              "COACH_002",
              "confidence-calibration-warning",
              "weakness",
              "warning",
              "high",
              "Confiance maximale mal calibrée",
              "Tes paris notés 4★ ou 5★ performent moins bien que les niveaux intermédiaires. Ta conviction ne traduit pas encore suffisamment un avantage mesurable.",
              `Écart ROI : ${round(
                highPerformance.roi -
                  mediumPerformance.roi
              )} pts`,
              [
                `4–5★ : ${highCount} paris, ROI ${round(
                  highPerformance.roi
                )} %`,
                `2–3★ : ${mediumCount} paris, ROI ${round(
                  mediumPerformance.roi
                )} %`,
              ]
            ),
            finding(
              "COACH_002",
              "confidence-calibration-recommendation",
              "recommendation",
              "neutral",
              "high",
              "Rends les 5★ plus rares",
              "Réserve les niveaux de confiance les plus élevés aux paris qui cumulent des éléments objectifs forts et une value clairement identifiée.",
              null,
              [
                "Compare systématiquement un futur 5★ à tes anciens 3★.",
                "N’augmente pas la mise uniquement parce que la conviction est forte.",
              ]
            ),
          ],
          biases: [
            bias(
              "COACH_002",
              "overconfidence-bias",
              "overconfidence",
              "warning",
              "high",
              "Excès de confiance possible",
              "Les niveaux de confiance élevés ne sont pas confirmés par une meilleure performance historique.",
              [
                `ROI 4–5★ : ${round(
                  highPerformance.roi
                )} %`,
                `ROI 2–3★ : ${round(
                  mediumPerformance.roi
                )} %`,
              ]
            ),
          ],
        };
      }

      if (
        highCount >= 3 &&
        mediumCount >= 3 &&
        highPerformance.roi >
          mediumPerformance.roi + 5
      ) {
        return {
          findings: [
            finding(
              "COACH_002",
              "confidence-calibration-strength",
              "strength",
              "positive",
              "high",
              "Confiance bien calibrée",
              "Tes paris les plus confiants obtiennent de meilleurs résultats que les niveaux intermédiaires.",
              `ROI 4–5★ : ${round(
                highPerformance.roi
              )} %`,
              [
                `Écart positif de ${round(
                  highPerformance.roi -
                    mediumPerformance.roi
                )} points de ROI.`,
              ]
            ),
          ],
        };
      }

      return null;
    },
  },
  {
    id: "COACH_003",
    label: "Qualité de la value",
    minimumSampleSize: 6,
    evaluate(context) {
      const high = findSegment(
        context.values,
        "Value forte"
      );
      const low = findSegment(
        context.values,
        "Value faible"
      );

      if (
        high &&
        low &&
        high.bets >= 3 &&
        low.bets >= 3 &&
        high.roi > low.roi + 8
      ) {
        return {
          findings: [
            finding(
              "COACH_003",
              "value-use-strength",
              "strength",
              "positive",
              "high",
              "La value distingue tes meilleures décisions",
              "Tes paris classés en value forte surperforment nettement les paris classés en value faible.",
              `Écart ROI : +${round(
                high.roi - low.roi
              )} pts`,
              [
                `Value forte : ${high.bets} paris, ROI ${round(
                  high.roi
                )} %`,
                `Value faible : ${low.bets} paris, ROI ${round(
                  low.roi
                )} %`,
              ]
            ),
          ],
        };
      }

      if (
        high &&
        high.bets >= 3 &&
        high.roi < -8
      ) {
        return {
          findings: [
            finding(
              "COACH_003",
              "value-use-warning",
              "weakness",
              "warning",
              "high",
              "La value forte est surestimée",
              "Les paris que tu identifies comme les meilleures opportunités restent nettement négatifs.",
              `ROI : ${round(high.roi)} %`,
              [
                `${high.bets} paris classés en value forte.`,
              ]
            ),
            finding(
              "COACH_003",
              "value-use-recommendation",
              "recommendation",
              "neutral",
              "high",
              "Renforce les critères de value",
              "Ajoute une justification objective avant de classer un pari en value forte : probabilité estimée, cote juste et marge par rapport au marché.",
              null,
              [
                "Une forte conviction n’est pas automatiquement une forte value.",
              ]
            ),
          ],
          biases: [
            bias(
              "COACH_003",
              "value-misuse-bias",
              "valueMisuse",
              "warning",
              "high",
              "Mauvaise utilisation possible de la value",
              "La catégorie value forte ne correspond pas encore à un avantage historique mesurable.",
              [
                `ROI value forte : ${round(
                  high.roi
                )} %`,
              ]
            ),
          ],
        };
      }

      return null;
    },
  },
  {
    id: "COACH_004",
    label: "Concentration par compétition",
    minimumSampleSize: 5,
    evaluate(context) {
      const totalStake = context.global.stake;

      if (totalStake <= 0) return null;

      const mainCompetition = [...context.competitions]
        .sort((a, b) => b.stake - a.stake)[0];

      if (!mainCompetition) return null;

      const share =
        mainCompetition.stake / totalStake;

      if (share < 0.6) return null;

      const critical = share >= 0.8;

      return {
        findings: [
          finding(
            "COACH_004",
            "competition-concentration",
            "weakness",
            critical ? "critical" : "warning",
            critical ? "high" : "medium",
            "Exposition concentrée",
            `${round(
              share * 100
            )} % de tes mises clôturées concernent ${mainCompetition.label}. Cette concentration augmente ton risque spécifique.`,
            `${round(share * 100)} %`,
            [
              `${mainCompetition.bets} paris sur cette compétition.`,
              `ROI du segment : ${round(
                mainCompetition.roi
              )} %`,
            ]
          ),
          finding(
            "COACH_004",
            "competition-concentration-recommendation",
            "recommendation",
            "neutral",
            critical ? "high" : "medium",
            "Fixe une limite de concentration",
            "Évite qu’une seule compétition représente durablement la majorité de ton capital engagé, sauf avantage démontré sur un échantillon robuste.",
            null,
            [
              "Une concentration rentable peut être volontaire, mais elle doit rester mesurée.",
            ]
          ),
        ],
        biases: [
          bias(
            "COACH_004",
            "competition-concentration-bias",
            "concentration",
            critical ? "critical" : "warning",
            critical ? "high" : "medium",
            "Biais de concentration",
            `Ton historique dépend fortement de ${mainCompetition.label}.`,
            [
              `${round(
                share * 100
              )} % du volume de mises.`,
            ]
          ),
        ],
      };
    },
  },
  {
    id: "COACH_005",
    label: "Régularité des mises",
    minimumSampleSize: 5,
    evaluate(context) {
      const stakes = context.settledBets
        .map(getStake)
        .filter((stake) => stake > 0);

      if (stakes.length < 5) return null;

      const average =
        stakes.reduce((sum, stake) => sum + stake, 0) /
        stakes.length;

      const maximum = Math.max(...stakes);
      const minimum = Math.min(...stakes);
      const ratio =
        minimum > 0 ? maximum / minimum : 0;

      if (ratio <= 2.5) {
        return {
          findings: [
            finding(
              "COACH_005",
              "stake-regularity-strength",
              "strength",
              "positive",
              "medium",
              "Mises régulières",
              "La taille de tes mises reste suffisamment stable pour limiter les décisions impulsives.",
              `Mise moyenne : ${round(average, 2)} €`,
              [
                `Écart min/max : ×${round(ratio, 2)}`,
              ]
            ),
          ],
        };
      }

      if (ratio >= 5) {
        return {
          findings: [
            finding(
              "COACH_005",
              "stake-regularity-warning",
              "weakness",
              "warning",
              "high",
              "Mises très irrégulières",
              "L’écart entre tes plus petites et tes plus grosses mises est important. Cette variabilité peut amplifier la variance et les décisions émotionnelles.",
              `Écart min/max : ×${round(ratio, 2)}`,
              [
                `Mise minimale : ${round(
                  minimum,
                  2
                )} €`,
                `Mise maximale : ${round(
                  maximum,
                  2
                )} €`,
              ]
            ),
          ],
          biases: [
            bias(
              "COACH_005",
              "stake-inconsistency-bias",
              "stakeInconsistency",
              "warning",
              "high",
              "Incohérence des mises",
              "La taille des mises varie fortement sans que le moteur puisse confirmer que ces écarts suivent la qualité des opportunités.",
              [
                `Ratio maximal : ×${round(
                  ratio,
                  2
                )}`,
              ]
            ),
          ],
        };
      }

      return null;
    },
  },
  {
    id: "COACH_006",
    label: "Alignement confiance et mise",
    minimumSampleSize: 6,
    evaluate(context) {
      const rated = context.settledBets.filter(
        (bet) =>
          Number(bet.confidence ?? 0) > 0 &&
          getStake(bet) > 0
      );

      if (rated.length < 6) return null;

      const high = rated.filter(
        (bet) => Number(bet.confidence ?? 0) >= 4
      );

      const low = rated.filter(
        (bet) => Number(bet.confidence ?? 0) <= 2
      );

      if (high.length < 2 || low.length < 2) {
        return null;
      }

      const highAverage =
        high.reduce(
          (sum, bet) => sum + getStake(bet),
          0
        ) / high.length;

      const lowAverage =
        low.reduce(
          (sum, bet) => sum + getStake(bet),
          0
        ) / low.length;

      if (lowAverage <= 0) return null;

      const ratio = highAverage / lowAverage;

      if (ratio < 0.85) {
        return {
          findings: [
            finding(
              "COACH_006",
              "confidence-stake-mismatch",
              "weakness",
              "warning",
              "medium",
              "Confiance et mise désalignées",
              "Tes paris les plus confiants reçoivent en moyenne une mise inférieure à tes paris faiblement confiants.",
              `Ratio : ×${round(ratio, 2)}`,
              [
                `Mise moyenne 4–5★ : ${round(
                  highAverage,
                  2
                )} €`,
                `Mise moyenne 1–2★ : ${round(
                  lowAverage,
                  2
                )} €`,
              ]
            ),
          ],
          biases: [
            bias(
              "COACH_006",
              "confidence-stake-mismatch-bias",
              "confidenceStakeMismatch",
              "warning",
              "medium",
              "Désalignement confiance–mise",
              "La taille des mises ne suit pas la hiérarchie de confiance renseignée.",
              [
                `Ratio moyen : ×${round(
                  ratio,
                  2
                )}`,
              ]
            ),
          ],
        };
      }

      if (ratio >= 1.1 && ratio <= 2.5) {
        return {
          findings: [
            finding(
              "COACH_006",
              "confidence-stake-alignment",
              "strength",
              "positive",
              "medium",
              "Mises cohérentes avec la confiance",
              "La taille moyenne des mises augmente de manière mesurée avec le niveau de confiance.",
              `Ratio : ×${round(ratio, 2)}`,
              [
                `Mise moyenne 4–5★ : ${round(
                  highAverage,
                  2
                )} €`,
                `Mise moyenne 1–2★ : ${round(
                  lowAverage,
                  2
                )} €`,
              ]
            ),
          ],
        };
      }

      return null;
    },
  },
  {
    id: "COACH_007",
    label: "Plages de cotes",
    minimumSampleSize: 8,
    evaluate(context) {
      const eligible = context.odds.filter(
        (segment) => segment.bets >= 3
      );

      if (eligible.length < 2) return null;

      const best = [...eligible].sort(
        (a, b) => b.roi - a.roi
      )[0];

      const worst = [...eligible].sort(
        (a, b) => a.roi - b.roi
      )[0];

      if (
        best &&
        worst &&
        best.key !== worst.key &&
        best.roi - worst.roi >= 15
      ) {
        return {
          findings: [
            finding(
              "COACH_007",
              "odds-range-observation",
              "observation",
              "neutral",
              "medium",
              "Une plage de cotes se distingue",
              `La plage ${best.label} surperforme actuellement la plage ${worst.label}.`,
              `Écart ROI : ${round(
                best.roi - worst.roi
              )} pts`,
              [
                `${best.label} : ${best.bets} paris, ROI ${round(
                  best.roi
                )} %`,
                `${worst.label} : ${worst.bets} paris, ROI ${round(
                  worst.roi
                )} %`,
              ]
            ),
          ],
        };
      }

      return null;
    },
  },
  {
    id: "COACH_008",
    label: "Meilleur segment récurrent",
    minimumSampleSize: 8,
    evaluate(context) {
      const candidates = [
        ...context.bookmakers.map((segment) => ({
          ...segment,
          family: "bookmaker",
        })),
        ...context.markets.map((segment) => ({
          ...segment,
          family: "marché",
        })),
        ...context.competitions.map((segment) => ({
          ...segment,
          family: "compétition",
        })),
      ].filter(
        (segment) =>
          segment.bets >= 3 &&
          segment.roi >= 8 &&
          segment.profit > 0
      );

      const best = candidates.sort((a, b) => {
        if (b.profit !== a.profit) {
          return b.profit - a.profit;
        }

        return b.roi - a.roi;
      })[0];

      if (!best) return null;

      return {
        findings: [
          finding(
            "COACH_008",
            "best-recurring-segment",
            "observation",
            "positive",
            "medium",
            `${best.label} est un segment performant`,
            `Ce ${best.family} combine actuellement un résultat positif et un échantillon déjà exploitable.`,
            `ROI ${round(best.roi)} %`,
            [
              `${best.bets} paris`,
              `Profit : ${round(best.profit, 2)} €`,
            ]
          ),
        ],
      };
    },
  },
  {
    id: "COACH_009",
    label: "Évolution récente",
    minimumSampleSize: 10,
    evaluate(context) {
      if (
        context.recentBets.length < 4 ||
        context.previousBets.length < 4
      ) {
        return null;
      }

      const recent = calculatePerformance(
        context.recentBets
      );

      const previous = calculatePerformance(
        context.previousBets
      );

      const difference = recent.roi - previous.roi;

      if (difference >= 12) {
        return {
          findings: [
            finding(
              "COACH_009",
              "recent-improvement",
              "observation",
              "positive",
              "medium",
              "Dynamique récente en amélioration",
              "La seconde moitié de ton historique affiche un ROI supérieur à la première.",
              `Progression : +${round(difference)} pts`,
              [
                `Période récente : ROI ${round(
                  recent.roi
                )} %`,
                `Période précédente : ROI ${round(
                  previous.roi
                )} %`,
              ]
            ),
          ],
        };
      }

      if (difference <= -12) {
        return {
          findings: [
            finding(
              "COACH_009",
              "recent-decline",
              "observation",
              "warning",
              "medium",
              "Dynamique récente en recul",
              "La seconde moitié de ton historique performe moins bien que la première. Vérifie si ta sélection ou tes mises ont changé.",
              `Évolution : ${round(difference)} pts`,
              [
                `Période récente : ROI ${round(
                  recent.roi
                )} %`,
                `Période précédente : ROI ${round(
                  previous.roi
                )} %`,
              ]
            ),
          ],
        };
      }

      return null;
    },
  },
  {
    id: "COACH_010",
    label: "Priorité d’amélioration",
    minimumSampleSize: 0,
    evaluate(context) {
      const weakest = [...context.decisionScore.components]
        .sort(
          (a, b) => a.percentage - b.percentage
        )[0];

      if (!weakest || weakest.percentage >= 75) {
        return null;
      }

      return {
        findings: [
          finding(
            "COACH_010",
            `priority-${weakest.id}`,
            "recommendation",
            "neutral",
            weakest.percentage < 50
              ? "high"
              : "medium",
            `Priorité : ${weakest.label}`,
            weakest.summary,
            `${weakest.score} / ${weakest.maximumScore}`,
            weakest.evidence
          ),
        ],
      };
    },
  },
];

function buildSummary(
  context: CoachContext,
  report: Omit<CoachReport, "summary" | "generatedAt">
) {
  if (context.settledBets.length === 0) {
    return "Je manque encore de paris clôturés pour établir un diagnostic de coaching.";
  }

  if (!report.isReliable) {
    return `Le diagnostic reste provisoire avec ${report.sampleSize} pari(s) clôturé(s). Le moteur commence néanmoins à identifier les premières tendances de ton processus.`;
  }

  if (report.detectedBiases.length > 0) {
    const mainBias = report.detectedBiases[0];

    return `Ton processus présente plusieurs signaux exploitables. Le point prioritaire concerne actuellement ${mainBias.title.toLocaleLowerCase(
      "fr-FR"
    )}.`;
  }

  if (
    report.strengths.length >= 2 &&
    report.weaknesses.length === 0
  ) {
    return "Ton processus de décision est globalement cohérent. Les principaux leviers consistent maintenant à confirmer ces forces sur un échantillon plus large.";
  }

  if (report.weaknesses.length > 0) {
    return `Ton historique met en évidence ${report.weaknesses.length} axe(s) de progression et ${report.strengths.length} point(s) fort(s).`;
  }

  return "Le moteur ne détecte pas encore de déséquilibre majeur. Continue à enrichir l’historique pour rendre le coaching plus précis.";
}

export function generateCoachReport(
  bets: Bet[],
  providedDecisionScore?: DecisionScoreReport
): CoachReport {
  const decisionScore =
    providedDecisionScore ??
    calculateDecisionScore(bets);

  const context = buildContext(
    bets,
    decisionScore
  );

  const findings: CoachFinding[] = [];
  const detectedBiases: CoachBias[] = [];

  for (const rule of rules) {
    if (
      context.settledBets.length <
      rule.minimumSampleSize
    ) {
      continue;
    }

    const result = rule.evaluate(context);

    if (!result) continue;

    if (result.findings) {
      findings.push(...result.findings);
    }

    if (result.biases) {
      detectedBiases.push(...result.biases);
    }
  }

  const uniqueFindings = uniqueById(findings);
  const uniqueBiases = uniqueById(detectedBiases);

  const observations = sortFindings(
    uniqueFindings.filter(
      (item) => item.type === "observation"
    )
  ).slice(0, MAX_FINDINGS_PER_GROUP);

  const strengths = sortFindings(
    uniqueFindings.filter(
      (item) => item.type === "strength"
    )
  ).slice(0, MAX_FINDINGS_PER_GROUP);

  const weaknesses = sortFindings(
    uniqueFindings.filter(
      (item) => item.type === "weakness"
    )
  ).slice(0, MAX_FINDINGS_PER_GROUP);

  const recommendations = sortFindings(
    uniqueFindings.filter(
      (item) => item.type === "recommendation"
    )
  ).slice(0, MAX_FINDINGS_PER_GROUP);

  const sortedBiases = sortBiases(
    uniqueBiases
  ).slice(0, MAX_BIASES);

  const baseReport = {
    sampleSize: context.settledBets.length,
    isReliable:
      context.settledBets.length >=
      MINIMUM_RELIABLE_SAMPLE,
    observations,
    strengths,
    weaknesses,
    recommendations,
    detectedBiases: sortedBiases,
  };

  return {
    generatedAt: new Date().toISOString(),
    ...baseReport,
    summary: buildSummary(context, baseReport),
  };
}

export function getCoachRules() {
  return rules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    minimumSampleSize: rule.minimumSampleSize,
  }));
}
