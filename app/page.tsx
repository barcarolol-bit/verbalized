'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { MAX_DURATION_SEC } from '@/lib/config';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const TARGET_SAMPLE_RATE = 16_000;

type Status = 'Idle' | 'Recording' | 'Uploading audio' | 'Transcribing' | 'Composing' | 'Done' | 'Error' | 'Processing audio';

// Audio processing utilities
function mixDown(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return new Float32Array(buffer.getChannelData(0));
  }

  const length = buffer.length;
  const mono = new Float32Array(length);
  const scale = 1 / buffer.numberOfChannels;

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] * scale;
    }
  }

  return mono;
}

function resampleFloat32(
  samples: Float32Array,
  inputRate: number,
  targetRate: number
): Float32Array {
  if (inputRate === targetRate) {
    return samples;
  }

  const ratio = targetRate / inputRate;
  const outputLength = Math.max(1, Math.floor(samples.length * ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i / ratio;
    const index0 = Math.floor(position);
    const index1 = Math.min(index0 + 1, samples.length - 1);
    const fraction = position - index0;
    const sample0 = samples[index0] ?? 0;
    const sample1 = samples[index1] ?? sample0;
    output[i] = sample0 + (sample1 - sample0) * fraction;
  }

  return output;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intSample =
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += bytesPerSample;
  }

  return buffer;
}

async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const contextCtor =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext
      : undefined;

  if (!contextCtor) {
    throw new Error('Web Audio API is not supported in this browser');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new contextCtor();

  try {
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      audioContext.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    });

    const mono = mixDown(audioBuffer);
    const resampled = resampleFloat32(
      mono,
      audioBuffer.sampleRate,
      TARGET_SAMPLE_RATE
    );
    const wavBuffer = encodeWav(resampled, TARGET_SAMPLE_RATE);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    audioContext.close();
  }
}

