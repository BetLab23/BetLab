"use client";

type StarRatingProps = {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
};

export function StarRating({
  value,
  onChange,
  disabled = false,
  label = "Niveau de confiance",
}: StarRatingProps) {
  return (
    <div className="star-rating-field">
      <div className="star-rating-header">
        <span>{label}</span>

        <strong>
          {value ? `${value} / 5` : "Non renseigné"}
        </strong>
      </div>

      <div
        className="star-rating"
        role="radiogroup"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = value !== null && star <= value;

          return (
            <button
              key={star}
              type="button"
              className={`star-button ${active ? "active" : ""}`}
              onClick={() => onChange(star)}
              disabled={disabled}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
            >
              ★
            </button>
          );
        })}
      </div>

      <small className="star-rating-help">
        {confidenceDescription(value)}
      </small>
    </div>
  );
}

function confidenceDescription(value: number | null) {
  if (value === 1) return "Pari spéculatif ou très incertain.";
  if (value === 2) return "Confiance faible, plusieurs inconnues.";
  if (value === 3) return "Confiance moyenne, pari équilibré.";
  if (value === 4) return "Forte conviction, peu de réserves.";
  if (value === 5) return "Conviction maximale.";

  return "Évalue ta conviction avant de valider le pari.";
}
