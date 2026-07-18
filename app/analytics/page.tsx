"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { listBets } from "@/lib/bets/client";
import type { Bet } from "@/lib/bets/types";

const INITIAL_BANKROLL = 10_000;

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function signedEuros(value: number) {
  if (value > 0) return `+${euros(value)}`;
  if (value < 0) return `-${euros(Math.abs(value))}`;

  return euros(0);
}

function percent(value: number) {
  return `${value.toFixed(1)} %`;
}

function betDate(bet: Bet) {
  return new Date(
    bet.updated_at ??
      bet.kickoff_at ??
      bet.created_at
  );
}

function isSettled(bet: Bet) {
  return ["win", "loss", "void", "cashout"].includes(
    bet.status
  );
}

function oddsRange(odds: number) {
  if (odds < 1.5) return "Moins de 1.50";
  if (odds < 1.8) return "1.50 – 1.79";
  if (odds < 2.2) return "1.80 – 2.19";
  if (odds < 3) return "2.20 – 2.99";

  return "3.00 et plus";
}

const ODDS_RANGE_ORDER = [
  "Moins de 1.50",
  "1.50 – 1.79",
  "1.80 – 2.19",
  "2.20 – 2.99",
  "3.00 et plus",
];

type BankrollPoint = {
  label: string;
  bankroll: number;
  profit: number;
};

type PerformanceGroup = {
  name: string;
  bets: number;
  stake: number;
  profit: number;
  roi: number;
  wins: number;
  losses: number;
};

type GroupAccumulator = {
  bets: number;
  stake: number;
  profit: number;
  wins: number;
  losses: number;
};

function buildPerformanceGroups(
  bets: Bet[],
  getName: (bet: Bet) => string
): PerformanceGroup[] {
  const groups = new Map<
    string,
    GroupAccumulator
  >();

  bets.forEach((bet) => {
    const name = getName(bet).trim() || "Non renseigné";

    const current = groups.get(name) ?? {
      bets: 0,
      stake: 0,
      profit: 0,
      wins: 0,
      losses: 0,
    };

    current.bets += 1;
    current.stake += Number(bet.stake);
    current.profit += Number(
      bet.profit_loss ?? 0
    );

    if (bet.status === "win") {
      current.wins += 1;
    }

    if (bet.status === "loss") {
      current.losses += 1;
    }

    groups.set(name, current);
  });

  return Array.from(groups.entries()).map(
    ([name, data]) => ({
      name,
      ...data,
      roi:
        data.stake > 0
          ? (data.profit / data.stake) * 100
          : 0,
    })
  );
}

