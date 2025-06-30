import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderProps {
  onAudioReady: (audioBlob: Blob) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
}

export const useAudioRecorder = ({
  onAudioReady,
  silenceThreshold = 0.01,
  silenceDuration = 2000
}: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      
      // AudioContext setup for silence detection
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // MediaRecorder setup
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        onAudioReady(audioBlob);
        setIsRecording(false);
      };
      
      setIsListening(true);
      detectSpeech();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, [onAudioReady, silenceThreshold, silenceDuration]);

  const detectSpeech = useCallback(() => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudio = () => {
      if (!analyserRef.current || !isListening) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const normalizedVolume = average / 255;
      
      if (normalizedVolume > silenceThreshold) {
        // Speech detected
        if (!isRecording && mediaRecorderRef.current) {
          console.log('Speech detected, starting recording...');
          mediaRecorderRef.current.start();
          setIsRecording(true);
        }
        
        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (isRecording) {
        // Silence detected while recording
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            console.log('Silence detected, stopping recording...');
            if (mediaRecorderRef.current && isRecording) {
              mediaRecorderRef.current.stop();
            }
            silenceTimerRef.current = null;
          }, silenceDuration);
        }
      }
      
      requestAnimationFrame(checkAudio);
    };
    
    checkAudio();
  }, [isListening, isRecording, silenceThreshold, silenceDuration]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
  }, [isRecording]);

  return {
    isListening,
    isRecording,
    startListening,
    stopListening
  };
};

