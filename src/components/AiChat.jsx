import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, Check, RefreshCw, Trash2, Camera, Image, Paperclip, Mic, MicOff, Volume2, X, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { chatWithAI, transcribeAudioOnly } from '../services/translateService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const QUICK_PROMPTS = [
  '📷 Dịch toàn bộ văn bản trong ảnh này sang Tiếng Việt',
  '📄 Tóm tắt ý chính của tài liệu này',
  '✍️ Viết lại văn bản sau theo phong cách chuyên nghiệp',
  '🌐 Dịch sang Tiếng Anh tự nhiên chuẩn thương mại',
];

export default function AiChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Chào anh! Em là **YAP AI Assistant**. Anh có thể **nói trực tiếp qua Mic 🎙️**, **chụp ảnh hóa đơn/tài liệu 📸** để em dịch chữ trong ảnh, hoặc **tải file tài liệu 📎** lên để em dịch và tóm tắt.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  // Attachments State
  const [attachedImage, setAttachedImage] = useState(null); // { base64, mimeType, previewUrl }
  const [attachedDoc, setAttachedDoc] = useState(null); // { name, textContent, size }
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const messagesEndRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const { speak, isSpeaking, stop } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Xử lý chọn ảnh (Camera hoặc Album)
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh quá lớn (tối đa 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      setAttachedImage({
        base64,
        mimeType: file.type,
        previewUrl: reader.result,
        name: file.name
      });
      toast.success('Đã đính kèm ảnh! Anh có thể yêu cầu AI đọc & dịch ảnh.', { icon: '📸' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Xử lý chọn tài liệu (PDF, TXT, DOCX, MD)
  const handleDocSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();

    if (file.type === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
      reader.onload = (event) => {
        const textContent = event.target.result;
        setAttachedDoc({
          name: fileName,
          textContent,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
        toast.success(`Đã tải lên tài liệu: ${fileName}`, { icon: '📄' });
      };
      reader.readAsText(file);
    } else {
      // Đối với PDF hoặc file nhị phân, đọc dưới dạng text / base64
      reader.onload = () => {
        const textPreview = `[Tập tin đính kèm: ${fileName} (${(file.size / 1024).toFixed(1)} KB)]`;
        setAttachedDoc({
          name: fileName,
          textContent: textPreview,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
        toast.success(`Đã đính kèm tài liệu: ${fileName}`, { icon: '📄' });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Thu âm giọng nói để nói chuyện trực tiếp với trợ lý
  const startVoiceInput = async () => {
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          try {
            toast.loading('AI đang nhận diện giọng nói...', { id: 'voice-trans' });
            const transcript = await transcribeAudioOnly({
              audioBlob,
              base64Audio,
              mimeType: mediaRecorder.mimeType,
              language: 'vi'
            });
            toast.dismiss('voice-trans');

            if (transcript && transcript.trim()) {
              setInput(transcript.trim());
              // Tự động gửi luôn câu nói
              handleSend(transcript.trim());
            } else {
              toast.error('Không nghe rõ âm thanh giọng nói.');
            }
          } catch (err) {
            toast.dismiss('voice-trans');
            toast.error(err.message || 'Lỗi nhận diện giọng nói');
          }
        };
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      toast.success('Đang lắng nghe... Bấm lại Mic khi nói xong!', { duration: 2000 });
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      toast.error('Không thể mở Micro. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Gửi tin nhắn đến AI
  const handleSend = async (textToSend) => {
    const text = textToSend !== undefined ? textToSend : input;
    if ((!text || !text.trim()) && !attachedImage && !attachedDoc) return;
    if (loading) return;

    let userDisplayContent = text.trim();
    if (!userDisplayContent && attachedImage) userDisplayContent = '📷 [Đã gửi 1 hình ảnh] Hãy đọc và dịch văn bản trong ảnh này.';
    if (!userDisplayContent && attachedDoc) userDisplayContent = `📄 [Đã gửi tài liệu: ${attachedDoc.name}] Hãy dịch và tóm tắt nội dung.`;

    const userMessage = {
      role: 'user',
      content: userDisplayContent,
      imagePreview: attachedImage?.previewUrl,
      docName: attachedDoc?.name
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const imageToSend = attachedImage;
    const docTextToSend = attachedDoc?.textContent || '';
    const docNameToSend = attachedDoc?.name || '';

    // Reset input & attachments
    setInput('');
    setAttachedImage(null);
    setAttachedDoc(null);
    setLoading(true);

    try {
      const reply = await chatWithAI({
        messages: newMessages,
        image: imageToSend,
        documentText: docTextToSend,
        documentName: docNameToSend
      });

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

  const handleSpeakMessage = (content) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(content, 'vi-VN');
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chào anh! Em là **YAP AI Assistant**. Em sẵn sàng hỗ trợ anh qua giọng nói, hình ảnh và tài liệu.'
      }
    ]);
    setAttachedImage(null);
    setAttachedDoc(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-190px)] max-h-[780px] animate-in fade-in duration-300 pb-16">
      {/* 1. Header action */}
      <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-xs font-black text-white font-['Outfit']">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Trợ Lý Đa Phương Tiện (Ảnh + File + Voice)
        </div>
        <button
          onClick={handleClear}
          className="text-slate-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa hội thoại
        </button>
      </div>

      {/* 2. Message List */}
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
                {/* Thumbnail ảnh đính kèm nếu user gửi ảnh */}
                {m.imagePreview && (
                  <div className="mb-2 rounded-2xl overflow-hidden border border-white/20 max-w-[200px]">
                    <img src={m.imagePreview} alt="User upload" className="w-full h-auto object-cover" />
                  </div>
                )}

                {/* Tên file đính kèm nếu user gửi file */}
                {m.docName && (
                  <div className="mb-2 p-2 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-2 text-xs text-emerald-300 font-mono">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">{m.docName}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>

                {!isUser && (
                  <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2 text-[11px] text-slate-400">
                    <button
                      onClick={() => handleSpeakMessage(m.content)}
                      className="flex items-center gap-1 hover:text-emerald-400 font-bold transition-colors"
                      title="Đọc to phản hồi"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Đọc</span>
                    </button>
                    <button
                      onClick={() => handleCopy(m.content, idx)}
                      className="flex items-center gap-1 hover:text-emerald-400 font-bold transition-colors ml-2"
                      title="Sao chép"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIndex === idx ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
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
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> YAP AI đang đọc ảnh, tài liệu & phân tích...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Attachment Previews (Ảnh hoặc File đang chờ gửi) */}
      {(attachedImage || attachedDoc) && (
        <div className="p-2.5 bg-[#0f172a]/95 rounded-2xl border border-emerald-500/40 mb-2 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {attachedImage && (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-400/40 shrink-0">
                <img src={attachedImage.previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            {attachedDoc && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="truncate">
              <div className="text-xs font-bold text-emerald-300 truncate">
                {attachedImage ? `Đã đính kèm ảnh: ${attachedImage.name}` : `Đã tải tài liệu: ${attachedDoc.name}`}
              </div>
              <div className="text-[11px] text-slate-400">
                {attachedImage ? 'Sẵn sàng gửi để AI dịch chữ trong ảnh' : `${attachedDoc.size} - Sẵn sàng dịch/tóm tắt`}
              </div>
            </div>
          </div>

          <button
            onClick={() => { setAttachedImage(null); setAttachedDoc(null); }}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Quick Prompts */}
      {messages.length <= 2 && !attachedImage && !attachedDoc && (
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

      {/* 5. Hidden File & Camera Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={docInputRef}
        accept=".txt,.md,.pdf,.docx,.doc,.csv,.json"
        onChange={handleDocSelect}
        className="hidden"
      />

      {/* 6. Rich Input Bar (Text + Voice + Camera + Attachments) */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-1.5 items-center bg-[#0f172a]/95 backdrop-blur-2xl rounded-3xl p-1.5 pl-3 shadow-2xl border border-white/[0.1] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all"
        >
          {/* Action Buttons: Camera + File + Image */}
          <div className="flex items-center gap-0.5 text-slate-400">
            {/* Chụp ảnh trực tiếp từ Camera điện thoại */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-2 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all"
              title="Chụp ảnh trực tiếp từ Camera để dịch"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Chọn ảnh từ thư viện */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all"
              title="Chọn ảnh từ máy"
            >
              <Image className="w-4 h-4" />
            </button>

            {/* Đính kèm tài liệu */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="p-2 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all"
              title="Tải tài liệu PDF/TXT/DOCX lên để dịch"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={attachedImage ? "Nhập câu hỏi về ảnh (hoặc bấm gửi để dịch)..." : attachedDoc ? "Nhập câu hỏi về tài liệu (hoặc bấm gửi để dịch)..." : "Nhập câu hỏi hoặc bấm Mic để nói..."}
            className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-white placeholder-slate-500 px-1"
          />

          {/* Voice Input Mic Button */}
          <button
            type="button"
            onClick={isRecording ? stopVoiceInput : startVoiceInput}
            className={`p-2.5 rounded-2xl transition-all duration-300 ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
            }`}
            title="Bấm để nói trực tiếp với AI"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!input.trim() && !attachedImage && !attachedDoc) || loading}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              (input.trim() || attachedImage || attachedDoc) && !loading
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
