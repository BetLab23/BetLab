import Image from "next/image";

type BetLabBrandProps = {
  compact?: boolean;
  className?: string;
};

export function BetLabBrand({
  compact = false,
  className = "",
}: BetLabBrandProps) {
  return (
    <div
      className={`betlab-brand ${compact ? "compact" : ""} ${className}`}
      aria-label="BetLab"
    >
      <Image
        src="/betlab-logo.svg"
        alt=""
        width={compact ? 42 : 54}
        height={compact ? 42 : 54}
        priority
      />

      <div className="betlab-brand-copy">
        <strong>
          <span className="betlab-gold">BET</span>
          <span className="betlab-emerald">LAB</span>
        </strong>
        <small>VN23</small>
      </div>
    </div>
  );
}
