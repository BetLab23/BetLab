"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "connected" | "missing" | "error";

export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;

    fetch("/api/supabase-status", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { status?: Status };
        if (active) setStatus(payload.status ?? "error");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const content = {
    checking: ["Vérification", "Connexion Supabase en cours"],
    connected: ["Supabase connecté", "Infrastructure distante disponible"],
    missing: ["Configuration incomplète", "Variables Supabase manquantes"],
    error: ["Supabase indisponible", "Vérifier les clés ou le projet"],
  } as const;

  const [title, detail] = content[status];

  return (
    <div className={`sync-card sync-${status}`} title={detail}>
      <span className="sync-dot" />
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
