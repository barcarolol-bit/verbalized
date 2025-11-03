import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// File size limit: 25 MB
const MAX_BYTES = 25 * 1024 * 1024;

// Allowed audio MIME types for transcription
const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
]);

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const language = form.get("language") as string | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max 25 MB.` },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfiguration. Missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    // Convert file to Blob for FormData submission
    const inputArrayBuffer = await file.arrayBuffer();
    const inputBlob = new Blob([inputArrayBuffer], { type: file.type });

    // Build FormData payload for OpenAI Whisper API
    const fd = new FormData();
    fd.append("model", "whisper-1");
    fd.append("file", inputBlob, file.name || "audio.webm");
    // Optional language parameter for improved accuracy
    if (language) fd.append("language", language);

    // Call OpenAI Audio Transcriptions API
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    // Handle API errors
    if (!resp.ok) {
      const raw = await resp.text();
      return NextResponse.json({ error: raw }, { status: 500 });
    }

    // Parse and return transcript
    const data = await resp.json();
    const transcript = data?.text ?? "";
    return NextResponse.json({ transcript });
  } catch (err: unknown) {
    // Generic error handler
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
