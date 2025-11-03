# Sample Audio Files

## Creating a Test Audio File

Since audio files cannot be easily committed as text, you can create your own test sample:

### Option 1: Record via the App
1. Start the Verbalized app: `npm run dev`
2. Navigate to http://localhost:3000
3. Click "Start Recording"
4. Speak clearly for 3-5 seconds (e.g., "Hello, this is a test recording")
5. Click "Stop Recording"
6. Use the audio preview to verify

### Option 2: Use Online Audio Generators
1. Visit an online text-to-speech service
2. Generate a short 3-5 second audio clip
3. Download as WebM or convert to WebM format
4. Save as `hello.webm` in this directory

### Option 3: Command Line (ffmpeg)
If you have ffmpeg installed:

```bash
# Generate a 3-second silent audio file
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 3 -c:a libopus hello.webm

# Or convert an existing audio file
ffmpeg -i yourfile.mp3 -t 5 -c:a libopus hello.webm
```

### Recommended Test Audio
- **Duration**: 3-5 seconds
- **Content**: Simple phrase like "Hello, this is a test recording for Verbalized"
- **Format**: WebM (preferred) or MP3/WAV
- **Size**: Under 1 MB

### Why This Matters
Test audio ensures:
- MediaRecorder produces valid blobs
- Whisper transcription works locally
- Audio preview displays correctly
- File size validation works

