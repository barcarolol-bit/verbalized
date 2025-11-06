# Verbalized

A minimal browser-based voice-to-text and text-enhancement tool that transcribes audio and refines it using AI.

## Overview

Verbalized allows users to record their voice, automatically transcribe the audio using **OpenAI Whisper API**, and then refine the transcript using **Ollama Cloud**. The product emphasizes speed, minimalism, and privacy - no login, database, or persistent storage.

## Features

### Core Features

- **Voice Recording**: Browser-based audio capture using MediaRecorder API
- **Audio Transcription**: Fast, accurate transcription using OpenAI Whisper API
- **Text Refinement**: AI-powered text enhancement using Ollama Cloud (gpt-oss:120b-cloud)
- **Pre-prompt Support**: Custom context for AI refinement
- **Two-Step Workflow**: Transcribe first, then compose separately for better control
- **Privacy-Focused**: No login, no database, audio files deleted after processing

### New Enhanced Features ✨

- **Real-Time Streaming**: Watch AI generate text as you compose (no more waiting!)
- **Toast Notifications**: Beautiful, non-intrusive feedback using Sonner
- **Recording Timer**: Live timer showing recording duration (mm:ss format)
- **Auto-Save**: Drafts automatically saved to localStorage (never lose your work)
- **Editable Output**: Edit AI-generated text before exporting
- **Export Options**: Download as TXT or Markdown files
- **Keyboard Shortcuts**: `⌘K` to record, `⌘⇧K` to stop, `⌘↵` to transcribe
- **Mobile Optimized**: Responsive design with touch-friendly controls
- **Visual Feedback**: Animated indicators and progress updates
- **Clear Data**: One-click reset for starting fresh

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS v4
- **UI Components**: Sonner (toast notifications)
- **Transcription**: OpenAI Whisper API (whisper-1 model)
- **Composition**: Ollama Cloud API with streaming (gpt-oss:120b-cloud)
- **Storage**: Browser localStorage for draft persistence

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- OpenAI API key (for Whisper transcription)
- Ollama Cloud API key (for text composition)
- Modern browser with MediaRecorder support (Chrome, Edge, Firefox)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   cd verbalized
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.local.example .env.local
   ```

   Then edit `.env.local` and add your API keys:

   ```env
   OPENAI_API_KEY=sk-your-openai-key-here
   OLLAMA_API_KEY=your-ollama-key-here
   OLLAMA_BASE_URL=https://ollama.com/api
   OLLAMA_MODEL=gpt-oss:120b-cloud
   NEXT_PUBLIC_MAX_DURATION_SECONDS=180
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

| Variable                           | Description                                          | Default                  |
| ---------------------------------- | ---------------------------------------------------- | ------------------------ |
| `OPENAI_API_KEY`                   | Your OpenAI API key (required for transcription)     | -                        |
| `OLLAMA_API_KEY`                   | Your Ollama Cloud API key (required for composition) | -                        |
| `OLLAMA_BASE_URL`                  | Ollama Cloud API base URL                            | `https://ollama.com/api` |
| `OLLAMA_MODEL`                     | Ollama model to use for composition                  | `gpt-oss:120b-cloud`     |
| `NEXT_PUBLIC_MAX_DURATION_SECONDS` | Maximum recording duration in seconds                | 180                      |

## Project Structure

```
verbalized/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Main UI: recorder, two-step workflow
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Global styles
│   ├── api/
│   │   ├── transcribe/        # OpenAI Whisper API transcription
│   │   ├── compose/           # Ollama Cloud composition
│   │   └── health/            # Health check endpoints
│   └── favicon.ico
├── lib/
│   └── config.ts              # Centralized configuration
├── public/
│   └── samples/               # Sample audio instructions
├── scripts/
│   └── health-check.js        # Health check utility
├── .env.local.example         # Environment variables template
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run check:health` - Verify API health endpoints

## Testing

### Prerequisites

