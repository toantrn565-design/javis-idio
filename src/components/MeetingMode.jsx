import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, FileText, Download, Copy, Check, Sparkles, 
  Volume2, RefreshCw, Trash2, Clock, Users, Mic, Laptop, Globe, AlertCircle, ChevronDown
} from 'lucide-react';
import { LANGUAGES } from '../constants/languages';
import { translateText, generateMeetingSummary } from '../services/translateService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { toast } from 'react-hot-toast';

export default function MeetingMode({ settings }) {
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [meetingSeconds, setMeetingSeconds] = useState(0);
  
  // Language settings
  const [sourceLang, setSourceLang] = useState('vi');
  const [targetLang, setTargetLang] = useState('en');

  // Audio source: 'mic' or 'system'
  const [audioSource, setAudioSource] = useState('mic');

  // Transcripts list: [{ id, timestamp, timeStr, originalText, translatedText, isTranslating }]
  const [transcripts, setTranscripts] = useState([]);
  const [interimText, setInterimText] = useState('');

  // Meeting Minutes Modal State
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // References
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptsEndRef = useRef(null);
  const isMeetingActiveRef = useRef(false);
  const isPausedRef = useRef(false);

  const { speak, isSpeaking, stop: stopTTS } = useSpeechSynthesis();

  // Sync refs with states for event listeners
  useEffect(() => {
    isMeetingActiveRef.current = isMeetingActive;
  }, [isMeetingActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Meeting timer
  useEffect(() => {
    if (isMeetingActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setMeetingSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isMeetingActive, isPaused]);

  // Auto scroll to bottom
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimText]);

  // Format seconds to hh:mm:ss
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Process a finalized sentence
  const processSentence = async (text, currentSec) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    const timeStr = formatTime(currentSec);
    const newItemId = Date.now() + Math.random();

    // Append to list immediately with isTranslating = true
    setTranscripts(prev => [
      ...prev,
      {
        id: newItemId,
        timestamp: currentSec,
        timeStr,
        originalText: cleanText,
        translatedText: '',
        isTranslating: true
      }
    ]);

    // Translate sentence via AI
    try {
      const translated = await translateText(cleanText, sourceLang, targetLang);
      setTranscripts(prev => prev.map(item => {
        if (item.id === newItemId) {
          return { ...item, translatedText: translated, isTranslating: false };
        }
        return item;
      }));
    } catch (e) {
      console.error('Translation error in meeting:', e);
      setTranscripts(prev => prev.map(item => {
        if (item.id === newItemId) {
          return { ...item, translatedText: '[Lỗi dịch hoặc hết quota]', isTranslating: false };
        }
        return item;
      }));
    }
  };

  // Start Meeting
  const startMeeting = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Trình duyệt không hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = sourceLang === 'vi' ? 'vi-VN' : sourceLang === 'en' ? 'en-US' : sourceLang === 'zh' ? 'zh-CN' : sourceLang === 'ja' ? 'ja-JP' : sourceLang === 'ko' ? 'ko-KR' : 'vi-VN';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            processSentence(transcriptChunk, meetingSeconds);
          } else {
            interim += transcriptChunk;
          }
        }
        setInterimText(interim);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error in meeting:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Quyền Microphone bị từ chối.');
          stopMeeting();
        }
      };

      recognition.onend = () => {
        // Auto-restart if meeting is still active and not paused
        if (isMeetingActiveRef.current && !isPausedRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsMeetingActive(true);
      setIsPaused(false);
      toast.success('Đã bắt đầu phòng họp trực tiếp!', { icon: '🎙️' });
    } catch (err) {
      console.error('Start meeting error:', err);
      toast.error('Không thể khởi động Microphone cho phòng họp: ' + err.message);
    }
  };

  // Pause Meeting
  const togglePause = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      try {
        recognitionRef.current?.start();
      } catch (e) {}
      toast.success('Đã tiếp tục cuộc họp');
    } else {
      // Pause
      setIsPaused(true);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      toast('Đã tạm dừng cuộc họp', { icon: '⏸️' });
    }
  };

  // End / Stop Meeting
  const stopMeeting = () => {
    setIsMeetingActive(false);
    setIsPaused(false);
    setInterimText('');
    try {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    } catch (e) {}
    toast('Cuộc họp đã kết thúc. Anh có thể bấm "Tạo Biên Bản Họp AI".', { icon: '⏹️', duration: 4000 });
  };

  // Generate AI Meeting Minutes
  const handleCreateMeetingMinutes = async () => {
    if (transcripts.length === 0) {
      toast.error('Chưa có nội dung lời thoại nào trong phòng họp!');
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryModalOpen(true);
    setMeetingSummary('');

    try {
      const fullTranscriptText = transcripts.map(t => `[${t.timeStr}] ${t.originalText} (Bản dịch: ${t.translatedText || 'N/A'})`).join('\n');
      const durationStr = formatTime(meetingSeconds);
      
      const summaryResult = await generateMeetingSummary({
        transcriptText: fullTranscriptText,
        meetingDuration: durationStr,
        targetLang: 'vi'
      });

      setMeetingSummary(summaryResult);
      toast.success('Đã tạo Biên bản họp AI thành công!', { icon: '📋' });
    } catch (err) {
      console.error('Summary error:', err);
      toast.error(err.message || 'Lỗi tạo biên bản họp AI');
      setMeetingSummary('⚠️ Không thể tạo biên bản họp: ' + err.message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Copy full transcripts
  const handleCopyTranscripts = () => {
    if (transcripts.length === 0) return;
    const text = transcripts.map(t => `[${t.timeStr}]\n- Gốc: ${t.originalText}\n- Dịch: ${t.translatedText}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép toàn bộ bản ghi cuộc họp!', { icon: '📋' });
  };

  // Copy meeting minutes
  const handleCopyMinutes = () => {
    if (!meetingSummary) return;
    navigator.clipboard.writeText(meetingSummary);
    setCopiedSummary(true);
    toast.success('Đã sao chép Biên bản họp sang bộ nhớ!', { icon: '📋' });
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Download meeting minutes file
  const handleDownloadMinutes = () => {
    if (!meetingSummary) return;
    const element = document.createElement('a');
    const file = new Blob([meetingSummary], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Bien_Ban_Hop_JAVIS_Idio_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Clear meeting
  const handleClearMeeting = () => {
    if (isMeetingActive) {
      stopMeeting();
    }
    setTranscripts([]);
    setMeetingSeconds(0);
    setInterimText('');
    toast.success('Đã làm mới phòng họp');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20 max-w-5xl mx-auto">
      {/* 1. Header & Controls Card */}
      <div className="bg-[#0f172a]/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Title & Live Timer */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black ${isMeetingActive && !isPaused ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
                <Users className="w-5 h-5" />
              </div>
              {isMeetingActive && !isPaused && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-['Outfit']">Phòng Họp AI (Meeting Mode)</h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isMeetingActive ? (isPaused ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30') : 'bg-slate-800 text-slate-400'}`}>
                  {isMeetingActive ? (isPaused ? 'TẠM DỪNG' : '🔴 ĐANG HỌP LIVE') : 'SẴN SÀNG'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white font-bold text-sm">{formatTime(meetingSeconds)}</span>
                <span>• {transcripts.length} đoạn thoại</span>
              </div>
            </div>
          </div>

          {/* Right: Language Pickers */}
          <div className="flex items-center gap-2 bg-[#1e293b]/80 p-1.5 rounded-2xl border border-white/10 text-xs">
            <div className="flex items-center gap-1 px-2">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                disabled={isMeetingActive}
                className="bg-transparent text-white font-bold outline-none cursor-pointer disabled:opacity-50"
              >
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <option key={code} value={code} className="bg-slate-900 text-white">{lang.flag} {lang.name}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-500">&rarr;</span>
            <div className="flex items-center gap-1 px-2">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={isMeetingActive}
                className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer disabled:opacity-50"
              >
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <option key={code} value={code} className="bg-slate-900 text-white">{lang.flag} {lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {!isMeetingActive ? (
              <button
                onClick={startMeeting}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> BẮT ĐẦU CUỘC HỌP
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className={`px-4 py-2.5 font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${isPaused ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'}`}
                >
                  {isPaused ? <Play className="w-4 h-4 fill-emerald-400" /> : <Pause className="w-4 h-4" />}
                  {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                </button>

                <button
                  onClick={stopMeeting}
                  className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-rose-300" /> Kết thúc
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateMeetingMinutes}
              disabled={transcripts.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> TẠO BIÊN BẢN HỌP AI
            </button>

            <button
              onClick={handleCopyTranscripts}
              disabled={transcripts.length === 0}
              title="Sao chép toàn bộ lời thoại"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-2xl border border-white/10 transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={handleClearMeeting}
              title="Xóa làm mới phòng họp"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-2xl border border-white/10 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live Subtitles & Transcript Stream */}
      <div className="bg-[#0b1120]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/[0.08] shadow-2xl min-h-[420px] max-h-[600px] flex flex-col justify-between overflow-hidden">
        {transcripts.length === 0 && !interimText ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-500">
              <Users className="w-8 h-8 text-emerald-400/60" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Chưa có nội dung cuộc họp</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Bấm <strong>"BẮT ĐẦU CUỘC HỌP"</strong> để hệ thống tự động ghi âm liên tục, phiên dịch song ngữ thời gian thực và tự động tạo Biên bản họp tổng hợp.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
            {transcripts.map((t) => (
              <div 
                key={t.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#141e33]/90 border border-white/[0.06] hover:border-emerald-500/30 transition-all space-y-2 animate-in slide-in-from-bottom-2"
              >
                {/* Header item: Timestamp + TTS */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded-lg border border-white/5 font-bold text-emerald-400">
                    ⏱️ {t.timeStr}
                  </span>
                  
                  {t.translatedText && (
                    <button
                      onClick={() => speak(t.translatedText, targetLang)}
                      className="p-1 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Nghe phát âm bản dịch"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Spoken original */}
                <p className="text-sm font-medium text-white leading-relaxed">
                  {t.originalText}
                </p>

                {/* Translated bilingual text */}
                <div className="pt-1.5 border-t border-white/5">
                  {t.isTranslating ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang dịch song ngữ siêu tốc...
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-semibold text-emerald-300 leading-relaxed">
                      &rarr; {t.translatedText}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Interim live words while speaking */}
            {interimText && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs italic animate-pulse flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>Đang nghe: "{interimText}"</span>
              </div>
            )}
            <div ref={transcriptsEndRef} />
          </div>
        )}
      </div>

      {/* 3. Modal Biên Bản Họp AI (Meeting Minutes Modal) */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-[#0f172a] border border-amber-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base font-['Outfit']">Biên Bản Cuộc Họp AI (Meeting Minutes)</h3>
                  <p className="text-xs text-slate-400">Tự động tổng hợp mục tiêu, quyết định & to-do list</p>
                </div>
              </div>

              <button
                onClick={() => setSummaryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-slate-200 space-y-4 custom-scrollbar">
              {isGeneratingSummary ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-sm font-bold text-white">AI đang phân tích toàn bộ lời thoại cuộc họp...</p>
                  <p className="text-xs text-slate-400 max-w-sm">Trích xuất mục tiêu, các ý kiến cốt lõi, thỏa thuận và lập bảng phân công công việc.</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans bg-[#090d16] p-4 rounded-2xl border border-white/10">
                  {meetingSummary}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#0b1120] flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-400 font-mono">
                {transcripts.length} đoạn thoại • Thời lượng: {formatTime(meetingSeconds)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadMinutes}
                  disabled={!meetingSummary || isGeneratingSummary}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" /> Tải File (.md)
                </button>

                <button
                  onClick={handleCopyMinutes}
                  disabled={!meetingSummary || isGeneratingSummary}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-40"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSummary ? 'Đã sao chép' : 'Sao chép biên bản (Gửi Zalo)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
