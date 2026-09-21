import { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, Mic, MicOff, Volume2, Copy, Trash2, Check, Sparkles, RefreshCw, Languages, ClipboardCopy, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LANGUAGE_PAIRS, LANGUAGES } from '../constants/languages';
import { translateText, transcribeAudioOnly } from '../services/translateService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useClipboardListener } from '../hooks/useClipboardListener';

export default function Translator({ history, setHistory, settings }) {
  const [pairId, setPairId] = useState(settings?.defaultPair || 'vi-en');
  const currentPair = LANGUAGE_PAIRS.find(p => p.id === pairId) || LANGUAGE_PAIRS[0];

  const [lang1, setLang1] = useState(currentPair.lang1);
  const [lang2, setLang2] = useState(currentPair.lang2);

  // Text state for 2 screens
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');

  // Status
  const [activeRecording, setActiveRecording] = useState(null); // 'lang1' | 'lang2' | null
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedScreen, setCopiedScreen] = useState(null); // 'screen1' | 'screen2' | null
  const [detectedClipboard, setDetectedClipboard] = useState(null);

  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const { speak, isSpeaking, stop } = useSpeechSynthesis();

  // Clipboard Auto Listener: Tự động phát hiện khi sao chép từ Zalo/Messenger
  useClipboardListener({
    enabled: true,
    onClipboardDetected: (clipText) => {
      // Nếu chuỗi khác với nội dung đang có, gợi ý dịch nhanh
      if (clipText && clipText !== text1 && clipText !== text2 && clipText.length < 500) {
        setDetectedClipboard(clipText);
      }
    }
  });

  // Sync when pair changes
  const handlePairChange = (newPairId) => {
    setPairId(newPairId);
    const pair = LANGUAGE_PAIRS.find(p => p.id === newPairId);
    if (pair) {
      setLang1(pair.lang1);
      setLang2(pair.lang2);
      setText1('');
      setText2('');
      setDetectedClipboard(null);
    }
  };

  // Swap 2 languages
  const handleSwap = () => {
    const tempLang = lang1;
    const tempText = text1;
    setLang1(lang2);
    setLang2(tempLang);
    setText1(text2);
    setText2(tempText);
  };

  // Start recording for a specific language screen (lang1 or lang2)
  const startRecording = async (targetScreen) => {
    try {
      stop();
      setActiveRecording(targetScreen);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setActiveRecording(null);
        setIsTranslating(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1];
            const currentLangCode = targetScreen === 'lang1' ? lang1 : lang2;
            const otherLangCode = targetScreen === 'lang1' ? lang2 : lang1;

            try {
              // 1. Nhận diện giọng nói của màn hình đang nói
              const transcript = await transcribeAudioOnly({
                audioBlob,
                base64Audio,
                mimeType: mediaRecorder.mimeType,
                language: currentLangCode
              });

              if (!transcript || !transcript.trim()) {
                toast.error('Không nghe rõ âm thanh, vui lòng nói lại.');
                setIsTranslating(false);
                return;
              }

              // 2. Điền text vào màn hình nói
              if (targetScreen === 'lang1') {
                setText1(transcript);
              } else {
                setText2(transcript);
              }

              // 3. Tự động dịch sang màn hình đối diện
              const translatedResult = await translateText(transcript, currentLangCode, otherLangCode);

              if (targetScreen === 'lang1') {
                setText2(translatedResult);
              } else {
                setText1(translatedResult);
              }

              // 4. Lưu lịch sử hội thoại
              if (setHistory) {
                setHistory(prev => [{
                  id: Date.now(),
                  type: 'translate_dual',
                  sourceLang: currentLangCode,
                  targetLang: otherLangCode,
                  original: transcript,
                  translated: translatedResult,
                  timestamp: new Date().toISOString()
                }, ...prev.slice(0, 49)]);
              }

              // 5. Tự động sao chép câu dịch để tiện gửi Zalo nếu bật autoCopy
              if (settings?.autoCopy !== false) {
                navigator.clipboard.writeText(translatedResult);
                toast.success('Đã tự động dịch & Copy sẵn vào bộ nhớ!', { icon: '📋' });
              }

              // 6. Tự động phát âm thanh ngôn ngữ đích
              if (settings?.autoSpeak !== false) {
                speak(translatedResult, otherLangCode);
              }

            } catch (err) {
              console.error('Translation error:', err);
              toast.error('Lỗi nhận diện hoặc dịch thuật: ' + (err.message || 'Kiểm tra lại API Key'));
            } finally {
              setIsTranslating(false);
            }
          };
        } catch (err) {
          console.error('Audio processing error:', err);
          setIsTranslating(false);
        }
      };

      mediaRecorder.start(1000);
      toast.success(`Đang nghe ${LANGUAGES[targetScreen === 'lang1' ? lang1 : lang2]?.name}...`, { duration: 1500 });
    } catch (err) {
      console.error('Microphone error:', err);
      setActiveRecording(null);
      toast.error('Không thể truy cập Microphone. Vui lòng cấp quyền micro.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Dịch thủ công từ Khung 1 sang Khung 2
  const handleManualTranslate1 = async () => {
    if (!text1.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText(text1, lang1, lang2);
      setText2(res);
      if (settings?.autoCopy !== false) {
        navigator.clipboard.writeText(res);
        toast.success('Đã dịch và tự sao chép bản dịch!', { icon: '📋' });
      }
      if (settings?.autoSpeak !== false) speak(res, lang2);
    } catch (err) {
      toast.error(err.message || 'Lỗi dịch thuật');
    } finally {
      setIsTranslating(false);
    }
  };

  // Dịch thủ công từ Khung 2 sang Khung 1
  const handleManualTranslate2 = async () => {
    if (!text2.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText(text2, lang2, lang1);
      setText1(res);
      if (settings?.autoCopy !== false) {
        navigator.clipboard.writeText(res);
        toast.success('Đã dịch và tự sao chép bản dịch!', { icon: '📋' });
      }
      if (settings?.autoSpeak !== false) speak(res, lang1);
    } catch (err) {
      toast.error(err.message || 'Lỗi dịch thuật');
    } finally {
      setIsTranslating(false);
    }
  };

  // Áp dụng đoạn vừa sao chép từ Zalo
  const handleApplyClipboard = (target) => {
    if (!detectedClipboard) return;
    if (target === 'screen1') {
      setText1(detectedClipboard);
      setDetectedClipboard(null);
      setTimeout(handleManualTranslate1, 100);
    } else {
      setText2(detectedClipboard);
      setDetectedClipboard(null);
      setTimeout(handleManualTranslate2, 100);
    }
  };

  const handleCopy = (text, screenName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedScreen(screenName);
    toast.success('Đã sao chép văn bản!');
    setTimeout(() => setCopiedScreen(null), 2000);
  };

  const handleSpeak = (text, langCode) => {
    if (!text) return;
    speak(text, langCode);
  };

  const handleClearAll = () => {
    setText1('');
    setText2('');
    stop();
    setDetectedClipboard(null);
    toast.success('Đã làm mới 2 màn hình');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {/* 1. SELECT LANGUAGE PAIR & CONTROL BAR */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-3.5 border border-white/[0.08] shadow-xl flex items-center justify-between gap-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block mb-1">
            Cặp Ngôn Ngữ Hội Thoại
          </label>
          <div className="relative">
            <select
              value={pairId}
              onChange={(e) => handlePairChange(e.target.value)}
              className="w-full bg-[#1e293b]/90 border border-white/10 rounded-2xl py-2 px-3 text-white font-bold text-xs sm:text-sm appearance-none outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer pr-8"
            >
              {LANGUAGE_PAIRS.map((pair) => (
                <option key={pair.id} value={pair.id} className="bg-slate-900 text-white py-2">
                  {pair.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>
        </div>

        <button
          onClick={handleSwap}
          className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl transition-all active:scale-90 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-4"
          title="Đảo chiều 2 ngôn ngữ"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {(text1 || text2) && (
          <button
            onClick={handleClearAll}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl transition-all active:scale-90 mt-4"
            title="Xóa trắng 2 màn hình"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. POP-UP SMART CLIPBOARD DETECTOR (HỖ TRỢ CHAT ZALO/MESSENGER) */}
      {detectedClipboard && (
        <div className="bg-gradient-to-r from-teal-950/90 via-slate-900/90 to-emerald-950/90 backdrop-blur-xl border border-emerald-500/40 rounded-3xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <ClipboardCopy className="w-4 h-4 animate-bounce" />
            </div>
            <div className="truncate">
              <div className="text-[11px] font-bold text-emerald-300">Phát hiện tin nhắn vừa sao chép từ Zalo:</div>
              <div className="text-xs text-slate-300 truncate font-mono italic">"{detectedClipboard}"</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleApplyClipboard('screen1')}
              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl shadow transition-all active:scale-95"
            >
              Dịch sang {LANGUAGES[lang2]?.name}
            </button>
            <button
              onClick={() => setDetectedClipboard(null)}
              className="p-1 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. DUAL CONVERSATION SCREENS (RESPONSIVE GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* SCREEN 1: Ngôn ngữ 1 (Ví dụ: 🇻🇳 Tiếng Việt) */}
        <div className={`rounded-3xl p-4 transition-all duration-300 flex flex-col justify-between min-h-[240px] md:min-h-[280px] ${
          activeRecording === 'lang1'
            ? 'bg-emerald-950/30 border-2 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
            : 'bg-[#0f172a]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl'
        }`}>
          <div>
            {/* Header Screen 1 */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-white">
                <span className="text-lg">{LANGUAGES[lang1]?.flag}</span>
                <span className="font-['Outfit'] tracking-wide">{LANGUAGES[lang1]?.name}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Màn hình 1
                </span>
              </div>

              <div className="flex items-center gap-1">
                {text1 && (
                  <>
                    <button
                      onClick={() => handleCopy(text1, 'screen1')}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Sao chép"
                    >
                      {copiedScreen === 'screen1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleSpeak(text1, lang1)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Đọc âm thanh"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setText1('')}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Xóa khung này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Textarea Screen 1 */}
            <textarea
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder={`Chạm gõ hoặc bấm nút Mic bên dưới để nói ${LANGUAGES[lang1]?.name}...`}
              rows={4}
              className="w-full text-base sm:text-lg text-slate-100 bg-transparent border-0 focus:ring-0 p-0 resize-none font-medium leading-relaxed outline-none placeholder-slate-500"
            />
          </div>

          {/* Sound Wave Animation on Active */}
          {activeRecording === 'lang1' && (
            <div className="flex items-center justify-center gap-1.5 py-2">
              <div className="w-1.5 bg-emerald-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-emerald-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-emerald-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-emerald-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-emerald-400 rounded-full soundwave-bar"></div>
              <span className="text-xs text-emerald-400 font-bold ml-2 animate-pulse">Đang lắng nghe giọng nói...</span>
            </div>
          )}

          {/* Actions Screen 1 */}
          <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] mt-2">
            <button
              onClick={() => activeRecording === 'lang1' ? stopRecording() : startRecording('lang1')}
              disabled={isTranslating || (activeRecording && activeRecording !== 'lang1')}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-lg ${
                activeRecording === 'lang1'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white ring-4 ring-red-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
              }`}
            >
              {activeRecording === 'lang1' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{activeRecording === 'lang1' ? 'ĐANG NÓI (BẤM DỪNG)' : `NÓI ${LANGUAGES[lang1]?.name.toUpperCase()}`}</span>
            </button>

            {text1 && (
              <button
                onClick={handleManualTranslate1}
                disabled={isTranslating}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-2xl transition-all shadow"
              >
                {isTranslating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><span>Dịch sang</span><Send className="w-3.5 h-3.5" /></>}
              </button>
            )}
          </div>
        </div>

        {/* SCREEN 2: Ngôn ngữ 2 (Ví dụ: 🇺🇸 Tiếng Anh / 🇨🇳 Tiếng Trung) */}
        <div className={`rounded-3xl p-4 transition-all duration-300 flex flex-col justify-between min-h-[240px] md:min-h-[280px] ${
          activeRecording === 'lang2'
            ? 'bg-cyan-950/30 border-2 border-cyan-500/80 shadow-[0_0_30px_rgba(14,165,233,0.3)]'
            : 'bg-[#0f172a]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl'
        }`}>
          <div>
            {/* Header Screen 2 */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-white">
                <span className="text-lg">{LANGUAGES[lang2]?.flag}</span>
                <span className="font-['Outfit'] tracking-wide">{LANGUAGES[lang2]?.name}</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                  Màn hình 2
                </span>
              </div>

              <div className="flex items-center gap-1">
                {text2 && (
                  <>
                    <button
                      onClick={() => handleCopy(text2, 'screen2')}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Sao chép"
                    >
                      {copiedScreen === 'screen2' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleSpeak(text2, lang2)}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Đọc âm thanh"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setText2('')}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Xóa khung này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Textarea Screen 2 */}
            <textarea
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder={`Đối phương chạm gõ hoặc bấm Mic để nói ${LANGUAGES[lang2]?.name}...`}
              rows={4}
              className="w-full text-base sm:text-lg text-slate-100 bg-transparent border-0 focus:ring-0 p-0 resize-none font-medium leading-relaxed outline-none placeholder-slate-500"
            />
          </div>

          {/* Sound Wave Animation on Active */}
          {activeRecording === 'lang2' && (
            <div className="flex items-center justify-center gap-1.5 py-2">
              <div className="w-1.5 bg-cyan-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-cyan-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-cyan-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-cyan-400 rounded-full soundwave-bar"></div>
              <div className="w-1.5 bg-cyan-400 rounded-full soundwave-bar"></div>
              <span className="text-xs text-cyan-400 font-bold ml-2 animate-pulse">Đang lắng nghe đối phương...</span>
            </div>
          )}

          {/* Actions Screen 2 */}
          <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] mt-2">
            <button
              onClick={() => activeRecording === 'lang2' ? stopRecording() : startRecording('lang2')}
              disabled={isTranslating || (activeRecording && activeRecording !== 'lang2')}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-lg ${
                activeRecording === 'lang2'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white ring-4 ring-red-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/25'
              }`}
            >
              {activeRecording === 'lang2' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{activeRecording === 'lang2' ? 'ĐANG NÓI (BẤM DỪNG)' : `NÓI ${LANGUAGES[lang2]?.name.toUpperCase()}`}</span>
            </button>

            {text2 && (
              <button
                onClick={handleManualTranslate2}
                disabled={isTranslating}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold text-xs rounded-2xl transition-all shadow"
              >
                {isTranslating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><span>Dịch ngược</span><Send className="w-3.5 h-3.5" /></>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. LOADING INDICATOR */}
      {isTranslating && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-3xl shadow-xl text-center text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse border border-emerald-400/40">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>AI đang nhận diện & dịch đàm thoại 2 chiều tức thì (0.01s)...</span>
        </div>
      )}

      {/* 5. USER GUIDE LUXURY BANNER */}
      <div className="bg-[#0f172a]/60 backdrop-blur-md rounded-3xl p-4 border border-white/[0.06] text-xs text-slate-300 leading-relaxed">
        <div className="font-extrabold text-white mb-1.5 flex items-center gap-1.5 font-['Outfit']">
          <Sparkles className="w-4 h-4 text-amber-400" /> Hướng Dẫn Đàm Thoại & Chat Zalo Trực Tiếp:
        </div>
        <div className="space-y-1 text-slate-400">
          <p>• <strong>Anh nói:</strong> Bấm <span className="text-emerald-400 font-bold">NÓI {LANGUAGES[lang1]?.name.toUpperCase()}</span> &rarr; Tự dịch sang {LANGUAGES[lang2]?.name}, phát loa và copy sẵn để anh dán vào Zalo.</p>
          <p>• <strong>Khách nhắn Zalo:</strong> Anh chỉ cần <span className="text-amber-400 font-bold">Sao chép (Copy)</span> ở Zalo &rarr; Mở YAP AI để xem ngay bản dịch tiếng Việt!</p>
        </div>
      </div>
    </div>
  );
}
