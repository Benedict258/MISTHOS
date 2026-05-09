import { useState, useRef, useCallback } from 'react';

interface UseVoiceInputReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
}

/**
 * Hook for capturing voice input via MediaRecorder API.
 * In production, the audio blob would be sent to ElevenLabs STT API.
 * For the hackathon MVP, this simulates transcription.
 */
export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);

        try {
          // Convert blob to base64
          const reader = new FileReader();
          const audioBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]); // Extract base64 part
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });

          // POST to mock /api/voice/transcribe endpoint
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: audioBase64 }),
          });

          if (!res.ok) throw new Error(`Transcribe error: ${res.statusText}`);
          const data = await res.json();
          setTranscript(data.transcript || null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Voice transcription failed');
          setTranscript(null);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, isProcessing, transcript, startRecording, stopRecording, error };
}
