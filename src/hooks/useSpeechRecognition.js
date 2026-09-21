import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LANGUAGES } from '../constants/languages';

export function useSpeechRecognition(onResult) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timeoutRef = useRef(null);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startListening = useCallback(async (sourceLangCode, targetLangCode) => {
    try {
      setError(null);
      setIsProcessing(true); // Hiển thị vòng xoay cam ngay lập tức để báo hiệu đang chuẩn bị Mic (giảm cảm giác đơ/lag)

      // Xin quyền sử dụng micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsProcessing(true); // Bật lại vòng xoay cam khi bắt đầu xử lý âm thanh
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        
        // Tắt luồng micro
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result.split(',')[1];
            
            // Lấy tên ngôn ngữ bằng tiếng Anh để mô hình Gemini nhận diện tốt nhất
            const sourceLangName = Object.values(LANGUAGES).find(l => l.voice === sourceLangCode)?.englishName || 'the language spoken';
            const targetLangName = Object.values(LANGUAGES).find(l => l.voice === targetLangCode)?.englishName || 'the target language';
            
            // Gửi lên Gemini 2.5 để nhận diện VÀ dịch trong CÙNG MỘT LẦN GỌI (Tiết kiệm 50% quota)
            import('../services/translateService').then(async ({ transcribeAndTranslateAudio }) => {
              try {
                const result = await transcribeAndTranslateAudio({ 
                  base64Audio: base64data, 
                  mimeType: mediaRecorder.mimeType, 
                  sourceLang: sourceLangName,
                  targetLang: targetLangName
                });
                
                if (onResult && result) {
                  onResult(result.transcript, result.translation);
                }
              } catch (err) {
                console.error(err);
                setError(err.message || "Lỗi xử lý âm thanh");
                toast.error(err.message || "Lỗi xử lý âm thanh");
              } finally {
                setIsProcessing(false);
              }
            });
          };
        } catch (err) {
          console.error(err);
          setError("Lỗi xử lý âm thanh");
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(200); // Chia nhỏ chunk để tránh tràn RAM gây lag
      setIsProcessing(false); // Tắt vòng xoay cam
      setIsListening(true);   // Bật trạng thái thu âm (nút đỏ chớp)
      
      // Auto-stop after 30 seconds to prevent massive memory usage and freezing
      timeoutRef.current = setTimeout(() => {
        toast.error('Đã tự động ngắt thu âm (quá 30 giây) để tránh giật lag điện thoại.', { duration: 4000 });
        stopListening();
      }, 30000);

    } catch (err) {
      console.error("Mic error:", err);
      if (err.name === 'NotAllowedError') {
        toast.error('Lỗi: Bạn chưa cấp quyền sử dụng Micro cho trình duyệt!', { duration: 5000 });
      } else {
        toast.error('Lỗi khởi động Micro: ' + err.message);
      }
      setError(err.message);
      setIsProcessing(false);
    }
  }, [onResult, stopListening]);

  return { 
    isListening, 
    isProcessing,
    error, 
    startListening, 
    stopListening, 
    isSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) 
  };
}
