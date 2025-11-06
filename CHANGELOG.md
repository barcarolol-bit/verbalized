# Changelog

All notable changes to the Verbalized project.

## [0.1.0] - 2025-11-04

### Initial Release

**Verbalized** - A minimal browser-based voice-to-text and text-enhancement tool.

### Features

- ✅ **Voice Recording**: Browser-based audio capture with MediaRecorder API
- ✅ **Audio Transcription**: OpenAI Whisper API integration (whisper-1 model)
- ✅ **Text Composition**: Ollama Cloud integration (gpt-oss:120b-cloud)
- ✅ **Two-Step Workflow**: Separate transcribe and compose steps for better control
- ✅ **Pre-prompt Support**: Custom context for AI refinement
- ✅ **Modern UI**: Gradient design with numbered steps and smooth animations
- ✅ **Privacy-Focused**: No storage, no login, audio deleted after processing
- ✅ **Error Handling**: Comprehensive error messages and graceful degradation
- ✅ **Browser Support**: MediaRecorder detection with helpful error messages

### Technical Stack

- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: TailwindCSS v4
- **Runtime**: Node.js 20+

### API Endpoints

- `POST /api/transcribe` - OpenAI Whisper transcription
- `POST /api/compose` - Ollama Cloud composition
- `GET /api/health/transcribe` - Transcription health check
- `GET /api/health/compose` - Composition health check

### Configuration

Required environment variables:
- `OPENAI_API_KEY` - For Whisper transcription
- `OLLAMA_API_KEY` - For text composition

Optional environment variables:
- `OLLAMA_BASE_URL` (default: https://ollama.com/api)
- `OLLAMA_MODEL` (default: gpt-oss:120b-cloud)
- `NEXT_PUBLIC_MAX_DURATION_SECONDS` (default: 180)

### Development Journey

**Architecture Evolution**:
1. Started with plan for local Whisper processing
2. Attempted @xenova/transformers - AudioContext unavailable in Node.js
3. Attempted node-whisper - requires whisper.cpp binary
4. Attempted ffmpeg conversion - Next.js module resolution issues
5. **Final**: OpenAI Whisper API for reliability and ease of use

**UI Evolution**:
1. Simple skeleton with single button
2. Combined "Transcribe and Compose" button
3. **Final**: Separated into two-step workflow with modern design

### Known Limitations

- Requires two API keys (OpenAI and Ollama)
- Transcription has small cost (~$0.006 per minute via OpenAI)
- Maximum recording duration: 3 minutes (configurable)
- Maximum file size: 25 MB
- No persistent storage (by design)
- No user authentication (by design)

### Future Enhancements (Not Implemented)

- Local Whisper transcription (requires whisper.cpp setup)
- Audio file upload (currently recording only)
- Export to different formats
- Batch processing
- User accounts and history
- Custom Ollama models selection in UI

---

## Version History

**0.1.0** - Initial production-ready release with OpenAI Whisper + Ollama Cloud

