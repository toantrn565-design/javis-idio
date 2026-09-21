import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Copy, Share2, Volume2, Sparkles, RefreshCw, Check, ArrowRight, Wand2, FileText, Briefcase, MessageSquare, Globe } from 'lucide-react';
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
                toast.error('Không nghe thấy giọng nói hoặc âm thanh quá nhỏ.');
                setIsProcessing(false);
                return;
              }

              setRawText(text);

              // 2. Tự động xử lý theo chế độ AI
              const processed = await refineTextWithAI({ text, mode: activeMode });
              const finalOutput = processed || text;
              setRefinedText(finalOutput);

              // 3. Tự động sao chép nếu bật trong cài đặt
              if (settings?.autoCopy) {
                await navigator.clipboard.writeText(finalOutput).catch(() => {});
                setCopied(true);
                toast.success('Đã nhận diện & tự động sao chép!');
              } else {
                toast.success('Đã nhận diện thành công!');
              }

              // 4. Lưu lịch sử
              if (settings?.saveHistory !== false) {
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
      toast.success(`Đã chuyển sang chế độ: ${REFINE_MODES.find(m => m.id === modeId)?.name}`);
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
          title: 'Yap Voice Note',
          text: textToShare,
        });
      } catch (err) {
        // User cancelled share
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
    <div className="space-y-4 animate-in fade-in duration-300 pb-4">
      {/* Refine Mode Selector */}
      <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100">
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
          <Wand2 className="w-3.5 h-3.5 text-teal-600" /> Chế độ xử lý giọng nói AI:
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {REFINE_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
                <span className="truncate w-full text-center">{mode.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Microphone Action Area */}
      <div className="bg-gradient-to-b from-white to-gray-50 rounded-3xl p-6 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
        {isRecording && (
          <div className="absolute inset-0 bg-red-500/5 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-red-500/10 animate-ping" />
          </div>
        )}

        {/* Big Record Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl active:scale-95 ${
            isRecording
              ? 'bg-red-500 text-white ring-8 ring-red-200 animate-pulse'
              : isProcessing
              ? 'bg-amber-500 text-white cursor-wait'
              : 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white hover:shadow-teal-500/25 hover:scale-105'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-9 h-9 animate-bounce" />
              <span className="text-[11px] font-bold mt-1 font-mono">{formatSeconds(recordingSeconds)}</span>
            </>
          ) : isProcessing ? (
            <>
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="text-[10px] font-medium mt-1">Đang xử lý</span>
            </>
          ) : (
            <>
              <Mic className="w-10 h-10" />
              <span className="text-[11px] font-bold mt-1 tracking-wide">NÓI</span>
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 mt-4 font-medium">
          {isRecording
            ? 'Đang lắng nghe... Bấm nút đỏ khi nói xong'
            : isProcessing
            ? 'AI đang chuyển đổi giọng nói & chuẩn hóa văn bản...'
            : 'Chạm để bắt đầu nói tiếng Việt'}
        </p>
      </div>

      {/* Output / Result Card */}
      {(refinedText || rawText || isProcessing) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Kết quả chuẩn hóa ({REFINE_MODES.find(m => m.id === activeMode)?.name}):
            </div>
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Xóa
            </button>
          </div>

          <textarea
            value={refinedText || rawText}
            onChange={(e) => setRefinedText(e.target.value)}
            rows={4}
            className="w-full text-sm text-gray-800 bg-transparent border-0 focus:ring-0 p-0 resize-none font-sans leading-relaxed outline-none"
            placeholder="Kết quả văn bản sẽ hiển thị ở đây..."
          />

          {rawText && refinedText !== rawText && (
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs text-gray-500">
              <div className="font-semibold text-gray-600 mb-1">Gốc từ giọng nói:</div>
              <p className="italic">{rawText}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/20'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Đã sao chép!' : 'Sao chép'}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              title="Gửi sang Zalo / Messenger"
            >
              <Share2 className="w-4 h-4" />
              <span>Gửi</span>
            </button>

            <button
              onClick={handleSpeak}
              className="flex items-center justify-center gap-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              title="Đọc phát âm"
            >
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-teal-600 animate-pulse' : ''}`} />
              <span>Đọc</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
