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
      content: 'Chào anh! Em là **Yap AI**. Anh có thể yêu cầu em viết lại văn bản, soạn thảo email, sửa lỗi chính tả, tóm tắt nội dung hoặc giải đáp bất kỳ câu hỏi nào.'
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
    toast.success('Đã sao chép!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chào anh! Em là **Yap AI**. Anh có thể gửi văn bản hoặc yêu cầu bất kỳ để em hỗ trợ.'
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[750px] animate-in fade-in duration-300">
      {/* Header action */}
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
          <Sparkles className="w-4 h-4 text-teal-600" /> Trợ lý Yap AI
        </div>
        <button
          onClick={handleClear}
          className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1"
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
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-teal-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                {!isUser && (
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    className="mt-1.5 pt-1.5 border-t border-gray-100 w-full flex items-center justify-end gap-1 text-[11px] text-gray-400 hover:text-teal-600 font-medium"
                  >
                    {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === idx ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                )}
              </div>
              {isUser && (
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5 justify-start items-center">
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" /> Yap AI đang suy nghĩ...
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
              className="shrink-0 text-[11px] bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-1 px-2.5 rounded-full shadow-xs"
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
          className="flex gap-2 items-center bg-white rounded-2xl p-1.5 pl-3.5 shadow-sm border border-gray-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi hoặc nhập văn bản cho Yap AI..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-800 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              input.trim() && !loading
                ? 'bg-teal-600 text-white shadow-sm hover:bg-teal-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
