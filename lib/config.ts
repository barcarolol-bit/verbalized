// Validate environment variables
function validateEnvVar(name: string, value: string | undefined, required: boolean = false): string | undefined {
  if (required && !value) {
    console.warn(`Warning: Required environment variable ${name} is not set`);
  }
  return value;
}

// Client-side environment variables (safe to expose)
export const MAX_DURATION_SEC = Number(
  process.env.NEXT_PUBLIC_MAX_DURATION_SECONDS || 180
);

// Validate MAX_DURATION_SEC is reasonable
if (MAX_DURATION_SEC < 10 || MAX_DURATION_SEC > 600) {
  console.warn('MAX_DURATION_SEC should be between 10 and 600 seconds');
}

// Server-side only environment variables (never exposed to client)
export const OLLAMA_BASE_URL = validateEnvVar(
  'OLLAMA_BASE_URL',
  process.env.OLLAMA_BASE_URL
) || "https://ollama.com/api";

export const OLLAMA_MODEL = validateEnvVar(
  'OLLAMA_MODEL',
  process.env.OLLAMA_MODEL
) || "gpt-oss:120b-cloud";

// Validate API keys are set (server-side only)
if (typeof window === 'undefined') {
  validateEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY, true);
  validateEnvVar('OLLAMA_API_KEY', process.env.OLLAMA_API_KEY, true);
}

