import { useState, useCallback } from 'react';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text, langCode) => {
    if (!text) return;
    setIsSpeaking(true);
    
    // Convert 'vi-VN' -> 'vi'
    const shortLang = (langCode || 'vi').split('-')[0];
    
    // Sử dụng Google Translate TTS API (Hoạt động mượt trên mọi điện thoại)
    // Giới hạn khoảng 200 ký tự mỗi lần đọc để đảm bảo ổn định
    const safeText = text.substring(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${shortLang}&q=${encodeURIComponent(safeText)}`;
    
    const audio = new Audio(url);
    
    audio.onended = () => setIsSpeaking(false);
    
    audio.onerror = () => {
      // Nếu API bị chặn, fallback về trình đọc mặc định của trình duyệt
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    };

    // Yêu cầu phát âm thanh
    audio.play().catch(err => {
      console.warn("Trình duyệt chặn autoplay audio", err);
      // Fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    });

  }, []);

  const stop = useCallback(() => {
    setIsSpeaking(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { isSpeaking, speak, stop, isSupported: true };
}
