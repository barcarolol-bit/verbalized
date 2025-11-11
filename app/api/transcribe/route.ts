import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// File size limit: 25 MB
const MAX_BYTES = 25 * 1024 * 1024;

// Maximum form data size
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '26mb',
    },
  },
};

// Allowed audio MIME types for transcription
const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
]);

// Sanitize error messages to prevent information leakage
function sanitizeError(error: string): string {
  // Remove sensitive information from error messages
  const sanitized = error
    .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]') // Remove API keys
    .replace(/Bearer\s+[^\s]+/g, 'Bearer [REDACTED]') // Remove Bearer tokens
    .replace(/https?:\/\/[^\s]+/g, '[URL]'); // Remove URLs
  
  // Limit error message length
  return sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized;
}

export async function POST(req: NextRequest) {
  try {
    // Check Content-Type header
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: "Invalid content type. Expected multipart/form-data." },
        { status: 400 }
      );
    }

    // Parse multipart form data with size limit
    let form;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Failed to parse form data. File may be too large." },
        { status: 400 }
      );
    }

    const file = form.get("file") as File | null;
    const language = form.get("language") as string | null;

    // Validate language parameter if provided
    if (language && typeof language === 'string') {
      // ISO 639-1 language codes are 2 characters
      if (language.length > 10 || !/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) {
        return NextResponse.json(
          { error: "Invalid language code format" },
          { status: 400 }
        );
      }
    }

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
      const sanitized = sanitizeError(raw);
      console.error('OpenAI API error:', raw); // Log full error server-side
      return NextResponse.json({ error: sanitized }, { status: 500 });
    }

    // Parse and return transcript
    const data = await resp.json();
    const transcript = data?.text ?? "";
    return NextResponse.json({ transcript });
  } catch (err: unknown) {
    // Generic error handler
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    const sanitized = sanitizeError(errorMessage);
    console.error('Transcription error:', err); // Log full error server-side
    return NextResponse.json(
      { error: sanitized },
      { status: 500 }
    );
  }
}
