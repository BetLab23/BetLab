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

type BankrollPoint = {
  label: string;
  bankroll: number;
  profit: number;
};

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

    const bookmakerMap = new Map<
      string,
      {
        bets: number;
        stake: number;
        profit: number;
      }
    >();

    settled.forEach((bet) => {
      const bookmaker =
        bet.bookmaker?.trim() || "Non renseigné";

      const current = bookmakerMap.get(
        bookmaker
      ) ?? {
        bets: 0,
        stake: 0,
        profit: 0,
      };

      current.bets += 1;
      current.stake += Number(bet.stake);
      current.profit += Number(
        bet.profit_loss ?? 0
      );

      bookmakerMap.set(bookmaker, current);
    });

    const bookmakers = Array.from(
      bookmakerMap.entries()
    )
      .map(([name, data]) => ({
        name,
        ...data,
        roi:
          data.stake > 0
            ? (data.profit / data.stake) * 100
            : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    return {
      settledCount: settled.length,
      totalProfit,
      totalStaked,
      roi,
      winRate,
      averageStake,
      currentBankroll:
        INITIAL_BANKROLL + totalProfit,
      bankrollPoints,
      bookmakers,
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
          detail="Paris gagnés parmi les paris décisifs"
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

          {loading ? (
            <div className="analytics-empty">
              Chargement…
            </div>
          ) : analytics.bookmakers.length ? (
            <div className="bookmaker-list">
              {analytics.bookmakers.map(
                (bookmaker) => (
                  <div
                    className="bookmaker-row"
                    key={bookmaker.name}
                  >
                    <div>
                      <strong>
                        {bookmaker.name}
                      </strong>

                      <small>
                        {bookmaker.bets} pari(s) ·{" "}
                        {euros(bookmaker.stake)} misés
                      </small>
                    </div>

                    <div className="bookmaker-values">
                      <strong
                        className={
                          bookmaker.profit >= 0
                            ? "analytics-positive"
                            : "analytics-negative"
                        }
                      >
                        {signedEuros(
                          bookmaker.profit
                        )}
                      </strong>

                      <small>
                        ROI {percent(bookmaker.roi)}
                      </small>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="analytics-empty">
              Aucune donnée disponible.
            </div>
          )}
        </article>
      </div>
    </section>
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
          y1={
            paddingY +
            ((maximum - INITIAL_BANKROLL) /
              range) *
              (height - paddingY * 2)
          }
          x2={width - paddingX}
          y2={
            paddingY +
            ((maximum - INITIAL_BANKROLL) /
              range) *
              (height - paddingY * 2)
          }
          className="chart-reference"
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
            r={index === chartPoints.length - 1 ? 6 : 4}
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
