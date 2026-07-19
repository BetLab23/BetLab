import Link from "next/link";
import { BetLabBrand } from "./BetLabBrand";

export function BetLabHeader() {
  return (
    <header className="betlab-header">
      <Link href="/" aria-label="Accueil BetLab">
        <BetLabBrand />
      </Link>

      <nav aria-label="Navigation principale">
        <Link
          className="betlab-nav-link"
          href="/bets"
        >
          Paris
        </Link>
      </nav>
    </header>
  );
}
