import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ status: "missing" }, { status: 503 });
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", code: response.status },
        { status: 502 },
      );
    }

    return NextResponse.json({ status: "connected" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 502 });
  }
}
