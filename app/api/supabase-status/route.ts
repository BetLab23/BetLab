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

  return { url, key };
}

export async function GET() {
  const { url, key } = readSupabaseConfig();

  if (!url || !key) {
    return NextResponse.json(
      {
        status: "missing",
        missing: {
          url: !url,
          key: !key,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", code: response.status },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        },
      );
    }

    return NextResponse.json(
      { status: "connected" },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch {
    return NextResponse.json(
      { status: "error" },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
