import { NextResponse } from "next/server";
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "@/lib/config";

export async function GET() {
  const apiKey = process.env.OLLAMA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "Missing OLLAMA_API_KEY"
    });
  }

  return NextResponse.json({
    ok: true,
    provider: "ollama-cloud",
    model: OLLAMA_MODEL,
    baseUrl: OLLAMA_BASE_URL
  });
}


