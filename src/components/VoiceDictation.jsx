import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Copy, Share2, Volume2, Sparkles, RefreshCw, Check, ArrowRight, Wand2, FileText, Briefcase, MessageSquare, Globe, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { transcribeAudioOnly, refineTextWithAI } from '../services/translateService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const REFINE_MODES = [
  { id: 'exact', name: 'Chính xác', icon: FileText, desc: 'Sửa chính tả & dấu câu' },
  { id: 'work', name: 'Công việc', icon: Briefcase, desc: 'Văn phong chuyên nghiệp' },
  { id: 'summary', name: 'Tóm tắt', icon: Sparkles, desc: 'Gạch đầu dòng ý chính' },
  { id: 'message', name: 'Tin nhắn', icon: MessageSquare, desc: 'Lịch sự, thân thiện' },
  { id: 'english', name: 'Tiếng Anh', icon: Globe, desc: 'Dịch sang English' },
];

export default function VoiceDictation({ history, setHistory, settings }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [activeMode, setActiveMode] = useState(settings?.defaultRefineMode || 'exact');
  const [copied, setCopied] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const { speak, isSpeaking, stop } = useSpeechSynthesis();

  // Đếm thời gian thu âm
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setCopied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1];
            try {
              // 1. Nhận diện giọng nói
              const text = await transcribeAudioOnly({
                audioBlob,
                base64Audio,
                mimeType: mediaRecorder.mimeType,
                language: 'vi'
              });

              if (!text || !text.trim()) {
                toast.error('Không nghe rõ giọng nói hoặc âm thanh quá nhỏ.');
                setIsProcessing(false);
                return;
              }

              setRawText(text);

              // 2. Tự động xử lý theo chế độ AI
              const processed = await refineTextWithAI({ text, mode: activeMode });
              const finalOutput = processed || text;
              setRefinedText(finalOutput);

              // 3. Tự động sao chép nếu bật trong cài đặt
              if (settings?.autoCopy !== false) {
                await navigator.clipboard.writeText(finalOutput).catch(() => {});
                setCopied(true);
                toast.success('Đã nhận diện & tự động sao chép!', { icon: '📋' });
              } else {
                toast.success('Đã nhận diện thành công!');
              }

              // 4. Lưu lịch sử
              if (setHistory && settings?.saveHistory !== false) {
                const newEntry = {
                  id: Date.now(),
                  type: 'dictation',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  rawText: text,
                  refinedText: finalOutput,
                  mode: activeMode,
                };
                setHistory(prev => [newEntry, ...(prev || []).slice(0, 49)]);
              }

            } catch (err) {
              console.error(err);
              toast.error(err.message || 'Lỗi nhận diện âm thanh.');
            } finally {
              setIsProcessing(false);
            }
          };
        } catch (err) {
          toast.error('Lỗi mã hóa âm thanh.');
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        toast.error('Hãy cấp quyền sử dụng Micro cho trình duyệt.');
      } else {
        toast.error('Không thể mở Micro: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Chuyển đổi chế độ AI Refine
  const handleModeChange = async (modeId) => {
    setActiveMode(modeId);
    if (!rawText) return;

    setIsProcessing(true);
    try {
      const result = await refineTextWithAI({ text: rawText, mode: modeId });
      setRefinedText(result || rawText);
      toast.success(`Đã chuyển sang: ${REFINE_MODES.find(m => m.id === modeId)?.name}`);
    } catch (err) {
      toast.error(err.message || 'Lỗi xử lý AI.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = refinedText || rawText;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Đã sao chép vào bộ nhớ đệm!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    const textToShare = refinedText || rawText;
    if (!textToShare) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'JAVIS Idio Voice Note',
          text: textToShare,
        });
      } catch (err) {
        // Cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleSpeak = () => {
    const textToSpeak = refinedText || rawText;
    if (!textToSpeak) return;
    if (isSpeaking) {
      stop();
    } else {
      speak(textToSpeak, activeMode === 'english' ? 'en-US' : 'vi-VN');
    }
  };

  const handleClear = () => {
    setRawText('');
    setRefinedText('');
    setCopied(false);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {/* 1. Refine Mode Selector */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-3.5 border border-white/[0.08] shadow-xl">
        <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-emerald-400" /> Chế độ AI Chuẩn Hóa Văn Bản:
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {REFINE_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`flex flex-col items-center py-2.5 px-1.5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-102 border border-emerald-400/40'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/[0.06]'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-white' : 'text-emerald-400'}`} />
                <span className="truncate w-full text-center text-[11px]">{mode.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Studio Microphone Action Area */}
      <div className="bg-[#0f172a]/80 backdrop-blur-2xl rounded-3xl p-8 border border-white/[0.08] shadow-2xl text-center flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden">
        {isRecording && (
          <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 rounded-full bg-red-500/20 animate-ping" />
          </div>
        )}

        {/* Ambient Ring */}
        <div className="relative">
          {!isRecording && !isProcessing && (
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 blur-md opacity-30 animate-pulse"></div>
          )}

          {/* Big Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 z-10 ${
              isRecording
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white ring-8 ring-red-500/30 animate-pulse'
                : isProcessing
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white cursor-wait'
                : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white hover:scale-105 shadow-[0_0_35px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-10 h-10 animate-bounce" />
                <span className="text-xs font-black mt-1 font-mono tracking-wider">{formatSeconds(recordingSeconds)}</span>
              </>
            ) : isProcessing ? (
              <>
                <RefreshCw className="w-9 h-9 animate-spin" />
                <span className="text-[10px] font-extrabold mt-1">AI Đang Xử Lý</span>
              </>
            ) : (
              <>
                <Mic className="w-11 h-11 drop-shadow" />
                <span className="text-xs font-black mt-1 tracking-wider uppercase font-['Outfit']">CHẠM ĐỂ NÓI</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 mt-5 font-medium max-w-xs">
          {isRecording
            ? '🔴 Đang lắng nghe giọng nói... Chạm lại để hoàn tất'
            : isProcessing
            ? '⚡ AI đang chuyển đổi giọng nói & chuẩn hóa văn bản...'
            : 'Chạm để nói tiếng Việt tự nhiên (AI tự sửa chính tả & thêm dấu câu)'}
        </p>
      </div>

      {/* 3. Output / Result Glass Card */}
      {(refinedText || rawText || isProcessing) && (
        <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400 font-['Outfit']">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Kết quả chuẩn hóa ({REFINE_MODES.find(m => m.id === activeMode)?.name}):</span>
            </div>
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa
            </button>
          </div>

          <textarea
            value={refinedText || rawText}
            onChange={(e) => setRefinedText(e.target.value)}
            rows={4}
            className="w-full text-base sm:text-lg text-slate-100 bg-transparent border-0 focus:ring-0 p-0 resize-none font-sans leading-relaxed outline-none"
            placeholder="Kết quả văn bản sẽ hiển thị ở đây..."
          />

          {rawText && refinedText !== rawText && (
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/[0.06] text-xs text-slate-400">
              <div className="font-semibold text-slate-300 mb-0.5">Gốc từ giọng nói:</div>
              <p className="italic text-slate-400 font-mono">"{rawText}"</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2.5 border-t border-white/[0.08]">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 ${
                copied
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'ĐÃ SAO CHÉP!' : 'SAO CHÉP'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-2xl text-xs font-bold transition-all active:scale-95"
              title="Gửi sang Zalo / Messenger"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Gửi Zalo</span>
            </button>

            <button
              onClick={handleSpeak}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-2xl text-xs font-bold transition-all active:scale-95"
              title="Đọc phát âm"
            >
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span>Nghe</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