// Format time in mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');
  const [editableFinalText, setEditableFinalText] = useState<string>('');
  const [status, setStatus] = useState<Status>('Idle');
  const [prePrompt, setPrePrompt] = useState<string>('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasMediaDevices = !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      setBrowserSupported(hasMediaDevices && hasMediaRecorder);
      
      if (!hasMediaDevices || !hasMediaRecorder) {
        toast.error('Recording is not supported in this browser');
        setStatus('Error');
      }
    }

    // Load saved drafts
    const savedTranscript = localStorage.getItem('verbalized-transcript');
    const savedFinalText = localStorage.getItem('verbalized-finaltext');
    const savedPrePrompt = localStorage.getItem('verbalized-preprompt');
    
    if (savedTranscript) setTranscript(savedTranscript);
    if (savedFinalText) {
      setFinalText(savedFinalText);
      setEditableFinalText(savedFinalText);
    }
    if (savedPrePrompt) setPrePrompt(savedPrePrompt);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (transcript) localStorage.setItem('verbalized-transcript', transcript);
  }, [transcript]);

  useEffect(() => {
    if (finalText) localStorage.setItem('verbalized-finaltext', finalText);
  }, [finalText]);

  useEffect(() => {
    if (prePrompt) localStorage.setItem('verbalized-preprompt', prePrompt);
  }, [prePrompt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to start recording
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!isRecording && browserSupported && !isTranscribing && !isComposing) {
          handleStartRecording();
        }
      }
      // Ctrl/Cmd + Shift + K to stop recording
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        if (isRecording) {
          handleStopRecording();
        }
      }
      // Ctrl/Cmd + Enter to transcribe
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && audioBlob && !transcript) {
        e.preventDefault();
        handleTranscribe();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRecording, browserSupported, isTranscribing, isComposing, audioBlob, transcript]);

  const handleStartRecording = async () => {
    try {
      setTranscript('');
      setFinalText('');
      setEditableFinalText('');
      setStatus('Recording');
      setRecordingTime(0);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Recording is not supported in this browser');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Recording is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeTypes = ['audio/webm', 'audio/webm;codecs=opus'];
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType || 'audio/webm' });
        
        if (audioURL) {
          URL.revokeObjectURL(audioURL);
        }
        
        const newURL = URL.createObjectURL(blob);
        setAudioURL(newURL);
        setAudioBlob(blob);
        setStatus('Idle');
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Set max duration timer
      timerRef.current = setTimeout(() => {
        handleStopRecording();
        toast.info('Maximum recording duration reached');
      }, MAX_DURATION_SEC * 1000);

    } catch (err) {
      let errorMessage = 'Recording is not supported in this browser';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
      setStatus('Error');
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    toast.success('Recording stopped');
  };

  const handleTranscribe = async () => {
    setTranscript('');
    setIsTranscribing(true);

    const toastId = toast.loading('Processing audio...');

    try {
      if (!audioBlob) {
        throw new Error('No audio recording available');
      }

      if (audioBlob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('File too large. Max 25 MB.');
      }

      setStatus('Processing audio');

      let wavBlob: Blob;
      try {
        wavBlob = await convertBlobToWav(audioBlob);
      } catch (conversionError) {
        console.error(conversionError);
        throw new Error('Failed to process audio for transcription');
      }

      if (wavBlob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Processed audio file exceeds 25 MB limit');
      }

      const formData = new FormData();
      formData.append('file', wavBlob, 'audio.wav');

      setStatus('Uploading audio');
      toast.loading('Uploading audio...', { id: toastId });

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      setStatus('Transcribing');
      toast.loading('Transcribing...', { id: toastId });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Transcription failed');
      }

      const data = await response.json();
      const transcriptText = data?.transcript || '';

      if (!transcriptText) {
        throw new Error('No transcript returned from server');
      }

      setTranscript(transcriptText);
      setStatus('Done');
      setIsTranscribing(false);
      toast.success('Transcription complete!', { id: toastId });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error during transcription';
      toast.error(errorMessage, { id: toastId });
      setStatus('Error');
      setIsTranscribing(false);
    }
  };

  const handleCompose = async () => {
    setFinalText('');
    setEditableFinalText('');
    setIsComposing(true);

    const toastId = toast.loading('Composing text...');

    try {
      if (!transcript) {
        throw new Error('No transcript available. Please transcribe first.');
      }

      setStatus('Composing');

      const response = await fetch('/api/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          prePrompt: prePrompt || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Composition failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const json = JSON.parse(data);
                if (json.content) {
                  accumulatedText += json.content;
                  setFinalText(accumulatedText);
                  setEditableFinalText(accumulatedText);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      if (!accumulatedText) {
        throw new Error('No final text returned from server');
      }

      setStatus('Done');
      setIsComposing(false);
      toast.success('Text composed successfully!', { id: toastId });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error during composition';
      toast.error(errorMessage, { id: toastId });
      setStatus('Error');
      setIsComposing(false);
    }
  };

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(editableFinalText || finalText);
    toast.success('Copied to clipboard!');
  }, [editableFinalText, finalText]);

  const handleDownload = useCallback((format: 'txt' | 'md') => {
    const text = editableFinalText || finalText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verbalized-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${format.toUpperCase()}`);
  }, [editableFinalText, finalText]);

  const handleClearAll = useCallback(() => {
    if (confirm('Clear all data? This will remove the recording, transcript, and final text.')) {
      setAudioBlob(null);
      if (audioURL) URL.revokeObjectURL(audioURL);
      setAudioURL('');
      setTranscript('');
      setFinalText('');
      setEditableFinalText('');
      setPrePrompt('');
      setRecordingTime(0);
      localStorage.removeItem('verbalized-transcript');
      localStorage.removeItem('verbalized-finaltext');
      localStorage.removeItem('verbalized-preprompt');
      toast.success('All data cleared');
    }
  }, [audioURL]);

  const isProcessing = isTranscribing || isComposing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Verbalized
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Voice to refined text in two simple steps
          </p>
          <p className="text-xs md:text-sm text-gray-500 mt-2">
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘K</kbd> to record • 
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs ml-2">⌘⇧K</kbd> to stop • 
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs ml-2">⌘↵</kbd> to transcribe
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:gap-8">
          {/* Step 1: Record */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold">
                  1
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Record Your Voice</h2>
              </div>
              {audioBlob && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  title="Clear all data"
                >
                  🗑️ Clear
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStartRecording}
                  disabled={!browserSupported || isRecording || isProcessing}
                  className={`flex-1 px-4 md:px-6 py-3 md:py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm text-sm md:text-base ${
                    !browserSupported || isRecording || isProcessing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95'
                  }`}
                >
                  {isRecording ? '🎙️ Recording...' : '🎙️ Start Recording'}
                </button>
                <button
                  onClick={handleStopRecording}
                  disabled={!isRecording || isProcessing}
                  className={`flex-1 px-4 md:px-6 py-3 md:py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm text-sm md:text-base ${
                    !isRecording || isProcessing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md active:scale-95'
                  }`}
                >
                  ⏹️ Stop Recording
                </button>
              </div>

              {/* Recording Timer */}
              {isRecording && (
                <div className="flex items-center justify-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-red-700 font-mono font-bold text-lg">
                    {formatTime(recordingTime)}
                  </span>
                  <span className="text-red-600 text-sm">
                    / {formatTime(MAX_DURATION_SEC)}
                  </span>
                </div>
              )}

              {/* Status Line */}
              {status !== 'Idle' && status !== 'Error' && !isRecording && (
                <div className="px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                  {status}
                </div>
              )}
              
              {/* Audio Preview */}
              {audioURL && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                    🎵 Audio Preview
                  </div>
                  <audio controls src={audioURL} className="w-full rounded-lg">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Transcribe Button */}
              {audioBlob && !transcript && (
                <button
                  onClick={handleTranscribe}
                  disabled={isProcessing}
                  className={`w-full px-4 md:px-6 py-3 md:py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm text-sm md:text-base ${
                    isProcessing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md active:scale-95'
                  }`}
                >
                  ✨ Transcribe Audio
                </button>
              )}
            </div>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold">
                  ✓
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Transcript</h2>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 md:p-6 border border-gray-200">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words text-sm md:text-base">
                  {transcript}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Compose */}
          {transcript && (
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold">
                  2
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Refine with AI</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pre-prompt (optional)
                  </label>
                  <textarea
                    value={prePrompt}
                    onChange={(e) => setPrePrompt(e.target.value)}
                    placeholder="e.g., 'Format as bullet points' or 'Make it more formal'"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all text-sm md:text-base"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleCompose}
                  disabled={isProcessing}
                  className={`w-full px-4 md:px-6 py-3 md:py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm text-sm md:text-base ${
                    isProcessing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-md active:scale-95'
                  }`}
                >
                  🚀 Compose Final Text
                </button>
              </div>
            </div>
          )}

          {/* Final Text Display */}
          {finalText && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 md:p-8 border border-green-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-bold">
                  ✓
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Final Text</h2>
              </div>
              <div className="bg-white rounded-xl p-4 md:p-6 border border-green-300 shadow-sm">
                <textarea
                  value={editableFinalText}
                  onChange={(e) => setEditableFinalText(e.target.value)}
                  className="w-full text-gray-800 leading-relaxed whitespace-pre-wrap break-words border-none focus:outline-none resize-none min-h-[200px] text-sm md:text-base"
                  placeholder="Your refined text will appear here..."
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => handleDownload('txt')}
                  className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  💾 Download TXT
                </button>
                <button
                  onClick={() => handleDownload('md')}
                  className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  📝 Download MD
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 md:mt-12 text-xs md:text-sm text-gray-500">
          <p>Transcription via OpenAI Whisper • Composition via Ollama Cloud</p>
        </div>
      </div>
    </div>
  );
}