export default function AnalyticsPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listBets()
      .then(setBets)
      .catch((cause) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Chargement des analyses impossible."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const analytics = useMemo(() => {
    const settled = bets
      .filter(isSettled)
      .sort(
        (a, b) =>
          betDate(a).getTime() -
          betDate(b).getTime()
      );

    const decisive = settled.filter(
      (bet) =>
        bet.status === "win" ||
        bet.status === "loss"
    );

    const wins = decisive.filter(
      (bet) => bet.status === "win"
    );

    const losses = decisive.filter(
      (bet) => bet.status === "loss"
    );

    const totalProfit = settled.reduce(
      (sum, bet) =>
        sum + Number(bet.profit_loss ?? 0),
      0
    );

    const totalStaked = settled.reduce(
      (sum, bet) => sum + Number(bet.stake),
      0
    );

    const roi =
      totalStaked > 0
        ? (totalProfit / totalStaked) * 100
        : 0;

    const winRate =
      decisive.length > 0
        ? (wins.length / decisive.length) * 100
        : 0;

    const averageStake =
      settled.length > 0
        ? totalStaked / settled.length
        : 0;

    let cumulativeProfit = 0;

    const bankrollPoints: BankrollPoint[] =
      settled.map((bet) => {
        cumulativeProfit += Number(
          bet.profit_loss ?? 0
        );

        return {
          label: new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "2-digit",
          }).format(betDate(bet)),
          bankroll:
            INITIAL_BANKROLL + cumulativeProfit,
          profit: cumulativeProfit,
        };
      });

    const bookmakers = buildPerformanceGroups(
      settled,
      (bet) => bet.bookmaker || "Non renseigné"
    ).sort((a, b) => b.profit - a.profit);

    const markets = buildPerformanceGroups(
      settled,
      (bet) => bet.market || "Non renseigné"
    ).sort((a, b) => b.profit - a.profit);

    const oddsRanges = buildPerformanceGroups(
      settled,
      (bet) => oddsRange(Number(bet.odds))
    ).sort(
      (a, b) =>
        ODDS_RANGE_ORDER.indexOf(a.name) -
        ODDS_RANGE_ORDER.indexOf(b.name)
    );

    const bestBookmaker =
      bookmakers.length > 0
        ? bookmakers[0]
        : null;

    const worstBookmaker =
      bookmakers.length > 0
        ? [...bookmakers].sort(
            (a, b) => a.profit - b.profit
          )[0]
        : null;

    const bestMarket =
      markets.length > 0
        ? markets[0]
        : null;

    const worstMarket =
      markets.length > 0
        ? [...markets].sort(
            (a, b) => a.profit - b.profit
          )[0]
        : null;

    const bestOddsRange =
      oddsRanges.length > 0
        ? [...oddsRanges].sort(
            (a, b) => b.roi - a.roi
          )[0]
        : null;

    let reliabilityLabel = "Insuffisant";
    let reliabilityDetail =
      "Moins de 10 paris clôturés.";

    if (settled.length >= 100) {
      reliabilityLabel = "Élevé";
      reliabilityDetail =
        "Plus de 100 paris clôturés.";
    } else if (settled.length >= 50) {
      reliabilityLabel = "Correct";
      reliabilityDetail =
        "Plus de 50 paris clôturés.";
    } else if (settled.length >= 20) {
      reliabilityLabel = "Modéré";
      reliabilityDetail =
        "Entre 20 et 49 paris clôturés.";
    } else if (settled.length >= 10) {
      reliabilityLabel = "Faible";
      reliabilityDetail =
        "Entre 10 et 19 paris clôturés.";
    }

    return {
      settled,
      settledCount: settled.length,
      decisiveCount: decisive.length,
      winsCount: wins.length,
      lossesCount: losses.length,
      totalProfit,
      totalStaked,
      roi,
      winRate,
      averageStake,
      currentBankroll:
        INITIAL_BANKROLL + totalProfit,
      bankrollPoints,
      bookmakers,
      markets,
      oddsRanges,
      bestBookmaker,
      worstBookmaker,
      bestMarket,
      worstMarket,
      bestOddsRange,
      reliabilityLabel,
      reliabilityDetail,
    };
  }, [bets]);

  return (
    <section>
      <PageHeader
        title="Analytics"
        subtitle="Comprendre précisément la performance de ta bankroll"
      />

      {error && (
        <div className="app-alert">{error}</div>
      )}

      <div className="kpi-grid analytics-kpis">
        <KpiCard
          label="Bankroll actuelle"
          value={euros(
            analytics.currentBankroll
          )}
          detail={`Capital initial : ${euros(
            INITIAL_BANKROLL
          )}`}
        />

        <KpiCard
          label="Profit net"
          value={signedEuros(
            analytics.totalProfit
          )}
          detail={`${analytics.settledCount} pari(s) clôturé(s)`}
        />

        <KpiCard
          label="ROI"
          value={percent(analytics.roi)}
          detail={`Mises clôturées : ${euros(
            analytics.totalStaked
          )}`}
        />

        <KpiCard
          label="Win rate"
          value={percent(analytics.winRate)}
          detail={`${analytics.winsCount} gagné(s) · ${analytics.lossesCount} perdu(s)`}
        />

        <KpiCard
          label="Mise moyenne"
          value={euros(
            analytics.averageStake
          )}
          detail="Moyenne des paris clôturés"
        />
      </div>

      <div className="analytics-layout">
        <article className="card analytics-main-card">
          <div className="analytics-card-header">
            <div>
              <h2>Évolution de la bankroll</h2>
              <p>
                Capital initial et résultats cumulés
                après chaque pari clôturé.
              </p>
            </div>

            <strong
              className={
                analytics.totalProfit >= 0
                  ? "analytics-positive"
                  : "analytics-negative"
              }
            >
              {signedEuros(
                analytics.totalProfit
              )}
            </strong>
          </div>

          {loading ? (
            <div className="analytics-empty">
              Chargement…
            </div>
          ) : analytics.bankrollPoints.length ? (
            <BankrollChart
              points={analytics.bankrollPoints}
            />
          ) : (
            <div className="analytics-empty">
              Clôture plusieurs paris pour afficher
              la courbe de bankroll.
            </div>
          )}
        </article>

        <article className="card">
          <div className="analytics-card-header">
            <div>
              <h2>Performance par bookmaker</h2>
              <p>
                Profit et ROI selon la plateforme
                utilisée.
              </p>
            </div>
          </div>

          <PerformanceList
            groups={analytics.bookmakers}
            loading={loading}
          />
        </article>
      </div>

      <div className="analytics-secondary-grid">
        <article className="card">
          <div className="analytics-card-header">
            <div>
              <h2>Performance par marché</h2>
              <p>
                Identifier les types de paris les plus
                rentables.
              </p>
            </div>
          </div>

          <PerformanceTable
            groups={analytics.markets}
            loading={loading}
          />
        </article>

        <article className="card">
          <div className="analytics-card-header">
            <div>
              <h2>Performance par cote</h2>
              <p>
                Mesurer le rendement selon la plage
                de cotes.
              </p>
            </div>
          </div>

          <PerformanceTable
            groups={analytics.oddsRanges}
            loading={loading}
          />
        </article>
      </div>

      <article className="card analytics-assistant-card">
        <div className="analytics-card-header">
          <div>
            <span className="analytics-assistant-label">
              Analyse automatique
            </span>

            <h2>Assistant BetLab</h2>

            <p>
              Synthèse factuelle de tes performances
              actuelles.
            </p>
          </div>

          <div className="analytics-reliability">
            <span>Fiabilité</span>
            <strong>
              {analytics.reliabilityLabel}
            </strong>
            <small>
              {analytics.reliabilityDetail}
            </small>
          </div>
        </div>

        <AnalyticsInsights analytics={analytics} />
      </article>
    </section>
  );
}

