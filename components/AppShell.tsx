"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  ChartNoAxesCombined,
  WalletCards,
  Settings,
} from "lucide-react";
import { SupabaseStatus } from "./SupabaseStatus";

const items = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/matches", "Match Center", CalendarDays],
  ["/bets", "Paris", Target],
  ["/analytics", "Analytics", ChartNoAxesCombined],
  ["/bankroll", "Bankroll", WalletCards],
  ["/settings", "Paramètres", Settings],
] as const;

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar betlab-sidebar">
        <Link href="/dashboard" className="betlab-brand" aria-label="Accueil BetLab">
          <Image
            src="/betlab-logo.png"
            alt="Logo BetLab"
            width={72}
            height={72}
            priority
            className="betlab-brand-logo"
          />

          <div className="betlab-brand-text">
            <span className="betlab-brand-name">
              <strong>BET</strong>
              <strong>LAB</strong>
            </span>
            <small>ANALYSE · STRATÉGIE</small>
          </div>
        </Link>

        <div className="betlab-divider" />

        <nav className="betlab-nav" aria-label="Navigation principale">
          {items.map(([href, label, Icon]) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(`${href}/`));

            return (
              <Link
                key={href}
                href={href}
                className={active ? "nav-link active" : "nav-link"}
              >
                <span className="betlab-nav-icon">
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="betlab-status">
          <SupabaseStatus />
        </div>
      </aside>

      <main className="main">{children}</main>

      <nav className="mobile-nav" aria-label="Navigation mobile">
        {items.slice(0, 5).map(([href, label, Icon]) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(`${href}/`));

          return (
            <Link key={href} href={href} className={active ? "active" : ""}>
              <Icon size={20} />
              <span>{label === "Match Center" ? "Matchs" : label}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx global>{`
        :root {
          --betlab-gold: #d4af37;
          --betlab-gold-light: #f2c94c;
          --betlab-green: #00b37a;
          --betlab-green-light: #43d9a3;
          --betlab-black: #030a0e;
          --betlab-panel: #07131b;
          --betlab-border: rgba(212, 175, 55, 0.2);
        }

        .betlab-sidebar {
          background:
            radial-gradient(
              circle at 50% 4%,
              rgba(212, 175, 55, 0.08),
              transparent 28%
            ),
            linear-gradient(180deg, #030a0e 0%, #02070b 100%);
          border-right: 1px solid rgba(212, 175, 55, 0.16);
          box-shadow: 18px 0 48px rgba(0, 0, 0, 0.22);
        }

        .betlab-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 108px;
          padding: 20px 18px 12px;
          text-decoration: none;
        }

        .betlab-brand-logo {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          object-fit: contain;
          border-radius: 15px;
          filter:
            drop-shadow(0 0 10px rgba(212, 175, 55, 0.18))
            drop-shadow(0 0 18px rgba(0, 179, 122, 0.08));
        }

        .betlab-brand-text {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 4px;
        }

        .betlab-brand-name {
          display: flex;
          align-items: baseline;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.03em;
          line-height: 1;
        }

        .betlab-brand-name strong:first-child {
          color: var(--betlab-gold-light);
        }

        .betlab-brand-name strong:last-child {
          color: var(--betlab-green-light);
        }

        .betlab-brand-text small {
          overflow: hidden;
          color: rgba(242, 201, 76, 0.62);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.14em;
          white-space: nowrap;
        }

        .betlab-divider {
          height: 1px;
          margin: 2px 18px 20px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(212, 175, 55, 0.38),
            rgba(0, 179, 122, 0.22),
            transparent
          );
        }

        .betlab-nav {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 0 14px;
        }

        .betlab-sidebar .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 48px;
          padding: 0 14px;
          overflow: hidden;
          border: 1px solid transparent;
          border-radius: 13px;
          color: #8fa2b8;
          text-decoration: none;
          transition:
            color 160ms ease,
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .betlab-sidebar .nav-link:hover {
          color: #dce8e4;
          border-color: rgba(0, 179, 122, 0.16);
          background: rgba(0, 179, 122, 0.055);
          transform: translateX(2px);
        }

        .betlab-sidebar .nav-link.active {
          color: #f8f8f3;
          border-color: rgba(212, 175, 55, 0.3);
          background:
            linear-gradient(
              90deg,
              rgba(212, 175, 55, 0.13),
              rgba(0, 179, 122, 0.08)
            );
          box-shadow:
            inset 3px 0 0 var(--betlab-gold),
            0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .betlab-nav-icon {
          display: grid;
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
          place-items: center;
          color: rgba(212, 175, 55, 0.76);
          transition: color 160ms ease;
        }

        .betlab-sidebar .nav-link:hover .betlab-nav-icon,
        .betlab-sidebar .nav-link.active .betlab-nav-icon {
          color: var(--betlab-green-light);
        }

        .betlab-status {
          margin-top: auto;
          padding: 18px 16px 20px;
        }

        .betlab-status > * {
          border-color: rgba(0, 179, 122, 0.22) !important;
          background: rgba(5, 20, 25, 0.82) !important;
          box-shadow: none !important;
        }

        @media (max-width: 900px) {
          .betlab-brand {
            justify-content: center;
            min-height: 82px;
            padding: 12px;
          }

          .betlab-brand-logo {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
          }

          .betlab-brand-text,
          .betlab-divider {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
