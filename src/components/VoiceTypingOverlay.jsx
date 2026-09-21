import { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, Check, RefreshCw, X, Keyboard } from 'lucide-react';
import { refineTextWithAI } from '../services/translateService';
import { toast } from 'react-hot-toast';

export default function VoiceTypingOverlay({ settings, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Trình duyệt không hỗ trợ Web Speech API');
      onClose();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false; // Stop after sentence
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInterimText(transcript);

        if (event.results[0].isFinal) {
          handleFinish(transcript);
        }
      };

      recognition.onerror = (err) => {
        console.warn('Voice typing error:', err);
        setIsRecording(false);
        onClose();
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      setIsRecording(false);
      onClose();
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    setIsRecording(false);
  };

  const handleFinish = async (spokenText) => {
    if (!spokenText || !spokenText.trim()) {
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Chuẩn hóa bằng AI (sửa chính tả, dấu câu)
      let finalText = spokenText.trim();
      if (settings?.voiceTypingRefine !== false) {
        try {
          finalText = await refineTextWithAI({ text: spokenText, mode: settings?.defaultRefineMode || 'exact' });
        } catch (e) {
          // Fallback to spoken text if AI fails
        }
      }

      // 2. Gõ thẳng vào con trỏ chuột qua Electron IPC
      if (typeof window !== 'undefined' && window.electronAPI?.pasteToActiveWindow) {
        window.electronAPI.pasteToActiveWindow(finalText);
        toast.success('Đã tự động gõ vào con trỏ chuột!', { icon: '✨', duration: 2000 });
      } else {
        // Web Fallback: copy to clipboard
        navigator.clipboard.writeText(finalText);
        toast.success('Đã sao chép vào bộ nhớ!', { icon: '📋' });
      }
    } catch (err) {
      toast.error('Lỗi xử lý giọng nói: ' + err.message);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const manualStop = () => {
    if (interimText) {
      handleFinish(interimText);
    } else {
      stopListening();
      onClose();
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-[#0f172a]/95 backdrop-blur-2xl border-2 border-emerald-500/60 rounded-full px-5 py-3 shadow-[0_20px_60px_rgba(16,185,129,0.35)] flex items-center gap-3.5 max-w-lg min-w-[320px]">
        {/* Pulsing Mic Indicator */}
        <div className="relative flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <div className="relative w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-inner">
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4 animate-bounce" />}
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 overflow-hidden">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Keyboard className="w-3 h-3" />
            <span>Bàn Phím Giọng Nói (Đang gõ vào app)</span>
          </div>
          <p className="text-xs font-semibold text-white truncate mt-0.5">
            {isProcessing ? 'Đang chuẩn hóa & gõ vào con trỏ...' : (interimText || 'Hãy nói vào Micro...')}
          </p>
        </div>

        {/* Stop / Finish Button */}
        <button
          onClick={manualStop}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-full text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" /> Gõ ngay
        </button>

        <button
          onClick={() => { stopListening(); onClose(); }}
          className="text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
