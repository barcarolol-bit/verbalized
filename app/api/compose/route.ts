import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Parse JSON body
    const { transcript, prePrompt } = await req.json();

    // Validate transcript
    if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    }

    // Check for Ollama API key
    const apiKey = process.env.OLLAMA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfiguration. Missing OLLAMA_API_KEY." },
        { status: 500 }
      );
    }

    // Get Ollama configuration from environment
    const baseUrl = process.env.OLLAMA_BASE_URL || "https://ollama.com/api";
    const model = process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud";

    // Build system prompt for refined output
    const system = "You are a concise writing assistant. Produce clean, well structured text. Respect the user intent from the pre prompt. Remove filler. Fix obvious mistakes.";

    // Combine pre-prompt and transcript in user message
    const userMsg = [
      `Pre prompt: ${prePrompt ? String(prePrompt) : "None"}`,
      "Transcript:",
      transcript
    ].join("\n\n");

    // Call Ollama Cloud API
    const resp = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg }
        ],
        stream: false
      })
    });

    // Handle API errors
    if (!resp.ok) {
      const raw = await resp.text();
      return NextResponse.json({ error: raw }, { status: 500 });
    }

    // Parse response and extract final text
    const data = await resp.json();
    const finalText = data?.message?.content ?? "";

    return NextResponse.json({ finalText });
  } catch (err: any) {
    // Generic error handler
    return NextResponse.json(
      { error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
