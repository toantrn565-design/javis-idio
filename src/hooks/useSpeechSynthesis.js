import { useState, useCallback, useRef } from 'react';

// Global singleton tracker to prevent audio overlap and double-speak
let globalAudioInstance = null;
let lastSpeakTimestamp = 0;

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentTokenRef = useRef(0);

  const stop = useCallback(() => {
    setIsSpeaking(false);
    currentTokenRef.current += 1;

    // 1. Dừng Web Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // Ignore
      }
    }

    // 2. Dừng Audio Element
    if (globalAudioInstance) {
      try {
        globalAudioInstance.pause();
        globalAudioInstance.currentTime = 0;
        globalAudioInstance = null;
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const speak = useCallback((text, langCode = 'vi-VN') => {
    if (!text || !text.trim()) return;

    // Chặn kích hoạt liên tiếp trong vòng 350ms (ngăn lỗi double-trigger)
    const now = Date.now();
    if (now - lastSpeakTimestamp < 350) {
      return;
    }
    lastSpeakTimestamp = now;

    // Dừng toàn bộ âm thanh cũ trước khi phát mới
    stop();

    const currentToken = ++currentTokenRef.current;
    setIsSpeaking(true);

    const safeText = text.trim().substring(0, 300);
    const shortLang = (langCode || 'vi').split('-')[0];

    // Cách 1: Sử dụng Native SpeechSynthesis nếu hỗ trợ (mượt, chuẩn giọng, không trễ)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel(); // Đảm bảo hàng đợi rỗng
        
        const utterance = new SpeechSynthesisUtterance(safeText);
        utterance.lang = langCode;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          if (currentTokenRef.current === currentToken) {
            setIsSpeaking(false);
          }
        };

        utterance.onerror = (e) => {
          if (currentTokenRef.current === currentToken) {
            setIsSpeaking(false);
          }
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('Native SpeechSynthesis failed, falling back to Audio TTS', err);
      }
    }

    // Cách 2: Fallback qua Google TTS Audio nếu trình duyệt không có Web Speech
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${shortLang}&q=${encodeURIComponent(safeText)}`;
      const audio = new Audio(url);
      globalAudioInstance = audio;

      audio.onended = () => {
        if (currentTokenRef.current === currentToken) {
          setIsSpeaking(false);
          globalAudioInstance = null;
        }
      };

      audio.onerror = () => {
        if (currentTokenRef.current === currentToken) {
          setIsSpeaking(false);
          globalAudioInstance = null;
        }
      };

      audio.play().catch(err => {
        console.warn("Audio autoplay blocked by browser policy", err);
        if (currentTokenRef.current === currentToken) {
          setIsSpeaking(false);
          globalAudioInstance = null;
        }
      });
    } catch (e) {
      setIsSpeaking(false);
    }
  }, [stop]);

  return { isSpeaking, speak, stop, isSupported: true };
}
