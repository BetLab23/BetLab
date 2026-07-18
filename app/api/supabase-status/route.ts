import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";

  return { url: url.replace(/\/$/, ""), key };
}

function json(body: unknown) {
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET() {
  const { url, key } = readSupabaseConfig();

  if (!url || !key) {
    return json({
      status: "missing",
      missing: { url: !url, key: !key },
    });
  }

  try {
    // GoTrue exposes a dedicated health endpoint. Unlike /rest/v1/, this
    // endpoint does not depend on any database table, schema or RLS policy.
    const response = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return json({ status: "error", code: response.status });
    }

    return json({ status: "connected" });
  } catch {
    return json({ status: "error" });
  }
}
