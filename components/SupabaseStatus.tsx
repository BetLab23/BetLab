"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "connected" | "missing" | "error";
type StatusPayload = {
  status?: Status;
  missing?: {
    url?: boolean;
    key?: boolean;
  };
};

export function SupabaseStatus() {
  const [payload, setPayload] = useState<StatusPayload>({ status: "checking" });

  useEffect(() => {
    let active = true;

    fetch(`/api/supabase-status?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as StatusPayload;
        if (active) setPayload(data);
      })
      .catch(() => {
        if (active) setPayload({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, []);

  const status = payload.status ?? "error";

  let title = "Supabase indisponible";
  let detail = "Vérifier les clés ou le projet";

  if (status === "checking") {
    title = "Vérification";
    detail = "Connexion Supabase en cours";
  } else if (status === "connected") {
    title = "Supabase connecté";
    detail = "Infrastructure distante disponible";
  } else if (status === "missing") {
    title = "Configuration incomplète";

    if (payload.missing?.url && payload.missing?.key) {
      detail = "URL et clé Supabase non détectées";
    } else if (payload.missing?.url) {
      detail = "URL Supabase non détectée";
    } else if (payload.missing?.key) {
      detail = "Clé Supabase non détectée";
    } else {
      detail = "Variables Supabase non détectées";
    }
  }

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
