import { Copy, Volume2, Trash2, History as HistoryIcon, Mic, Languages } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { LANGUAGES } from '../constants/languages';

export default function History({ history, setHistory }) {
  const { speak } = useSpeechSynthesis();

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép vào bộ nhớ đệm!');
  };

  const handleDelete = (index) => {
    const newHistory = [...history];
    newHistory.splice(index, 1);
    setHistory(newHistory);
    toast.success('Đã xóa mục này.');
  };

  const clearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử?")) {
      setHistory([]);
      toast.success('Đã xóa sạch lịch sử.');
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-slate-500">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center mb-3">
          <HistoryIcon className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-sm font-bold text-slate-400 font-['Outfit']">Chưa có lịch sử hoạt động</p>
        <p className="text-xs text-slate-500 mt-1">Các bản gõ giọng nói và dịch thuật sẽ được lưu tự động tại đây</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
        <h2 className="text-base font-black text-white flex items-center gap-2 font-['Outfit']">
          <HistoryIcon className="w-4 h-4 text-emerald-400" /> Lịch Sử Hoạt Động Gần Đây
        </h2>
        <button onClick={clearAll} className="text-xs text-red-400 font-bold hover:text-red-300 transition-colors">
          Xóa tất cả
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item, index) => {
          const isDictation = item.type === 'dictation' || !item.sourceLang;

          return (
            <div key={item.id || index} className="bg-[#0f172a]/90 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white/[0.08] space-y-2.5">
              <div className="flex justify-between items-center">
                {isDictation ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    <Mic className="w-3 h-3" /> Gõ giọng nói ({item.mode || 'Chính xác'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                    <Languages className="w-3 h-3" /> {LANGUAGES[item.sourceLang]?.name || item.sourceLang} ➔ {LANGUAGES[item.targetLang]?.name || item.targetLang}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">{item.timestamp || ''}</span>
                  <button onClick={() => handleDelete(index)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isDictation ? (
                <>
                  <p className="text-slate-100 text-sm font-medium leading-relaxed">{item.refinedText || item.rawText}</p>
                  {item.rawText && item.refinedText !== item.rawText && (
                    <p className="text-xs text-slate-500 italic font-mono bg-slate-900/60 p-2 rounded-xl">Gốc: {item.rawText}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-xs font-medium">{item.original || item.originalText}</p>
                  <p className="text-emerald-300 text-sm font-bold">{item.translated || item.translatedText}</p>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => handleCopy(isDictation ? (item.refinedText || item.rawText) : (item.translated || item.translatedText))}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all"
                  title="Sao chép"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => speak(
                    isDictation ? (item.refinedText || item.rawText) : (item.translated || item.translatedText),
                    isDictation ? 'vi-VN' : LANGUAGES[item.targetLang]?.voice
                  )}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all"
                  title="Đọc phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