- **Node.js 20+** installed
- **Modern browser** with MediaRecorder support (Chrome, Edge, Firefox)
- **OpenAI API key** (get from [https://platform.openai.com](https://platform.openai.com))
- **Ollama Cloud API key** (get from [https://ollama.com](https://ollama.com))

### Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your API keys:

   ```env
   OPENAI_API_KEY=sk-your-openai-key-here
   OLLAMA_API_KEY=your-ollama-key-here
   OLLAMA_BASE_URL=https://ollama.com/api
   OLLAMA_MODEL=gpt-oss:120b-cloud
   NEXT_PUBLIC_MAX_DURATION_SECONDS=180
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000

4. **Run health checks**:

   ```bash
   npm run check:health
   ```

   Expected output:

   ```
   ✅ PASS: Transcribe (OpenAI Whisper)
      {"ok":true,"mode":"openai-whisper-api"}

   ✅ PASS: Compose (Ollama Cloud)
      {"ok":true,"provider":"ollama-cloud","model":"gpt-oss:120b-cloud","baseUrl":"https://ollama.com/api"}
   ```

### Manual Test Steps

#### Test 1: Basic Recording and Playback

1. Navigate to http://localhost:3000
2. Click **"Start Recording"**
   - Status should show: "Recording"
   - Stop button becomes enabled, Start becomes disabled
3. Speak for 5 seconds (e.g., "Hello, this is a test recording")
4. Click **"Stop Recording"**
   - Status returns to "Idle"
   - Audio preview appears below buttons
5. Click play on the audio preview
   - **Expected**: Your recording plays back

#### Test 2: Transcription (Step 1)

1. With a recording ready, click **"✨ Transcribe Audio"**
   - Status progresses: "Uploading audio" → "Transcribing" → "Done"
   - Takes 2-5 seconds via OpenAI Whisper API
2. **Expected Results**:
   - "Transcript" section appears with transcribed text
   - Audio preview remains visible
   - Step 2 section appears for composition

#### Test 3: Composition (Step 2)

1. After transcription completes, optionally enter a **"Pre-prompt"**:
   ```
   Format as bullet points
   ```
2. Click **"🚀 Compose Final Text"**
   - Status shows: "Composing" → "Done"
3. **Expected Results**:
   - "Final Text" section appears with refined output
   - Copy button available to copy result
   - Can edit pre-prompt and re-compose without re-transcribing

#### Test 4: Microphone Permission Denied

1. In browser settings, **block microphone** for localhost:3000
2. Refresh the page
3. Click **"Start Recording"**
   - **Expected**: Red error: "Microphone permission denied"
   - **Expected**: Status: "Error"
   - **Expected**: App remains functional (no crashes)

#### Test 4: Missing API Keys

1. To test missing OpenAI key: Remove `OPENAI_API_KEY` from `.env.local`
   - **Expected**: Transcription fails with "Missing OPENAI_API_KEY" error
2. To test missing Ollama key: Remove `OLLAMA_API_KEY` from `.env.local`
   - **Expected**: Transcription works, but composition fails with error message
3. Run `npm run check:health` to verify health endpoint detection

#### Test 5: State Refresh

1. Complete a full transcribe and compose cycle
2. Refresh the browser page
   - **Expected**: Audio preview clears
   - **Expected**: Transcript clears
   - **Expected**: Final text clears
   - **Confirm**: No persistent storage (as designed)

### Expected Results

**On Success**:

- ✅ Recording works and plays back
- ✅ Transcription produces text via OpenAI Whisper API (fast and accurate)
- ✅ Composition refines text via Ollama Cloud
- ✅ Two-step workflow: transcribe first, then compose
- ✅ Status messages update clearly
- ✅ Errors display inline with helpful messages

**Common Errors and Remedies**

| Error                                        | Cause                         | Solution                                           |
| -------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| "Recording is not supported in this browser" | Browser lacks MediaRecorder   | Use Chrome, Edge, or Firefox                       |
| "Microphone permission denied"               | Permission blocked            | Allow microphone in browser settings               |
| "Missing OPENAI_API_KEY"                     | API key not configured        | Add OpenAI key to `.env.local`                     |
| "insufficient_quota"                         | OpenAI account has no credits | Add credits at platform.openai.com/account/billing |
| "Missing OLLAMA_API_KEY"                     | API key not configured        | Add Ollama key to `.env.local`                     |
| "File too large. Max 25 MB."                 | Recording exceeds limit       | Reduce recording duration                          |
| Compose fails                                | Invalid Ollama credentials    | Verify OLLAMA_API_KEY and BASE_URL                 |

### Performance Notes

**Transcription**:

- Uses OpenAI Whisper API (whisper-1 model)
- Processing time: 2-5 seconds for typical recordings
- Cost: ~$0.006 per minute of audio
- Supports multiple audio formats (WebM, MP3, MP4, WAV, etc.)

**Composition**:

- Uses Ollama Cloud (gpt-oss:120b-cloud model)
- Processing time: 2-5 seconds
- Can re-compose with different pre-prompts without re-transcribing

## Development Philosophy

- Start from the simplest possible working version
- Improve iteratively
- Keep code readable, minimal, and modular
- Follow a strict step-by-step gated process

## License

Private project - All rights reserved
