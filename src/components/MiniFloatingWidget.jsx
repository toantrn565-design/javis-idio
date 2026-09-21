import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Mic, Copy, Check, Volume2, ArrowRightLeft, Maximize2, 
  Send, RefreshCw, X, MessageSquare, Zap
} from 'lucide-react';
import { LANGUAGES } from '../constants/languages';
import { translateText } from '../services/translateService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { toast } from 'react-hot-toast';

export default function MiniFloatingWidget({ settings, onExpand }) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Languages
  const [sourceLang, setSourceLang] = useState('vi');
  const [targetLang, setTargetLang] = useState('en');

  // Speech
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const { speak, isSpeaking } = useSpeechSynthesis();

  // Tự động kiểm tra clipboard khi mở lên
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim() && text.length < 500 && text !== sourceText && text !== translatedText) {
            setSourceText(text.trim());
            handleTranslate(text.trim());
          }
        }
      } catch (e) {}
    };
    checkClipboard();
  }, []);

  const handleTranslate = async (textToTranslate = sourceText) => {
    if (!textToTranslate || !textToTranslate.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText(textToTranslate, sourceLang, targetLang);
      setTranslatedText(res);
      if (settings?.autoCopy !== false) {
        navigator.clipboard.writeText(res);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      if (settings?.autoSpeak) {
        speak(res, targetLang);
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi dịch');
    } finally {
      setIsTranslating(false);
    }
  };

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopyTranslated = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    toast.success('Đã Copy! Sang Zalo bấm Ctrl+V để gửi', { icon: '📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Trình duyệt không hỗ trợ Web Speech');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = sourceLang === 'vi' ? 'vi-VN' : sourceLang === 'en' ? 'en-US' : sourceLang === 'zh' ? 'zh-CN' : sourceLang === 'ja' ? 'ja-JP' : sourceLang === 'ko' ? 'ko-KR' : 'vi-VN';
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        if (spoken) {
          setSourceText(spoken);
          handleTranslate(spoken);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      toast('Đang nghe giọng nói...', { icon: '🎙️', duration: 1500 });
    } catch (e) {
      setIsListening(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#090d16]/95 backdrop-blur-2xl text-slate-100 p-3 flex flex-col justify-between select-none border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden">
      {/* 1. Header Mini */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5 text-xs font-black text-white font-['Outfit']">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>JAVIS Mini Zalo</span>
          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md font-mono">Ghim Nổi</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Swap languages */}
          <div className="flex items-center gap-1 bg-[#1e293b] px-2 py-0.5 rounded-lg text-[11px] font-bold">
            <span className="text-slate-300">{LANGUAGES[sourceLang]?.flag} {sourceLang.toUpperCase()}</span>
            <button onClick={swapLanguages} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
              <ArrowRightLeft className="w-3 h-3" />
            </button>
            <span className="text-emerald-400">{LANGUAGES[targetLang]?.flag} {targetLang.toUpperCase()}</span>
          </div>

          {/* Phóng to toàn màn hình */}
          <button 
            onClick={onExpand}
            title="Mở rộng cửa sổ đầy đủ"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Middle Content Grid */}
      <div className="grid grid-cols-2 gap-2 my-1.5 flex-1 min-h-0">
        {/* Left: Input Text */}
        <div className="bg-[#141e33]/90 rounded-xl p-2 border border-white/[0.06] flex flex-col justify-between">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTranslate();
              }
            }}
            placeholder="Gõ hoặc dán tin Zalo..."
            className="w-full h-full bg-transparent text-xs text-white placeholder-slate-500 resize-none outline-none leading-relaxed"
          />
        </div>

        {/* Right: Translated Output */}
        <div className="bg-[#141e33]/90 rounded-xl p-2 border border-emerald-500/20 flex flex-col justify-between relative">
          {isTranslating ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-emerald-400 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang dịch...
            </div>
          ) : (
            <div className="text-xs text-emerald-300 font-semibold leading-relaxed overflow-y-auto max-h-[85px] custom-scrollbar">
              {translatedText || <span className="text-slate-500 font-normal italic">Bản dịch sẽ hiện ở đây...</span>}
            </div>
          )}

          {/* Bottom quick actions on output */}
          {translatedText && (
            <div className="flex items-center justify-end gap-1 pt-1 border-t border-white/5">
              <button
                onClick={() => speak(translatedText, targetLang)}
                className="p-1 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title="Nghe phát âm"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopyTranslated}
                className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-md flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Đã chép' : 'Gửi Zalo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Action Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMic}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isListening 
                ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md shadow-emerald-500/20'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isListening ? 'Đang nghe...' : 'Nói để dịch'}</span>
          </button>

          <button
            onClick={() => handleTranslate()}
            disabled={!sourceText.trim() || isTranslating}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3 h-3" /> Dịch
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">Alt + Z để ẩn/hiện</span>
      </div>
    </div>
  );
}
