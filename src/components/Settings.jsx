import { useState } from 'react';
import { LANGUAGE_PAIRS } from '../constants/languages';
import { Key, Wand2, CheckCircle2, Eye, EyeOff, Save, Sparkles, Zap, Bot, Activity, ShieldCheck, RefreshCw, ExternalLink, Globe, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { callGeminiContent, callGroqChat, callOpenRouterChat, GEMINI_FREE_MODELS, GEMINI_PAID_MODELS } from '../services/translateService';

export default function Settings({ settings, setSettings }) {
  const [formData, setFormData] = useState({
    geminiApiKey: settings.geminiApiKey || '',
    groqApiKey: settings.groqApiKey || '',
    openrouterApiKey: settings.openrouterApiKey || '',
    openaiApiKey: settings.openaiApiKey || '',
    geminiPaidApiKey: settings.geminiPaidApiKey || '',
    autoCopy: settings.autoCopy !== false,
    defaultRefineMode: settings.defaultRefineMode || 'exact',
    defaultPair: settings.defaultPair || 'vi-en',
    autoSpeak: settings.autoSpeak !== false,
    saveHistory: settings.saveHistory !== false,
  });

  const [showKeys, setShowKeys] = useState({
    gemini: false,
    groq: false,
    openrouter: false,
    openai: false,
    geminiPaid: false
  });

  const [saved, setSaved] = useState(false);
  const [testingStatus, setTestingStatus] = useState({});

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  // Kiểm tra từng API Key trực tiếp
  const handleTestKey = async (provider) => {
    setTestingStatus(prev => ({ ...prev, [provider]: 'testing' }));
    const start = performance.now();

    try {
      if (provider === 'gemini') {
        const key = formData.geminiApiKey?.trim();
        if (!key) throw new Error('Vui lòng nhập khóa Gemini Free trước khi test');
        
        await callGeminiContent(key, { contents: [{ parts: [{ text: 'Ping' }] }] }, GEMINI_FREE_MODELS);
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        toast.success(`Google Gemini Free hoạt động tốt (${elapsed}s)!`, { icon: '✨' });
        setTestingStatus(prev => ({ ...prev, gemini: `${elapsed}s OK` }));
      } 
      else if (provider === 'geminiPaid') {
        const key = formData.geminiPaidApiKey?.trim();
        if (!key) throw new Error('Vui lòng nhập khóa Gemini Trả Phí trước khi test');
        
        await callGeminiContent(key, { contents: [{ parts: [{ text: 'Ping' }] }] }, GEMINI_PAID_MODELS);
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        toast.success(`Google Gemini Paid (Pro/Flash) hoạt động cực mạnh (${elapsed}s)!`, { icon: '👑' });
        setTestingStatus(prev => ({ ...prev, geminiPaid: `${elapsed}s OK` }));
      }
      else if (provider === 'groq') {
        const key = formData.groqApiKey?.trim();
        if (!key) throw new Error('Vui lòng nhập khóa Groq trước khi test');
        await callGroqChat(key, [{ role: 'user', content: 'Ping' }], 0.1);
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        toast.success(`Groq AI siêu tốc (${elapsed}s)!`, { icon: '⚡' });
        setTestingStatus(prev => ({ ...prev, groq: `${elapsed}s OK` }));
      }
      else if (provider === 'openrouter') {
        const key = formData.openrouterApiKey?.trim();
        if (!key) throw new Error('Vui lòng nhập khóa OpenRouter trước khi test');
        await callOpenRouterChat(key, [{ role: 'user', content: 'Ping' }], 0.1);
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        toast.success(`OpenRouter DeepSeek hoạt động tốt (${elapsed}s)!`, { icon: '🌐' });
        setTestingStatus(prev => ({ ...prev, openrouter: `${elapsed}s OK` }));
      }
      else if (provider === 'openai') {
        const key = formData.openaiApiKey?.trim();
        if (!key) throw new Error('Vui lòng nhập khóa OpenAI trước khi test');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Ping' }], max_tokens: 5 })
        });
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        if (res.ok) {
          toast.success(`OpenAI GPT-4o Mini hoạt động tốt (${elapsed}s)!`, { icon: '🤖' });
          setTestingStatus(prev => ({ ...prev, openai: `${elapsed}s OK` }));
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Lỗi HTTP ${res.status}`);
        }
      }
    } catch (e) {
      toast.error(`${provider.toUpperCase()} lỗi: ${e.message}`);
      setTestingStatus(prev => ({ ...prev, [provider]: 'Lỗi' }));
    }
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    
    const dataToSave = {
      ...formData,
      apiKeys: [formData.geminiPaidApiKey, formData.geminiApiKey, formData.groqApiKey, formData.openrouterApiKey, formData.openaiApiKey].filter(Boolean).join(',')
    };

    setSettings(prev => ({ ...prev, ...dataToSave }));
    localStorage.setItem('yap-settings', JSON.stringify(dataToSave));
    localStorage.setItem('igren-settings', JSON.stringify(dataToSave));

    setSaved(true);
    toast.success('Đã lưu cấu hình xoay vòng API thành công!', { icon: '✅' });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 animate-in fade-in duration-300 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 font-['Outfit']">
            <Key className="w-5 h-5 text-emerald-400" /> Cấu Hình API Key & Tự Động Xoay Vòng
          </h2>
          <p className="text-xs text-slate-400">Ưu tiên Gemini #1 &rarr; Tự động nhảy sang Groq / OpenRouter / OpenAI khi hết Quota</p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4" /> Đã lưu
          </div>
        )}
      </div>

      {/* 1. GOOGLE GEMINI FREE (ƯU TIÊN SỐ 1) */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-emerald-500/30 shadow-xl shadow-emerald-950/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>1. Google Gemini Key (Miễn Phí)</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
              ⭐ ƯU TIÊN SỐ 1
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleTestKey('gemini')}
            className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            <Activity className="w-3 h-3" />
            <span>{testingStatus.gemini || 'Kiểm tra'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Mô hình <strong>Gemini 3.6 / 2.5 / 2.0 Flash</strong> thế hệ mới nhất siêu tốc & thông minh. Lấy key tại{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold inline-flex items-center gap-0.5">
            Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>

        <div className="relative">
          <input
            type={showKeys.gemini ? 'text' : 'password'}
            value={formData.geminiApiKey}
            onChange={(e) => handleChange('geminiApiKey', e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-[#1e293b]/90 border border-white/10 text-white rounded-2xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('gemini')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. GROQ AI KEY (SIÊU TỐC 0.01S) */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <span>2. Groq AI Key</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
              ⚡ Siêu tốc 0.01s
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleTestKey('groq')}
            className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            <Activity className="w-3 h-3" />
            <span>{testingStatus.groq || 'Kiểm tra'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Chạy mô hình Llama 3.3 70B và Whisper Turbo miễn phí. Lấy key tại{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold inline-flex items-center gap-0.5">
            Groq Console <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>

        <div className="relative">
          <input
            type={showKeys.groq ? 'text' : 'password'}
            value={formData.groqApiKey}
            onChange={(e) => handleChange('groqApiKey', e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-[#1e293b]/90 border border-white/10 text-white rounded-2xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('groq')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            {showKeys.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. OPENROUTER FREE (DEEPSEEK R1 & LLAMA 3.3) */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <span>3. OpenRouter Free Key</span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-extrabold px-2 py-0.5 rounded-full border border-cyan-500/30">
              DeepSeek & Llama Free
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleTestKey('openrouter')}
            className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            <Activity className="w-3 h-3" />
            <span>{testingStatus.openrouter || 'Kiểm tra'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Cung cấp DeepSeek R1 & Llama 3.3 hoàn toàn miễn phí không giới hạn. Lấy key tại{' '}
          <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold inline-flex items-center gap-0.5">
            OpenRouter.ai <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>

        <div className="relative">
          <input
            type={showKeys.openrouter ? 'text' : 'password'}
            value={formData.openrouterApiKey}
            onChange={(e) => handleChange('openrouterApiKey', e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-[#1e293b]/90 border border-white/10 text-white rounded-2xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('openrouter')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            {showKeys.openrouter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4. OPENAI API KEY (GPT-4o Mini) */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <span>4. OpenAI API Key</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
              GPT-4o Mini
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleTestKey('openai')}
            className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            <Activity className="w-3 h-3" />
            <span>{testingStatus.openai || 'Kiểm tra'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">Khóa dự phòng GPT-4o Mini & Whisper OpenAI.</p>

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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 5. GOOGLE GEMINI TRẢ PHÍ (PAY-AS-YOU-GO / CẤP DOANH NGHIỆP) */}
      <div className="bg-gradient-to-br from-amber-500/10 via-[#0f172a]/95 to-purple-950/20 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-amber-500/40 shadow-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Crown className="w-4 h-4" />
            </div>
            <span>5. Google Gemini Trả Phí (Pay-as-you-go / Pro Tier)</span>
            <span className="text-[10px] bg-gradient-to-r from-amber-400 to-yellow-600 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-md">
              👑 CỰC MẠNH & KHÔNG GIỚI HẠN
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleTestKey('geminiPaid')}
            className="flex items-center gap-1 py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            <Activity className="w-3 h-3" />
            <span>{testingStatus.geminiPaid || 'Kiểm tra'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Dành cho tài khoản Google Cloud / AI Studio đã gắn thẻ thanh toán (Billing Enabled). Mở khóa mô hình tối thượng <strong>Gemini 2.5 Pro & Gemini 1.5 Pro</strong> với tốc độ và hạn mức không giới hạn, phục vụ họp nhiều giờ liên tục.
        </p>

        <div className="relative">
          <input
            type={showKeys.geminiPaid ? 'text' : 'password'}
            value={formData.geminiPaidApiKey}
            onChange={(e) => handleChange('geminiPaidApiKey', e.target.value)}
            placeholder="AIzaSy... (Khóa Gemini Pay-as-you-go)"
            className="w-full bg-[#1e293b]/90 border border-amber-500/30 text-white rounded-2xl p-3 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={() => toggleShowKey('geminiPaid')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            {showKeys.geminiPaid ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 6. TÙY CHỌN TỰ ĐỘNG HÓA */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-black text-white font-['Outfit']">
          <Wand2 className="w-4 h-4 text-emerald-400" /> Tùy Chọn Đàm Thoại & Dịch Thuật
        </div>

        {/* Auto Copy */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-200">Tự động sao chép (Auto-Copy)</h3>
            <p className="text-[11px] text-slate-400">Dịch xong tự copy ngay vào bộ nhớ, chỉ cần sang Zalo ấn Dán</p>
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
            <h3 className="text-xs sm:text-sm font-bold text-slate-200">Tự động phát âm bản dịch (Auto-TTS 1 lần duy nhất)</h3>
            <p className="text-[11px] text-slate-400">Tự phát loa tiếng bản xứ 1 lần chuẩn xác, bấm lại loa nếu cần nghe lại</p>
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
        className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-black rounded-3xl text-sm shadow-xl shadow-emerald-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Save className="w-5 h-5" />
        <span>{saved ? '✅ ĐÃ LƯU TOÀN BỘ CẤU HÌNH THÀNH CÔNG!' : '💾 LƯU CẤU HÌNH & KÍCH HOẠT XOAY KEY'}</span>
      </button>
    </form>
  );
}
