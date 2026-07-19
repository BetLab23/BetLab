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
      <aside className="sidebar">
        <Link
          href="/dashboard"
          className="brand"
          aria-label="Accueil BetLab"
        >
          <Image
            src="/betlab-logo.png"
            alt="Logo BetLab"
            width={46}
            height={46}
            priority
            className="brand-logo"
          />

          <span className="brand-name">
            <span className="brand-bet">BET</span>
            <b className="brand-lab">LAB</b>
          </span>

          <small>CORE 0.3.1</small>
        </Link>

        <nav aria-label="Navigation principale">
          {items.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <SupabaseStatus />
      </aside>

      <main className="main">{children}</main>

      <nav
        className="mobile-nav"
        aria-label="Navigation mobile"
      >
        {items.slice(0, 5).map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
          >
            <Icon size={20} />
            <span>
              {label === "Match Center" ? "Matchs" : label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
