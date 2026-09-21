import { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, Mic, MicOff, Volume2, Copy, Trash2, Check, Sparkles, RefreshCw, Languages, MessagesSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LANGUAGE_PAIRS, LANGUAGES } from '../constants/languages';
import { translateText, transcribeAudioOnly } from '../services/translateService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

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

  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const { speak, isSpeaking, stop } = useSpeechSynthesis();

  // Sync when pair changes
  const handlePairChange = (newPairId) => {
    setPairId(newPairId);
    const pair = LANGUAGE_PAIRS.find(p => p.id === newPairId);
    if (pair) {
      setLang1(pair.lang1);
      setLang2(pair.lang2);
      setText1('');
      setText2('');
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
              // 1. Nhận diện giọng nói của ngôn ngữ đang nói
              const transcript = await transcribeAudioOnly({
                audioBlob,
                base64Audio,
                mimeType: mediaRecorder.mimeType,
                language: currentLangCode
              });

              if (!transcript || !transcript.trim()) {
                toast.error('Không nghe rõ âm thanh hoặc giọng nói quá nhỏ.');
                setIsTranslating(false);
                return;
              }

              // Điền vào màn hình người nói
              if (targetScreen === 'lang1') {
                setText1(transcript);
              } else {
                setText2(transcript);
              }

              // 2. Tự động dịch sang màn hình đối diện
              const sourceLangName = LANGUAGES[currentLangCode]?.englishName || currentLangCode;
              const targetLangName = LANGUAGES[otherLangCode]?.englishName || otherLangCode;

              const translated = await translateText({
                text: transcript,
                sourceLanguage: sourceLangName,
                targetLanguage: targetLangName
              });

              // Điền vào màn hình đối diện
              if (targetScreen === 'lang1') {
                setText2(translated);
              } else {
                setText1(translated);
              }

              // 3. Tự động phát âm thanh bản dịch cho người đối diện nghe
              if (settings?.autoSpeak !== false && translated) {
                speak(translated, LANGUAGES[otherLangCode]?.voice);
              }

              // 4. Lưu lịch sử
              if (settings?.saveHistory !== false) {
                const newEntry = {
                  id: Date.now(),
                  type: 'translation',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  originalText: transcript,
                  translatedText: translated,
                  sourceLanguage: currentLangCode,
                  targetLanguage: otherLangCode,
                };
                setHistory(prev => [newEntry, ...(prev || []).slice(0, 49)]);
              }

              toast.success('Dịch đàm thoại thành công!');
            } catch (err) {
              console.error(err);
              toast.error(err.message || 'Lỗi nhận diện / dịch thuật.');
            } finally {
              setIsTranslating(false);
            }
          };
        } catch (err) {
          toast.error('Lỗi mã hóa âm thanh.');
          setIsTranslating(false);
        }
      };

      mediaRecorder.start(200);
    } catch (err) {
      console.error(err);
      setActiveRecording(null);
      if (err.name === 'NotAllowedError') {
        toast.error('Vui lòng cấp quyền Micro cho trình duyệt.');
      } else {
        toast.error('Lỗi Micro: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setActiveRecording(null);
  };

  // Dịch thủ công khi người dùng gõ phím ở màn hình 1
  const handleManualTranslate1 = async () => {
    if (!text1.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText({
        text: text1,
        sourceLanguage: LANGUAGES[lang1]?.englishName,
        targetLanguage: LANGUAGES[lang2]?.englishName
      });
      setText2(res);
      if (settings?.autoSpeak !== false && res) {
        speak(res, LANGUAGES[lang2]?.voice);
      }
      toast.success('Đã dịch xong!');
    } catch (err) {
      toast.error(err.message || 'Lỗi dịch thuật.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Dịch thủ công khi người dùng gõ phím ở màn hình 2
  const handleManualTranslate2 = async () => {
    if (!text2.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText({
        text: text2,
        sourceLanguage: LANGUAGES[lang2]?.englishName,
        targetLanguage: LANGUAGES[lang1]?.englishName
      });
      setText1(res);
      if (settings?.autoSpeak !== false && res) {
        speak(res, LANGUAGES[lang1]?.voice);
      }
      toast.success('Đã dịch xong!');
    } catch (err) {
      toast.error(err.message || 'Lỗi dịch thuật.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = (text, screen) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedScreen(screen);
    toast.success('Đã sao chép!');
    setTimeout(() => setCopiedScreen(null), 2000);
  };

  const handleSpeak = (text, langCode) => {
    if (!text) return;
    if (isSpeaking) {
      stop();
    } else {
      speak(text, LANGUAGES[langCode]?.voice);
    }
  };

  const handleClearAll = () => {
    setText1('');
    setText2('');
    stop();
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8">
      {/* 1. Language Pair Selector & Controls */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex items-center justify-between gap-2">
        <select
          value={pairId}
          onChange={(e) => handlePairChange(e.target.value)}
          className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-teal-500"
        >
          {LANGUAGE_PAIRS.map(pair => (
            <option key={pair.id} value={pair.id}>{pair.name}</option>
          ))}
        </select>

        <button
          onClick={handleSwap}
          className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl transition-all active:scale-95 shadow-xs"
          title="Đổi chiều ngôn ngữ"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {(text1 || text2) && (
          <button
            onClick={handleClearAll}
            className="p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-xl transition-all"
            title="Xóa cả 2 màn hình"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. DUAL CONVERSATION SCREENS CONTAINER (Responsive 1-col mobile, 2-cols PC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SCREEN 1: Ngôn ngữ 1 (Ví dụ: Tiếng Việt) */}
        <div className={`bg-white rounded-3xl p-4 shadow-sm border transition-all duration-300 flex flex-col justify-between min-h-[220px] md:min-h-[260px] ${
          activeRecording === 'lang1' ? 'ring-4 ring-emerald-500/30 border-emerald-500 bg-emerald-50/10' : 'border-gray-100'
        }`}>
          <div>
            {/* Screen 1 Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
              <div className="flex items-center gap-1.5 font-extrabold text-sm text-gray-800">
                <span className="text-base">{LANGUAGES[lang1]?.flag}</span>
                <span>{LANGUAGES[lang1]?.name}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Màn hình 1</span>
              </div>

              <div className="flex items-center gap-1">
                {text1 && (
                  <>
                    <button
                      onClick={() => handleCopy(text1, 'screen1')}
                      className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Sao chép"
                    >
                      {copiedScreen === 'screen1' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleSpeak(text1, lang1)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Đọc âm thanh"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setText1('')}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Xóa khung này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Screen 1 Text Box */}
            <textarea
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder={`Chạm để gõ hoặc bấm nút Mic bên dưới để nói ${LANGUAGES[lang1]?.name}...`}
              rows={4}
              className="w-full text-base text-gray-800 bg-transparent border-0 focus:ring-0 p-0 resize-none font-medium leading-relaxed outline-none placeholder-gray-400"
            />
          </div>

          {/* Screen 1 Actions (Mic 1 & Translate 1) */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
            <button
              onClick={() => activeRecording === 'lang1' ? stopRecording() : startRecording('lang1')}
              disabled={isTranslating || (activeRecording && activeRecording !== 'lang1')}
              className={`flex items-center gap-2 py-2 px-4 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 ${
                activeRecording === 'lang1'
                  ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {activeRecording === 'lang1' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{activeRecording === 'lang1' ? 'ĐANG NÓI (BẤM DỪNG)' : `NÓI ${LANGUAGES[lang1]?.name.toUpperCase()}`}</span>
            </button>

            {text1 && (
              <button
                onClick={handleManualTranslate1}
                disabled={isTranslating}
                className="py-1.5 px-3 bg-gray-100 hover:bg-teal-50 text-teal-700 font-bold text-xs rounded-xl transition-all"
              >
                {isTranslating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Dịch ➔'}
              </button>
            )}
          </div>
        </div>

        {/* SCREEN 2: Ngôn ngữ 2 (Ví dụ: Tiếng Anh / Tiếng Trung) */}
        <div className={`bg-white rounded-3xl p-4 shadow-sm border transition-all duration-300 flex flex-col justify-between min-h-[220px] md:min-h-[260px] ${
          activeRecording === 'lang2' ? 'ring-4 ring-teal-500/30 border-teal-500 bg-teal-50/10' : 'border-gray-100'
        }`}>
          <div>
            {/* Screen 2 Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
              <div className="flex items-center gap-1.5 font-extrabold text-sm text-gray-800">
                <span className="text-base">{LANGUAGES[lang2]?.flag}</span>
                <span>{LANGUAGES[lang2]?.name}</span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold">Màn hình 2</span>
              </div>

              <div className="flex items-center gap-1">
                {text2 && (
                  <>
                    <button
                      onClick={() => handleCopy(text2, 'screen2')}
                      className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Sao chép"
                    >
                      {copiedScreen === 'screen2' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleSpeak(text2, lang2)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Đọc âm thanh"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setText2('')}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Xóa khung này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Screen 2 Text Box */}
            <textarea
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder={`Đối phương chạm gõ hoặc bấm Mic để nói ${LANGUAGES[lang2]?.name}...`}
              rows={4}
              className="w-full text-base text-gray-800 bg-transparent border-0 focus:ring-0 p-0 resize-none font-medium leading-relaxed outline-none placeholder-gray-400"
            />
          </div>

          {/* Screen 2 Actions (Mic 2 & Translate 2) */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
            <button
              onClick={() => activeRecording === 'lang2' ? stopRecording() : startRecording('lang2')}
              disabled={isTranslating || (activeRecording && activeRecording !== 'lang2')}
              className={`flex items-center gap-2 py-2 px-4 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 ${
                activeRecording === 'lang2'
                  ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
              }`}
            >
              {activeRecording === 'lang2' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{activeRecording === 'lang2' ? 'ĐANG NÓI (BẤM DỪNG)' : `NÓI ${LANGUAGES[lang2]?.name.toUpperCase()}`}</span>
            </button>

            {text2 && (
              <button
                onClick={handleManualTranslate2}
                disabled={isTranslating}
                className="py-1.5 px-3 bg-gray-100 hover:bg-teal-50 text-teal-700 font-bold text-xs rounded-xl transition-all"
              >
                {isTranslating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Dịch ⬅'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MIDDLE INDICATOR / LOADING BANNER */}
      {isTranslating && (
        <div className="bg-teal-600 text-white py-2.5 px-4 rounded-2xl shadow-sm text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin" /> AI đang nhận diện & dịch đàm thoại 2 chiều tức thì...
        </div>
      )}

      {/* 5. USER GUIDE CARD */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-3 border border-teal-100 text-[11px] text-teal-900 leading-relaxed">
        <div className="font-bold mb-0.5 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Hướng dẫn đàm thoại 2 chiều trực tiếp:
        </div>
        • <strong>Anh nói:</strong> Bấm nút <code className="text-emerald-700 font-bold">NÓI {LANGUAGES[lang1]?.name.toUpperCase()}</code> ở khung trên &rarr; Tự động dịch và phát loa khung dưới cho người nước ngoài nghe.
        <br />• <strong>Người nước ngoài nói:</strong> Bấm nút <code className="text-teal-700 font-bold">NÓI {LANGUAGES[lang2]?.name.toUpperCase()}</code> ở khung dưới &rarr; Tự động dịch và phát loa tiếng Việt khung trên cho anh nghe!
      </div>
    </div>
  );
}
