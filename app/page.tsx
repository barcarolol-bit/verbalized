'use client';

import { useState, useEffect, useRef } from 'react';
import { MAX_DURATION_SEC } from '@/lib/config';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

type Status = 'Idle' | 'Recording' | 'Uploading audio' | 'Transcribing' | 'Composing' | 'Done' | 'Error';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');
  const [status, setStatus] = useState<Status>('Idle');
  const [prePrompt, setPrePrompt] = useState<string>('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasMediaDevices = !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      setBrowserSupported(hasMediaDevices && hasMediaRecorder);
      
      if (!hasMediaDevices || !hasMediaRecorder) {
        setError('Recording is not supported in this browser');
        setStatus('Error');
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Stop tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Revoke object URL
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const handleStartRecording = async () => {
    try {
      // Clear previous errors and results
      setError('');
      setTranscript('');
      setFinalText('');
      setStatus('Recording');
      
      // Check for support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Recording is not supported in this browser');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Recording is not supported in this browser');
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine MIME type
      const mimeTypes = ['audio/webm', 'audio/webm;codecs=opus'];
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      // Create MediaRecorder
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
        
        // Revoke previous URL if it exists
        if (audioURL) {
          URL.revokeObjectURL(audioURL);
        }
        
        // Create new object URL
        const newURL = URL.createObjectURL(blob);
        setAudioURL(newURL);
        setAudioBlob(blob);
        setStatus('Idle');
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Set duration timer
      timerRef.current = setTimeout(() => {
        handleStopRecording();
      }, MAX_DURATION_SEC * 1000);

    } catch (err) {
      let errorMessage = 'Recording is not supported in this browser';
      
      if (err instanceof Error) {
        // Check for permission denied
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setStatus('Error');
      setIsRecording(false);
      
      // Ensure tracks are stopped on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const handleStopRecording = () => {
    // Clear timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  const handleTranscribe = async () => {
    // Clear previous errors
    setError('');
    setTranscript('');
    setIsTranscribing(true);

    try {
      // Validate audio Blob exists
      if (!audioBlob) {
        setError('No audio recording available');
        setStatus('Error');
        setIsTranscribing(false);
        return;
      }

      // Client-side file size check
      if (audioBlob.size > MAX_FILE_SIZE_BYTES) {
        setError('File too large. Max 25 MB.');
        setStatus('Error');
        setIsTranscribing(false);
        return;
      }

      // Build FormData
      const formData = new FormData();
      const blobType = audioBlob.type || 'audio/webm';
      const filename = blobType.includes('webm') ? 'audio.webm' : 'audio.webm';
      formData.append('file', audioBlob, filename);

      // Uploading status
      setStatus('Uploading audio');

      // Call transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      // Transcribing status
      setStatus('Transcribing');

      // Check response
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData?.error || 'Transcription failed';
        setError(errorMessage);
        setStatus('Error');
        setIsTranscribing(false);
        return;
      }

      // Parse response
      const data = await response.json();
      const transcriptText = data?.transcript || '';

      if (!transcriptText) {
        setError('No transcript returned from server');
        setStatus('Error');
        setIsTranscribing(false);
        return;
      }

      // Success - set transcript
      setTranscript(transcriptText);
      setStatus('Done');
      setIsTranscribing(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error during transcription';
      setError(errorMessage);
      setStatus('Error');
      setIsTranscribing(false);
    }
  };

  const handleCompose = async () => {
    // Clear previous errors
    setError('');
    setFinalText('');
    setIsComposing(true);

    try {
      // Validate transcript exists
      if (!transcript) {
        setError('No transcript available. Please transcribe first.');
        setStatus('Error');
        setIsComposing(false);
        return;
      }

      // Composing status
      setStatus('Composing');

      const composeResponse = await fetch('/api/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          prePrompt: prePrompt || undefined,
        }),
      });

      if (!composeResponse.ok) {
        const composeErrorData = await composeResponse.json();
        const composeErrorMessage = composeErrorData?.error || 'Composition failed';
        setError(composeErrorMessage);
        setStatus('Error');
        setIsComposing(false);
        return;
      }

      const composeData = await composeResponse.json();
      const finalTextResult = composeData?.finalText || '';

      if (!finalTextResult) {
        setError('No final text returned from server');
        setStatus('Error');
        setIsComposing(false);
        return;
      }

      // Success
      setFinalText(finalTextResult);
      setStatus('Done');
      setIsComposing(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error during composition';
      setError(errorMessage);
      setStatus('Error');
      setIsComposing(false);
    }
  };

  const isProcessing = isTranscribing || isComposing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Verbalized
          </h1>
          <p className="text-gray-600 text-lg">
            Voice to refined text in two simple steps
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8">
          {/* Step 1: Record */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold">
                1
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Record Your Voice</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={handleStartRecording}
                  disabled={!browserSupported || isRecording || isProcessing}
                  className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
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
                  className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
                    !isRecording || isProcessing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md active:scale-95'
                  }`}
                >
                  ⏹️ Stop Recording
                </button>
              </div>

              {/* Status Line */}
              {status !== 'Idle' && status !== 'Error' && (
                <div className="px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                  {status}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <span className="text-red-600">⚠️</span>
                  {error}
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
                  className={`w-full px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
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
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold">
                  ✓
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Transcript</h2>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                  {transcript}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Compose */}
          {transcript && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold">
                  2
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Refine with AI</h2>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleCompose}
                  disabled={isProcessing}
                  className={`w-full px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
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
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-8 border border-green-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-bold">
                  ✓
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Final Text</h2>
              </div>
              <div className="bg-white rounded-xl p-6 border border-green-300 shadow-sm">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                  {finalText}
                </p>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(finalText)}
                  className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Semi-offline: Transcription runs locally • Composition via Ollama Cloud</p>
        </div>
      </div>
    </div>
  );
}
