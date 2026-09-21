import { useState } from 'react';
import { LANGUAGE_PAIRS } from '../constants/languages';
import { Key, Mic, Wand2, Volume2, Bookmark, CheckCircle2, Eye, EyeOff, Save, Sparkles, Zap, Bot } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Settings({ settings, setSettings }) {
  const [formData, setFormData] = useState({
    groqApiKey: settings.groqApiKey || '',
    geminiApiKey: settings.geminiApiKey || '',
    openaiApiKey: settings.openaiApiKey || '',
    autoCopy: settings.autoCopy !== false,
    defaultRefineMode: settings.defaultRefineMode || 'exact',
    defaultPair: settings.defaultPair || 'vi-en',
    autoSpeak: settings.autoSpeak !== false,
    saveHistory: settings.saveHistory !== false,
  });

  const [showKeys, setShowKeys] = useState({
    groq: false,
    gemini: false,
    openai: false
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    
    // Cập nhật state chung
    setSettings(prev => ({
      ...prev,
      ...formData,
      // Ghép apiKeys tổng hợp để tương thích ngược
      apiKeys: [formData.groqApiKey, formData.geminiApiKey, formData.openaiApiKey].filter(Boolean).join(',')
    }));

    // Lưu trực tiếp vào LocalStorage đảm bảo an toàn tuyệt đối
    const dataToSave = {
      ...formData,
      apiKeys: [formData.groqApiKey, formData.geminiApiKey, formData.openaiApiKey].filter(Boolean).join(',')
    };
    localStorage.setItem('yap-settings', JSON.stringify(dataToSave));
    localStorage.setItem('igren-settings', JSON.stringify(dataToSave));

    setSaved(true);
    toast.success('Đã lưu tất cả cài đặt & API Key thành công!');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Key className="w-5 h-5 text-teal-600" /> Cài đặt API Key
        </h2>
        <button
          type="submit"
          className="flex items-center gap-1.5 py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{saved ? 'Đã lưu!' : 'Lưu cài đặt'}</span>
        </button>
      </div>

      {/* 1. Groq API Key */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-gray-800">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Groq AI Key</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded-md border border-amber-200">Khuyên dùng - Siêu nhanh</span>
          </div>
          {formData.groqApiKey?.startsWith('gsk_') && (
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết nối
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Dùng để nhận diện giọng nói siêu nhanh (Whisper Large V3) và xử lý văn bản AI tốc độ cao.</p>
        <div className="relative">
          <input
            type={showKeys.groq ? 'text' : 'password'}
            value={formData.groqApiKey}
            onChange={(e) => handleChange('groqApiKey', e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('groq')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {showKeys.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Google Gemini API Key */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-gray-800">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Google Gemini Key</span>
            <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded-md border border-teal-200">Gemini 2.5 Flash</span>
          </div>
          {formData.geminiApiKey?.startsWith('AIzaSy') && (
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết nối
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Dùng cho mô hình Google Gemini 2.5 Flash (Xử lý âm thanh đa ngôn ngữ, dịch hội thoại 2 chiều).</p>
        <div className="relative">
          <input
            type={showKeys.gemini ? 'text' : 'password'}
            value={formData.geminiApiKey}
            onChange={(e) => handleChange('geminiApiKey', e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('gemini')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. OpenAI API Key */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-gray-800">
            <Bot className="w-4 h-4 text-emerald-600" />
            <span>OpenAI API Key</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">GPT-4o Mini</span>
          </div>
          {formData.openaiApiKey?.startsWith('sk-') && (
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết nối
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Dùng cho mô hình ChatGPT (GPT-4o-mini & Whisper-1).</p>
        <div className="relative">
          <input
            type={showKeys.openai ? 'text' : 'password'}
            value={formData.openaiApiKey}
            onChange={(e) => handleChange('openaiApiKey', e.target.value)}
            placeholder="sk-..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('openai')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dictation Settings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Mic className="w-4 h-4 text-teal-600" /> Tùy chọn Gõ giọng nói
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-800">Tự động sao chép (Auto-Copy)</h3>
            <p className="text-xs text-gray-500">Nói xong tự copy, chỉ cần sang Zalo/App khác bấm Dán</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.autoCopy}
              onChange={(e) => handleChange('autoCopy', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Chế độ AI chuẩn hóa mặc định</label>
          <select
            value={formData.defaultRefineMode}
            onChange={(e) => handleChange('defaultRefineMode', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="exact">✍️ Chính xác (Chỉ sửa chính tả & dấu câu)</option>
            <option value="work">💼 Công việc (Chuẩn mực, chuyên nghiệp)</option>
            <option value="summary">📋 Tóm tắt (Gạch đầu dòng ý chính)</option>
            <option value="message">💬 Tin nhắn (Lịch sự, ngắn gọn)</option>
            <option value="english">🌐 Dịch sang Tiếng Anh</option>
          </select>
        </div>
      </div>

      {/* Translation Settings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Wand2 className="w-4 h-4 text-teal-600" /> Tùy chọn Dịch thuật
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Cặp ngôn ngữ dịch mặc định</label>
          <select 
            value={formData.defaultPair}
            onChange={(e) => handleChange('defaultPair', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          >
            {LANGUAGE_PAIRS.map(pair => (
              <option key={pair.id} value={pair.id}>{pair.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <h3 className="text-sm font-medium text-gray-800">Tự động phát âm bản dịch</h3>
            <p className="text-xs text-gray-500">Phát âm thanh giọng bản xứ sau khi dịch</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.autoSpeak}
              onChange={(e) => handleChange('autoSpeak', e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
      </div>

      {/* Big Save Button at Bottom */}
      <button
        type="submit"
        className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-teal-600/25 active:scale-98 transition-all flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        <span>{saved ? '✅ ĐÃ LƯU CÀI ĐẶT THÀNH CÔNG!' : '💾 LƯU CÀI ĐẶT & KHÓA API'}</span>
      </button>
    </form>
  );
}
