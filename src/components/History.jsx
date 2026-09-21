import { Copy, Volume2, Trash2, HistoryIcon, Mic, Languages } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <HistoryIcon className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm font-medium">Chưa có lịch sử gõ giọng nói hoặc dịch thuật nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
          <HistoryIcon className="w-5 h-5 text-teal-600" /> Lịch sử hoạt động
        </h2>
        <button onClick={clearAll} className="text-xs text-red-500 font-semibold hover:text-red-600">
          Xóa tất cả
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item, index) => {
          const isDictation = item.type === 'dictation' || !item.sourceLanguage;

          return (
            <div key={item.id || index} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative space-y-2">
              <div className="flex justify-between items-center">
                {isDictation ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <Mic className="w-3 h-3" /> Gõ giọng nói ({item.mode || 'Chính xác'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                    <Languages className="w-3 h-3" /> {LANGUAGES[item.sourceLanguage]?.name || item.sourceLanguage} → {LANGUAGES[item.targetLanguage]?.name || item.targetLanguage}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{item.timestamp || ''}</span>
                  <button onClick={() => handleDelete(index)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isDictation ? (
                <>
                  <p className="text-gray-900 text-sm font-medium leading-relaxed">{item.refinedText || item.rawText}</p>
                  {item.rawText && item.refinedText !== item.rawText && (
                    <p className="text-xs text-gray-400 italic">Gốc: {item.rawText}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-xs">{item.originalText}</p>
                  <p className="text-gray-900 text-sm font-semibold">{item.translatedText}</p>
                </>
              )}

              <div className="flex justify-end gap-2 pt-1 border-t border-gray-50">
                <button
                  onClick={() => handleCopy(isDictation ? (item.refinedText || item.rawText) : item.translatedText)}
                  className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Sao chép"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => speak(
                    isDictation ? (item.refinedText || item.rawText) : item.translatedText,
                    isDictation ? 'vi-VN' : LANGUAGES[item.targetLanguage]?.voice
                  )}
                  className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Đọc âm thanh"
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
