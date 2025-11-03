# Verbalized

A minimal browser-based voice-to-text and text-enhancement tool that transcribes audio locally and refines it using AI.

## Overview

Verbalized allows users to record their voice, automatically transcribe the audio using **local Whisper** (on-device processing), and then refine the transcript using **Ollama Cloud**. The product emphasizes speed, minimalism, and privacy - no login, database, or persistent storage.

## Features

- **Voice Recording**: Browser-based audio capture using MediaRecorder API
- **Audio Transcription**: Local Whisper processing (Xenova/whisper-tiny.en) - no external API calls
- **Text Refinement**: AI-powered text enhancement using Ollama Cloud (gpt-oss:120b-cloud)
- **Pre-prompt Support**: Custom context for AI refinement
- **Privacy-Focused**: No storage, no login, audio files deleted after processing
- **Semi-Offline**: Transcription runs locally; composition requires internet

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS v4
- **Transcription**: @xenova/transformers (local Whisper tiny model)
- **Composition**: Ollama Cloud API

## Getting Started

### Prerequisites

- Node.js 20+ and npm
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
   
   Then edit `.env.local` and add your Ollama API key:
   ```
   OLLAMA_API_KEY=your_ollama_api_key_here
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

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_API_KEY` | Your Ollama Cloud API key (required for composition) | - |
| `OLLAMA_BASE_URL` | Ollama Cloud API base URL | `https://ollama.com/api` |
| `OLLAMA_MODEL` | Ollama model to use for composition | `gpt-oss:120b-cloud` |
| `NEXT_PUBLIC_MAX_DURATION_SECONDS` | Maximum recording duration in seconds | 180 |

## Project Structure

```
verbalized/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Main UI: recorder, states, handlers
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Global styles
│   ├── api/
│   │   ├── transcribe/        # Local Whisper transcription
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

## Local Semi-Offline Testing

### Prerequisites

- **Node.js 20+** installed
- **Modern browser** with MediaRecorder support (Chrome, Edge, Firefox)
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
   
   Edit `.env.local` and add your Ollama API key:
   ```env
   OLLAMA_API_KEY=your_actual_key_here
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
   ✅ PASS: Transcribe (Local Whisper)
      {"ok":true,"mode":"local-whisper"}
   
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

#### Test 2: Transcription (Local Whisper)
1. With a recording ready, click **"Transcribe and Compose"**
   - Status progresses: "Uploading audio" → "Transcribing" → "Composing" → "Done"
   - **First run**: Model downloads (~50MB), may take 30-60 seconds
   - **Subsequent runs**: Uses cached model, much faster
2. **Expected Results**:
   - "Transcript" section appears with transcribed text
   - "Final Text" section appears with refined output
   - Audio preview remains visible

#### Test 3: Pre-prompt and Composition
1. Record a new audio clip
2. Enter text in **"Pre-prompt"** field:
   ```
   Format as bullet points
   ```
3. Click **"Transcribe and Compose"**
   - **Expected**: Final text respects the pre-prompt formatting

#### Test 4: Microphone Permission Denied
1. In browser settings, **block microphone** for localhost:3000
2. Refresh the page
3. Click **"Start Recording"**
   - **Expected**: Red error: "Microphone permission denied"
   - **Expected**: Status: "Error"
   - **Expected**: App remains functional (no crashes)

#### Test 5: Missing Ollama API Key
1. Remove `OLLAMA_API_KEY` from `.env.local`
2. Restart dev server
3. Run `npm run check:health`
   - **Expected**: Compose health check shows `{"ok":false,"error":"Missing OLLAMA_API_KEY"}`
4. Try to transcribe and compose
   - **Expected**: Transcription works (local)
   - **Expected**: Composition fails with error message

#### Test 6: State Refresh
1. Complete a full transcribe and compose cycle
2. Refresh the browser page
   - **Expected**: Audio preview clears
   - **Expected**: Transcript clears
   - **Expected**: Final text clears
   - **Confirm**: No persistent storage (as designed)

### Expected Results

**On Success**:
- ✅ Recording works and plays back
- ✅ Transcription produces text locally (no API calls)
- ✅ Composition refines text via Ollama Cloud
- ✅ Status messages update clearly
- ✅ Errors display inline with helpful messages

**Common Errors and Remedies**

| Error | Cause | Solution |
|-------|-------|----------|
| "Recording is not supported in this browser" | Browser lacks MediaRecorder | Use Chrome, Edge, or Firefox |
| "Microphone permission denied" | Permission blocked | Allow microphone in browser settings |
| "Missing OLLAMA_API_KEY" | API key not configured | Add key to `.env.local` |
| Model download timeout | Slow network | Wait or use better connection for first run |
| "File too large. Max 25 MB." | Recording exceeds limit | Reduce recording duration |
| Compose fails | Invalid Ollama credentials | Verify OLLAMA_API_KEY and BASE_URL |

### First-Time Setup Notes

**Model Download (First Run Only)**:
- Whisper tiny model: ~50MB download
- Cached in `.cache/transformers/` directory
- Subsequent runs use cached model (fast)
- Download happens automatically on first transcription

**Performance**:
- Transcription: 5-10 seconds for 1 minute of audio (local)
- Composition: 2-5 seconds depending on Ollama Cloud response time

## Development Philosophy

- Start from the simplest possible working version
- Improve iteratively
- Keep code readable, minimal, and modular
- Follow a strict step-by-step gated process

## License

Private project - All rights reserved
