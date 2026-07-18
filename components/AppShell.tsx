"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Target, ChartNoAxesCombined,
  WalletCards, Settings, FlaskConical
} from "lucide-react";
import { SupabaseStatus } from "./SupabaseStatus";

const items = [
  ["/dashboard","Dashboard",LayoutDashboard],
  ["/matches","Match Center",CalendarDays],
  ["/bets","Paris",Target],
  ["/analytics","Analytics",ChartNoAxesCombined],
  ["/bankroll","Bankroll",WalletCards],
  ["/settings","Paramètres",Settings],
] as const;

export function AppShell({children}:{children:React.ReactNode}){
  const pathname = usePathname();
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><FlaskConical size={24}/><span>BET<b>LAB</b></span><small>CORE 0.2.1</small></div>
      <nav>{items.map(([href,label,Icon])=>
        <Link key={href} href={href} className={pathname===href?"nav-link active":"nav-link"}>
          <Icon size={19}/><span>{label}</span>
        </Link>)}
      </nav>
      <SupabaseStatus />
    </aside>
    <main className="main">{children}</main>
    <nav className="mobile-nav">{items.slice(0,5).map(([href,label,Icon])=>
      <Link key={href} href={href} className={pathname===href?"active":""}>
        <Icon size={20}/><span>{label==="Match Center"?"Matchs":label}</span>
      </Link>)}
    </nav>
  </div>
}
