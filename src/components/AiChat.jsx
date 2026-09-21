import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { chatWithAI } from '../services/translateService';

const QUICK_PROMPTS = [
  'Sửa ngữ pháp & chính tả email này giúp tôi',
  'Tóm tắt các ý chính của đoạn văn',
  'Viết lại văn bản sau theo phong cách trang trọng',
  'Dịch đoạn văn bản này sang tiếng Anh tự nhiên',
];

export default function AiChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Chào anh! Em là **YAP AI Assistant Premium**. Anh có thể gửi văn bản cần biên tập, soạn thảo email đối tác quốc tế, tóm tắt hợp đồng hoặc giải đáp câu hỏi đa ngữ.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text || !text.trim() || loading) return;

    const userMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await chatWithAI({ messages: newMessages });
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi trò chuyện với AI.');
      setMessages([...newMessages, { role: 'assistant', content: `⚠️ Lỗi: ${err.message || 'Không thể kết nối AI.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast.success('Đã sao chép phản hồi!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chào anh! Em là **YAP AI Assistant Premium**. Em sẵn sàng hỗ trợ anh.'
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-190px)] max-h-[750px] animate-in fade-in duration-300 pb-16">
      {/* Header action */}
      <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-xs font-black text-white font-['Outfit']">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Trợ Lý Ngôn Ngữ & Soạn Thảo AI
        </div>
        <button
          onClick={handleClear}
          className="text-slate-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa hội thoại
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`group relative max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-xl ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                    : 'bg-[#0f172a]/90 backdrop-blur-xl text-slate-100 border border-white/[0.08] rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                {!isUser && (
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    className="mt-2 pt-2 border-t border-white/[0.08] w-full flex items-center justify-end gap-1 text-[11px] text-slate-400 hover:text-emerald-400 font-bold transition-colors"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === idx ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                )}
              </div>
              {isUser && (
                <div className="w-8 h-8 rounded-2xl bg-slate-800 text-slate-300 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5 justify-start items-center">
            <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl px-4 py-2.5 shadow-xl border border-white/[0.08] flex items-center gap-2 text-xs text-slate-300">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> YAP AI đang phân tích & soạn thảo...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="shrink-0 text-[11px] bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white py-1.5 px-3 rounded-full shadow transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 items-center bg-[#0f172a]/90 backdrop-blur-xl rounded-3xl p-1.5 pl-4 shadow-2xl border border-white/[0.1] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi, văn bản hoặc yêu cầu cho YAP AI..."
            className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-white placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              input.trim() && !loading
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 active:scale-95'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
