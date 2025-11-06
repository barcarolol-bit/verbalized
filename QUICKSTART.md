# Quick Start Guide - Verbalized

## 🚀 Get Started in 3 Minutes

### 1️⃣ Setup (First Time Only)

```bash
# Clone and install
cd verbalized
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

Required in `.env.local`:

```env
OPENAI_API_KEY=sk-your-key-here
OLLAMA_API_KEY=your-key-here
```

### 2️⃣ Run the App

```bash
npm run dev
```

Open http://localhost:3000

### 3️⃣ Use the App

#### Record Audio

1. Click **"🎙️ Start Recording"** (or press `Ctrl/Cmd + K`)
2. Speak clearly into your microphone
3. Watch the live timer count up
4. Click **"⏹️ Stop Recording"** when done (or press `Ctrl/Cmd + Shift + K`)

#### Transcribe

1. Review your audio in the player
2. Click **"✨ Transcribe Audio"** (or press `Ctrl/Cmd + Enter`)
3. Wait for OpenAI Whisper to process (~5-15 seconds)
4. See your transcript appear

#### Compose (Refine)

1. Optionally add a pre-prompt (e.g., "Make it more formal")
2. Click **"🚀 Compose Final Text"**
3. Watch AI generate refined text in real-time
4. Edit the result if needed

#### Export

- **📋 Copy**: Copy to clipboard
- **💾 Download TXT**: Save as text file
- **📝 Download MD**: Save as Markdown

## ⌨️ Keyboard Shortcuts

| Shortcut               | Action           |
| ---------------------- | ---------------- |
| `Ctrl/Cmd + K`         | Start recording  |
| `Ctrl/Cmd + Shift + K` | Stop recording   |
| `Ctrl/Cmd + Enter`     | Transcribe audio |

## 💡 Pro Tips

### Best Recording Practices

- Use a quiet environment
- Speak clearly and at a moderate pace
- Stay close to your microphone
- Maximum duration: 3 minutes (180 seconds)

### Pre-Prompt Examples

- "Format as bullet points"
- "Make it more formal"
- "Summarize the key points"
- "Write as a professional email"
- "Convert to a to-do list"

### Auto-Save Feature

- Your work is automatically saved
- Refresh the page - your data persists!
- Click "🗑️ Clear" to start fresh

## 🔧 Troubleshooting

### "Recording is not supported in this browser"

- Use Chrome, Edge, or Firefox
- Ensure you're using HTTPS or localhost
- Check microphone permissions in browser settings

### "Microphone permission denied"

- Click the 🔒 icon in the address bar
- Allow microphone access
- Refresh the page

### "Transcription failed"

- Check your OPENAI_API_KEY in .env.local
- Ensure audio file is under 25 MB
- Try recording again with better audio quality

### "Composition failed"

- Check your OLLAMA_API_KEY in .env.local
- Verify OLLAMA_BASE_URL is correct
- Check if the model name is correct

## 🎯 Common Workflows

### Meeting Notes

1. Record the meeting discussion
2. Transcribe
3. Add pre-prompt: "Summarize as bullet points"
4. Compose
5. Download as MD

### Voice Memo to Email

1. Record your thoughts
2. Transcribe
3. Add pre-prompt: "Write as a professional email"
4. Compose
5. Edit if needed
6. Copy and paste into email

### Quick Ideas to Blog Post

1. Record your ideas
2. Transcribe
3. Add pre-prompt: "Expand into a blog post outline"
4. Compose
5. Download as MD

### Interview Transcription

1. Record the interview
2. Transcribe
3. Add pre-prompt: "Format as Q&A"
4. Compose
5. Download as TXT

## 📱 Mobile Usage

The app works great on phones and tablets:

- Touch-friendly buttons
- Optimized text sizes
- Responsive layout
- All features available

## 🔐 Privacy & Security

- No data sent to any server except API calls
- Audio files deleted immediately after processing
- localStorage only stores data on YOUR device
- No login, no tracking, no analytics
- You control your data

## 🆘 Need Help?

1. Check the [IMPROVEMENTS.md](./IMPROVEMENTS.md) for detailed feature explanations
2. See [COMPARISON.md](./COMPARISON.md) for before/after comparisons
3. Review the main [README.md](./README.md) for technical details

## 🎉 You're Ready!

Start recording, transcribing, and creating refined text with AI!

---

**Happy Verbalizing! 🎤→📝**
