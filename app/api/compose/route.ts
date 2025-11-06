import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Parse JSON body
    const { transcript, prePrompt } = await req.json();

    // Validate transcript
    if (
      !transcript ||
      typeof transcript !== "string" ||
      transcript.trim() === ""
    ) {
      return new Response(JSON.stringify({ error: "Missing transcript" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
      `Pre prompt: ${prePrompt ? String(prePrompt) : "None"}`,
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
      return new Response(JSON.stringify({ error: raw }), {
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
    const message =
      err instanceof Error ? err.message : "Unexpected server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
