import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Maximum request size for composition
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// Sanitize error messages to prevent information leakage
function sanitizeError(error: string): string {
  const sanitized = error
    .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
    .replace(/Bearer\s+[^\s]+/g, 'Bearer [REDACTED]')
    .replace(/https?:\/\/[^\s]+/g, '[URL]');
  
  return sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized;
}

// Validate and sanitize transcript input
function validateTranscript(transcript: unknown): string {
  if (!transcript || typeof transcript !== "string") {
    throw new Error("Invalid transcript format");
  }

  const trimmed = transcript.trim();
  
  if (trimmed === "") {
    throw new Error("Transcript cannot be empty");
  }

  // Limit transcript length (100KB)
  if (trimmed.length > 100000) {
    throw new Error("Transcript too long. Maximum 100,000 characters.");
  }

  return trimmed;
}

// Validate and sanitize pre-prompt input
function validatePrePrompt(prePrompt: unknown): string | undefined {
  if (!prePrompt) {
    return undefined;
  }

  if (typeof prePrompt !== "string") {
    throw new Error("Invalid pre-prompt format");
  }

  const trimmed = prePrompt.trim();
  
  // Limit pre-prompt length
  if (trimmed.length > 5000) {
    throw new Error("Pre-prompt too long. Maximum 5,000 characters.");
  }

  return trimmed || undefined;
}

export async function POST(req: NextRequest) {
  try {
    // Check Content-Type header
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: "Invalid content type. Expected application/json." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate JSON body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate and sanitize inputs
    let transcript: string;
    let prePrompt: string | undefined;
    
    try {
      transcript = validateTranscript(body.transcript);
      prePrompt = validatePrePrompt(body.prePrompt);
    } catch (validationError) {
      const message = validationError instanceof Error 
        ? validationError.message 
        : "Invalid input";
      
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check for Ollama API key
    const apiKey = process.env.OLLAMA_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration. Missing OLLAMA_API_KEY.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Ollama configuration from environment
    const baseUrl = process.env.OLLAMA_BASE_URL || "https://ollama.com/api";
    const model = process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud";

    // Build system prompt for refined output
    const system =
      "You are a concise writing assistant. Produce clean, well structured text. Respect the user intent from the pre prompt. Remove filler. Fix obvious mistakes.";

    // Combine pre-prompt and transcript in user message
    const userMsg = [
      `Pre prompt: ${prePrompt || "None"}`,
      "Transcript:",
      transcript,
    ].join("\n\n");

    // Call Ollama Cloud API with streaming
    const resp = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        stream: true,
      }),
    });

    // Handle API errors
    if (!resp.ok) {
      const raw = await resp.text();
      const sanitized = sanitizeError(raw);
      console.error('Ollama API error:', raw); // Log full error server-side
      return new Response(JSON.stringify({ error: sanitized }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a TransformStream to process the streaming response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = resp.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                const content = json?.message?.content || "";

                if (content) {
                  // Send the content chunk to the client
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }

                // Check if this is the final message
                if (json.done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch (e) {
                // Skip invalid JSON lines
                console.error("Failed to parse line:", e);
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    const sanitized = sanitizeError(message);
    console.error('Composition error:', err); // Log full error server-side
    return new Response(JSON.stringify({ error: sanitized }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
