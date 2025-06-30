import { useState, useCallback, useEffect } from 'react';

interface UseTTSProps {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export const useTTS = ({ 
  lang = 'ja-JP', 
  rate = 0.9, 
  pitch = 1.0 
}: UseTTSProps = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      setIsSupported('speechSynthesis' in window);
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    // Load voices immediately if available
    loadVoices();

    // Also listen for the voiceschanged event (some browsers need this)
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Stop any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Find the best Japanese voice
    const japaneseVoice = voices.find(voice => 
      voice.lang.includes('ja') || voice.lang.includes('JP')
    );
    
    if (japaneseVoice) {
      utterance.voice = japaneseVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  }, [lang, rate, pitch, voices, isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    voices,
    isSupported
  };
};

