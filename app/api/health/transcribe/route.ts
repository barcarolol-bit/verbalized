import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "Missing OPENAI_API_KEY"
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "openai-whisper-api"
  });
}

