import { useState } from 'react';
import { LANGUAGE_PAIRS } from '../constants/languages';
import { Key, Mic, Wand2, Volume2, CheckCircle2, Eye, EyeOff, Save, Sparkles, Zap, Bot, Activity, ShieldCheck } from 'lucide-react';
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
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqLatency, setGroqLatency] = useState(null);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  // Test ping Groq latency
  const handleTestGroq = async () => {
    const key = formData.groqApiKey || (typeof settings?.groqApiKey === 'string' ? settings.groqApiKey : '');
    if (!key || !key.startsWith('gsk_')) {
      toast.error('Vui lòng nhập Groq API Key (gsk_...) trước khi kiểm tra');
      return;
    }

    setTestingGroq(true);
    const start = performance.now();
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });

      const elapsed = ((performance.now() - start) / 1000).toFixed(3);
      if (res.ok) {
        setGroqLatency(elapsed);
        toast.success(`Groq kết nối siêu tốc: ${elapsed}s!`, { icon: '⚡' });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(`Lỗi Groq: ${err.error?.message || res.statusText}`);
      }
    } catch (e) {
      toast.error('Không thể kết nối máy chủ Groq: ' + e.message);
    } finally {
      setTestingGroq(false);
    }
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    
    // Cập nhật state
    const dataToSave = {
      ...formData,
      apiKeys: [formData.groqApiKey, formData.geminiApiKey, formData.openaiApiKey].filter(Boolean).join(',')
    };

    setSettings(prev => ({ ...prev, ...dataToSave }));
    localStorage.setItem('yap-settings', JSON.stringify(dataToSave));
    localStorage.setItem('igren-settings', JSON.stringify(dataToSave));

    setSaved(true);
    toast.success('Đã lưu tất cả cài đặt & API Key thành công!', { icon: '✅' });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 animate-in fade-in duration-300 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 font-['Outfit']">
            <Key className="w-5 h-5 text-emerald-400" /> Quản Lý API & Hệ Thống
          </h2>
          <p className="text-xs text-slate-400">Cấu hình khóa dịch thuật & tùy chỉnh cá nhân</p>
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{saved ? 'ĐÃ LƯU!' : 'LƯU CÀI ĐẶT'}</span>
        </button>
      </div>

      {/* 1. Groq API Key Card */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <span>Groq AI Key (Whisper + Qwen 3.8)</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
              Khuyên dùng (0.01s)
            </span>
          </div>

          <button
            type="button"
            onClick={handleTestGroq}
            disabled={testingGroq}
            className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-[11px] font-bold transition-all"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{testingGroq ? 'Đang test...' : groqLatency ? `${groqLatency}s` : 'Kiểm tra Ping'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Mô hình tốc độ ánh sáng nhận diện giọng nói siêu chuẩn và dịch đàm thoại 2 chiều tức thì.
        </p>

        <div className="relative">
          <input
            type={showKeys.groq ? 'text' : 'password'}
            value={formData.groqApiKey}
            onChange={(e) => handleChange('groqApiKey', e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-[#1e293b]/90 border border-white/10 text-white rounded-2xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('groq')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
          >
            {showKeys.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Google Gemini API Key */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Google Gemini Key</span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 font-extrabold px-2 py-0.5 rounded-full border border-teal-500/30">
              Gemini 2.5 Flash
            </span>
          </div>

          {formData.geminiApiKey?.startsWith('AIzaSy') && (
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã nhập
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400">Dùng cho mô hình Gemini 2.5 Flash (Xử lý âm thanh đa ngữ, văn phong tự nhiên).</p>

        <div className="relative">
          <input
            type={showKeys.gemini ? 'text' : 'password'}
            value={formData.geminiApiKey}
            onChange={(e) => handleChange('geminiApiKey', e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-[#1e293b]/90 border border-white/10 text-white rounded-2xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('gemini')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
          >
            {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. OpenAI API Key */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <span>OpenAI API Key</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
              GPT-4o Mini
            </span>
          </div>

          {formData.openaiApiKey?.startsWith('sk-') && (
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã nhập
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400">Dùng cho mô hình GPT-4o Mini và Whisper OpenAI (Dự phòng thông minh).</p>

        <div className="relative">
          <input
            type={showKeys.openai ? 'text' : 'password'}
            value={formData.openaiApiKey}
            onChange={(e) => handleChange('openaiApiKey', e.target.value)}
            placeholder="sk-..."
            className="w-full bg-[#1e293b]/90 border border-white/10 text-white rounded-2xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('openai')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
          >
            {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4. Dictation & Translation Preferences */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-black text-white font-['Outfit']">
          <Wand2 className="w-4 h-4 text-emerald-400" /> Tùy Chọn Tự Động Hóa & Zalo
        </div>

        {/* Auto Copy */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-200">Tự động sao chép (Auto-Copy)</h3>
            <p className="text-[11px] text-slate-400">Nói/Dịch xong tự copy ngay vào bộ nhớ, chỉ cần sang Zalo ấn Dán</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.autoCopy}
              onChange={(e) => handleChange('autoCopy', e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 border border-white/10"></div>
          </label>
        </div>

        {/* Auto Speak */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-200">Tự động phát âm bản dịch (Auto-TTS)</h3>
            <p className="text-[11px] text-slate-400">Tự phát loa tiếng bản xứ cho đối tác nước ngoài nghe</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.autoSpeak}
              onChange={(e) => handleChange('autoSpeak', e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 border border-white/10"></div>
          </label>
        </div>

        {/* Default Pair */}
        <div className="pt-3 border-t border-white/[0.08]">
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Cặp ngôn ngữ mặc định ưu tiên</label>
          <select 
            value={formData.defaultPair}
            onChange={(e) => handleChange('defaultPair', e.target.value)}
            className="w-full bg-[#1e293b]/90 border border-white/10 text-white rounded-2xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            {LANGUAGE_PAIRS.map(pair => (
              <option key={pair.id} value={pair.id} className="bg-slate-900 text-white">{pair.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-black rounded-3xl text-sm shadow-xl shadow-emerald-500/30 active:scale-98 transition-all flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        <span>{saved ? '✅ ĐÃ LƯU TOÀN BỘ CÀI ĐẶT THÀNH CÔNG!' : '💾 LƯU CÀI ĐẶT & KHÓA API PREMIUM'}</span>
      </button>
    </form>
  );
}