function PerformanceList({
  groups,
  loading,
}: {
  groups: PerformanceGroup[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="analytics-empty">
        Chargement…
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="analytics-empty">
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div className="bookmaker-list">
      {groups.map((group) => (
        <div
          className="bookmaker-row"
          key={group.name}
        >
          <div>
            <strong>{group.name}</strong>

            <small>
              {group.bets} pari(s) ·{" "}
              {euros(group.stake)} misés
            </small>
          </div>

          <div className="bookmaker-values">
            <strong
              className={
                group.profit >= 0
                  ? "analytics-positive"
                  : "analytics-negative"
              }
            >
              {signedEuros(group.profit)}
            </strong>

            <small>
              ROI {percent(group.roi)}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

function PerformanceTable({
  groups,
  loading,
}: {
  groups: PerformanceGroup[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="analytics-empty analytics-empty-small">
        Chargement…
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="analytics-empty analytics-empty-small">
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Segment</th>
            <th>Paris</th>
            <th>Mises</th>
            <th>Profit</th>
            <th>ROI</th>
          </tr>
        </thead>

        <tbody>
          {groups.map((group) => (
            <tr key={group.name}>
              <td>
                <strong>{group.name}</strong>
              </td>

              <td>{group.bets}</td>

              <td>{euros(group.stake)}</td>

              <td
                className={
                  group.profit >= 0
                    ? "analytics-positive"
                    : "analytics-negative"
                }
              >
                {signedEuros(group.profit)}
              </td>

              <td>{percent(group.roi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsInsights({
  analytics,
}: {
  analytics: {
    settledCount: number;
    totalProfit: number;
    roi: number;
    winRate: number;
    bestBookmaker: PerformanceGroup | null;
    worstBookmaker: PerformanceGroup | null;
    bestMarket: PerformanceGroup | null;
    worstMarket: PerformanceGroup | null;
    bestOddsRange: PerformanceGroup | null;
  };
}) {
  if (analytics.settledCount === 0) {
    return (
      <div className="analytics-insights-empty">
        Clôture plusieurs paris pour permettre à
        BetLab de générer une première analyse.
      </div>
    );
  }

  return (
    <div className="analytics-insights">
      <Insight
        title="Performance globale"
        text={
          analytics.totalProfit > 0
            ? `Ta bankroll progresse de ${signedEuros(
                analytics.totalProfit
              )}, avec un ROI de ${percent(
                analytics.roi
              )}.`
            : analytics.totalProfit < 0
              ? `Ta bankroll recule de ${signedEuros(
                  analytics.totalProfit
                )}, avec un ROI de ${percent(
                  analytics.roi
                )}.`
              : "Ta bankroll est actuellement à l’équilibre."
        }
      />

      <Insight
        title="Taux de réussite"
        text={`Ton win rate actuel est de ${percent(
          analytics.winRate
        )}. Ce chiffre doit toujours être interprété avec les cotes moyennes et le ROI.`}
      />

      {analytics.bestBookmaker && (
        <Insight
          title="Bookmaker le plus performant"
          text={`${analytics.bestBookmaker.name} affiche actuellement ${signedEuros(
            analytics.bestBookmaker.profit
          )} de résultat et un ROI de ${percent(
            analytics.bestBookmaker.roi
          )}.`}
        />
      )}

      {analytics.worstBookmaker &&
        analytics.worstBookmaker.profit < 0 && (
          <Insight
            title="Point de vigilance bookmaker"
            text={`${analytics.worstBookmaker.name} présente actuellement un résultat de ${signedEuros(
              analytics.worstBookmaker.profit
            )}.`}
          />
        )}

      {analytics.bestMarket && (
        <Insight
          title="Marché le plus performant"
          text={`${analytics.bestMarket.name} est actuellement ton meilleur marché avec ${signedEuros(
            analytics.bestMarket.profit
          )} de résultat.`}
        />
      )}

      {analytics.worstMarket &&
        analytics.worstMarket.profit < 0 && (
          <Insight
            title="Marché à surveiller"
            text={`${analytics.worstMarket.name} affiche actuellement ${signedEuros(
              analytics.worstMarket.profit
            )}. Vérifie la qualité des sélections avant d’augmenter les mises.`}
          />
        )}

      {analytics.bestOddsRange && (
        <Insight
          title="Plage de cotes"
          text={`La plage ${analytics.bestOddsRange.name} présente actuellement le meilleur ROI : ${percent(
            analytics.bestOddsRange.roi
          )}.`}
        />
      )}

      {analytics.settledCount < 20 && (
        <Insight
          title="Prudence statistique"
          text={`L’échantillon ne contient que ${analytics.settledCount} paris clôturés. Les tendances restent provisoires et ne doivent pas encore guider seules tes décisions.`}
        />
      )}
    </div>
  );
}

function Insight({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="analytics-insight-item">
      <span />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function BankrollChart({
  points,
}: {
  points: BankrollPoint[];
}) {
  const values = [
    INITIAL_BANKROLL,
    ...points.map((point) => point.bankroll),
  ];

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);

  const width = 900;
  const height = 280;
  const paddingX = 30;
  const paddingY = 30;

  const chartPoints = values.map(
    (value, index) => {
      const x =
        paddingX +
        (index /
          Math.max(values.length - 1, 1)) *
          (width - paddingX * 2);

      const y =
        paddingY +
        ((maximum - value) / range) *
          (height - paddingY * 2);

      return { x, y, value };
    }
  );

  const polyline = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const area =
    `${paddingX},${height - paddingY} ` +
    `${polyline} ` +
    `${width - paddingX},${height - paddingY}`;

  const referenceY =
    paddingY +
    ((maximum - INITIAL_BANKROLL) / range) *
      (height - paddingY * 2);

  return (
    <div className="bankroll-chart">
      <div className="bankroll-scale">
        <span>{euros(maximum)}</span>
        <span>{euros(minimum)}</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Évolution de la bankroll"
      >
        <defs>
          <linearGradient
            id="bankroll-area"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#49d6a5"
              stopOpacity="0.28"
            />

            <stop
              offset="100%"
              stopColor="#49d6a5"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <line
          x1={paddingX}
          y1={paddingY}
          x2={paddingX}
          y2={height - paddingY}
          className="chart-axis"
        />

        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          className="chart-axis"
        />

        <line
          x1={paddingX}
          y1={referenceY}
          x2={width - paddingX}
          y2={referenceY}
          className="chart-reference"
        />

        <polygon
          points={area}
          className="chart-area"
        />

        <polyline
          points={polyline}
          className="chart-line"
        />

        {chartPoints.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={
              index === chartPoints.length - 1
                ? 6
                : 4
            }
            className="chart-point"
          />
        ))}
      </svg>

      <div className="bankroll-chart-footer">
        <span>Départ</span>

        <span>
          {points.at(-1)?.label ?? "Aujourd’hui"}
        </span>
      </div>
    </div>
  );
}
