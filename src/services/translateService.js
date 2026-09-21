// Hệ thống Dịch thuật, Nhận diện & Trợ lý AI Đa Tầng với Cơ Chế Tự Động Xoay API (Auto-Rotate & Failover)
// Hỗ trợ cả Google Gemini Trả Phí (Pay-as-you-go), Gemini Free, Groq, OpenRouter, OpenAI

export const GEMINI_FREE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-pro'
];

export const GEMINI_PAID_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-pro-exp-02-05',
  'gemini-pro'
];

const geminiModelCache = new Map();

// Tự động khám phá danh sách model Google Gemini thực tế khả dụng cho API Key này
export async function getAvailableGeminiModels(apiKey, tier = 'free') {
  if (!apiKey) return tier === 'paid' ? GEMINI_PAID_MODELS : GEMINI_FREE_MODELS;

  if (geminiModelCache.has(apiKey)) {
    const cached = geminiModelCache.get(apiKey);
    if (cached && cached.length > 0) return cached;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const available = data.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        if (available.length > 0) {
          const preferredOrder = tier === 'paid'
            ? ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-pro', 'gemini-pro']
            : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-8b', 'gemini-1.5-pro', 'gemini-pro'];

          const sorted = [];
          for (const pref of preferredOrder) {
            const matches = available.filter(m => m === pref || m.startsWith(pref));
            for (const m of matches) {
              if (!sorted.includes(m)) sorted.push(m);
            }
          }
          for (const m of available) {
            if (!sorted.includes(m)) sorted.push(m);
          }

          geminiModelCache.set(apiKey, sorted);
          return sorted;
        }
      }
    }
  } catch (err) {
    console.warn("Không thể lấy danh sách model động từ Gemini, sử dụng danh sách chuẩn:", err);
  }

  return tier === 'paid' ? GEMINI_PAID_MODELS : GEMINI_FREE_MODELS;
}

// Helper gọi Google Gemini với cơ chế thử tự động các model hợp lệ mới nhất
export async function callGeminiContent(apiKey, body, modelsOrTier = 'free') {
  let modelsToTry;
  if (Array.isArray(modelsOrTier)) {
    modelsToTry = modelsOrTier;
  } else {
    modelsToTry = await getAvailableGeminiModels(apiKey, modelsOrTier);
  }

  let lastError = null;
  for (const model of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status}`;
        lastError = new Error(`${model}: ${msg}`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  // Nếu danh sách tĩnh thất bại, thử khám phá động và gọi các model còn lại
  try {
    const dynamicModels = await getAvailableGeminiModels(apiKey, typeof modelsOrTier === 'string' ? modelsOrTier : 'paid');
    const remaining = dynamicModels.filter(m => !modelsToTry.includes(m));
    for (const model of remaining) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }

  throw lastError || new Error('Không thể kết nối tới Google Gemini');
}

// Helper gọi Groq với cơ chế fallback models
export async function callGroqChat(apiKey, messages, temperature = 0.2) {
  let lastError = null;
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature,
          messages
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(`${model}: ${errJson.error?.message || res.status}`);
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('Groq AI không phản hồi');
}

// Helper gọi OpenRouter với cơ chế fallback models
export async function callOpenRouterChat(apiKey, messages, temperature = 0.2) {
  let lastError = null;
  for (const model of OPENROUTER_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://javis-idio.app',
          'X-Title': 'JAVIS Idio - AI Voice & Live Translator'
        },
        body: JSON.stringify({
          model,
          temperature,
          messages
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(`${model}: ${errJson.error?.message || res.status}`);
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('OpenRouter không phản hồi');
}

// 1. DỊCH THUẬT VĂN BẢN (TRANSLATE TEXT)
export async function translateText(text, sourceLanguage = 'vi', targetLanguage = 'en') {
  if (!text || !text.trim()) return '';

  const keys = getAllConfiguredKeys();
  const providers = [];

  const translationPrompt = `You are a professional high-accuracy bilingual translator. 
Translate accurately and naturally. Preserve names, numbers, currency values, product codes, technical terms, brand names, addresses, and dates. 
Do not add any explanation, notes, or markdown formatting. Return ONLY the pure translated text.

Translate the following text from ${sourceLanguage} to ${targetLanguage}:
${text}`;

  // 0. Ưu tiên cao nhất: Google Gemini Trả Phí (Paid Key)
  if (keys.geminiPaid) {
    providers.push({
      name: 'Google Gemini Paid (Pro/Flash)',
      execute: async () => {
        return await callGeminiContent(keys.geminiPaid, {
          contents: [{ parts: [{ text: translationPrompt }] }],
          generationConfig: { temperature: 0.2 }
        }, GEMINI_PAID_MODELS);
      }
    });
  }

  // 1. Ưu tiên 1: Google Gemini Free
  if (keys.gemini) {
    providers.push({
      name: 'Google Gemini Free',
      execute: async () => {
        return await callGeminiContent(keys.gemini, {
          contents: [{ parts: [{ text: translationPrompt }] }],
          generationConfig: { temperature: 0.2 }
        }, GEMINI_FREE_MODELS);
      }
    });
  }

  // 2. Ưu tiên 2: Groq AI
  if (keys.groq) {
    providers.push({
      name: 'Groq AI (Llama 3.3 / Qwen 2.5)',
      execute: async () => {
        return await callGroqChat(keys.groq, [
          { role: 'system', content: 'You are a professional bilingual translator. Return only translated text.' },
          { role: 'user', content: translationPrompt }
        ], 0.2);
      }
    });
  }

  // 3. Ưu tiên 3: OpenRouter Free
  if (keys.openrouter) {
    providers.push({
      name: 'OpenRouter (DeepSeek / Llama)',
      execute: async () => {
        return await callOpenRouterChat(keys.openrouter, [
          { role: 'system', content: 'You are a professional translator. Return only the translated text.' },
          { role: 'user', content: translationPrompt }
        ], 0.2);
      }
    });
  }

  // 4. Ưu tiên 4: OpenAI
  if (keys.openai) {
    providers.push({
      name: 'OpenAI GPT-4o Mini',
      execute: async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openai}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            messages: [
              { role: 'system', content: 'You are a professional translator. Return only translated text.' },
              { role: 'user', content: translationPrompt }
            ]
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Lỗi ${res.status}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content;
      }
    });
  }

  return executeWithAutoFailover('Dịch Thuật', providers);
}

// 2. NHẬN DIỆN GIỌNG NÓI (VOICE TRANSCRIPTION)
export async function transcribeAudioOnly({ audioBlob, base64Audio, mimeType, language = 'vi' }) {
  const keys = getAllConfiguredKeys();
  const providers = [];

  const audioPrompt = 'Transcribe the spoken audio accurately into the spoken language (Vietnamese/English). Add appropriate punctuation, capitalization, and numbers. Do not add preamble or markdown notes. Return ONLY the transcribed words.';

  // 0. Google Gemini Paid
  if (keys.geminiPaid && base64Audio) {
    providers.push({
      name: 'Google Gemini Paid Audio',
      execute: async () => {
        return await callGeminiContent(keys.geminiPaid, {
          contents: [{
            parts: [
              { text: audioPrompt },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: base64Audio
                }
              }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        }, GEMINI_PAID_MODELS);
      }
    });
  }

  // 1. Google Gemini Free
  if (keys.gemini && base64Audio) {
    providers.push({
      name: 'Google Gemini Free Audio',
      execute: async () => {
        return await callGeminiContent(keys.gemini, {
          contents: [{
            parts: [
              { text: audioPrompt },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: base64Audio
                }
              }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        }, GEMINI_FREE_MODELS);
      }
    });
  }

  // 2. Groq Whisper Turbo
  if (keys.groq) {
    providers.push({
      name: 'Groq Whisper Turbo',
      execute: async () => {
        const formData = new FormData();
        const blobToUse = audioBlob || (base64Audio ? new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: mimeType || 'audio/webm' }) : null);
        if (!blobToUse) throw new Error('Không có dữ liệu âm thanh');

        const file = new File([blobToUse], 'audio.webm', { type: mimeType || 'audio/webm' });
        formData.append('file', file);
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', language === 'vi' ? 'vi' : language);
        formData.append('response_format', 'json');

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${keys.groq}` },
          body: formData
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Lỗi ${res.status}`);
        }

        const data = await res.json();
        return data.text;
      }
    });
  }

  // 3. OpenAI Whisper
  if (keys.openai) {
    providers.push({
      name: 'OpenAI Whisper',
      execute: async () => {
        const formData = new FormData();
        const blobToUse = audioBlob || (base64Audio ? new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: mimeType || 'audio/webm' }) : null);
        if (!blobToUse) throw new Error('Không có dữ liệu âm thanh');

        const file = new File([blobToUse], 'audio.webm', { type: mimeType || 'audio/webm' });
        formData.append('file', file);
        formData.append('model', 'whisper-1');
        formData.append('language', language === 'vi' ? 'vi' : language);

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${keys.openai}` },
          body: formData
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Lỗi ${res.status}`);
        }

        const data = await res.json();
        return data.text;
      }
    });
  }

  return executeWithAutoFailover('Nhận Diện Giọng Nói', providers);
}

// 3. CHUẨN HÓA VĂN BẢN (AI REFINE)
export async function refineTextWithAI({ text, mode = 'exact' }) {
  if (!text || !text.trim()) return '';

  let prompt = '';
  switch (mode) {
    case 'work':
      prompt = `Viết lại đoạn văn sau thành văn phong chuẩn mực công việc, lưu loát, chuyên nghiệp và rõ ràng, giữ trọn vẹn thông tin:\n\n"${text}"\n\nChỉ trả về văn bản kết quả.`;
      break;
    case 'summary':
      prompt = `Tóm tắt các ý chính trong đoạn văn sau thành các gạch đầu dòng ngắn gọn, súc tích:\n\n"${text}"\n\nChỉ trả về kết quả tóm tắt.`;
      break;
    case 'message':
      prompt = `Viết lại đoạn văn sau thành một tin nhắn (Zalo/SMS/Email) ngắn gọn, lịch sự, thân thiện và dễ đọc:\n\n"${text}"\n\nChỉ trả về nội dung tin nhắn.`;
      break;
    case 'english':
      prompt = `Dịch và trau chuốt đoạn văn sau sang Tiếng Anh tự nhiên, chuẩn người bản xứ:\n\n"${text}"\n\nChỉ trả về văn bản Tiếng Anh.`;
      break;
    case 'exact':
    default:
      prompt = `Sửa lỗi chính tả, ngắt câu và thêm dấu câu chuẩn xác cho đoạn văn bản gõ giọng nói sau, không thay đổi nội dung:\n\n"${text}"\n\nChỉ trả về văn bản đã sửa.`;
      break;
  }

  return translateText(prompt, 'vi', 'vi');
}

// 4. TRỢ LÝ AI CHAT ĐA PHƯƠNG TIỆN (MULTIMODAL: ẢNH + TÀI LIỆU + GIỌNG NÓI)
export async function chatWithAI({ messages, image = null, documentText = '', documentName = '' }) {
  const keys = getAllConfiguredKeys();
  const providers = [];

  let lastMessage = messages[messages.length - 1];
  let enhancedUserText = lastMessage?.content || '';
  if (documentText) {
    enhancedUserText += `\n\n[📄 TÀI LIỆU ĐÍNH KÈM: "${documentName}"]:\n${documentText}`;
  }

  // 0. Google Gemini Paid
  if (keys.geminiPaid) {
    providers.push({
      name: 'Google Gemini Paid Multimodal',
      execute: async () => {
        const contents = [];
        for (let i = 0; i < messages.length - 1; i++) {
          const m = messages[i];
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          });
        }
        const lastParts = [{ text: enhancedUserText || (image ? 'Hãy phân tích nội dung trong ảnh này giúp tôi.' : 'Xin chào') }];
        if (image && image.base64) {
          lastParts.push({
            inlineData: {
              mimeType: image.mimeType || 'image/jpeg',
              data: image.base64
            }
          });
        }
        contents.push({ role: 'user', parts: lastParts });

        return await callGeminiContent(keys.geminiPaid, { contents, generationConfig: { temperature: 0.5 } }, GEMINI_PAID_MODELS);
      }
    });
  }

  // 1. Google Gemini Free
  if (keys.gemini) {
    providers.push({
      name: 'Google Gemini Free Multimodal',
      execute: async () => {
        const contents = [];
        for (let i = 0; i < messages.length - 1; i++) {
          const m = messages[i];
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          });
        }
        const lastParts = [{ text: enhancedUserText || (image ? 'Hãy đọc chữ và phân tích ảnh này giúp tôi.' : 'Xin chào') }];
        if (image && image.base64) {
          lastParts.push({
            inlineData: {
              mimeType: image.mimeType || 'image/jpeg',
              data: image.base64
            }
          });
        }
        contents.push({ role: 'user', parts: lastParts });

        return await callGeminiContent(keys.gemini, { contents, generationConfig: { temperature: 0.5 } }, GEMINI_FREE_MODELS);
      }
    });
  }

  // 2. OpenAI GPT-4o Mini Vision
  if (keys.openai) {
    providers.push({
      name: 'OpenAI GPT-4o Mini Vision',
      execute: async () => {
        const formattedMessages = messages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        }));

        if (image && image.base64) {
          formattedMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: enhancedUserText || 'Hãy phân tích, đọc chữ và dịch nội dung trong ảnh này.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${image.mimeType || 'image/jpeg'};base64,${image.base64}`
                }
              }
            ]
          });
        } else {
          formattedMessages.push({
            role: 'user',
            content: enhancedUserText
          });
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openai}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: formattedMessages,
            temperature: 0.5
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Lỗi ${res.status}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content;
      }
    });
  }

  // 3. Groq (Text Only)
  if (keys.groq) {
    providers.push({
      name: 'Groq AI (Text Assistant)',
      execute: async () => {
        const groqMessages = messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
        groqMessages.push({ role: 'user', content: enhancedUserText + (image ? '\n[Lưu ý: Có đính kèm hình ảnh nhưng hãy trả lời dựa trên văn bản]' : '') });
        return await callGroqChat(keys.groq, groqMessages, 0.5);
      }
    });
  }

  // 4. OpenRouter
  if (keys.openrouter) {
    providers.push({
      name: 'OpenRouter DeepSeek',
      execute: async () => {
        const orMessages = messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
        orMessages.push({ role: 'user', content: enhancedUserText });
        return await callOpenRouterChat(keys.openrouter, orMessages, 0.5);
      }
    });
  }

  return executeWithAutoFailover('Trợ Lý AI Đa Phương Tiện', providers);
}

// 5. TẠO BIÊN BẢN HỌP & TÓM TẮT CUỘC HỌP AI (MEETING MINUTES GENERATOR)
export async function generateMeetingSummary({ transcriptText, meetingDuration = '', targetLang = 'vi' }) {
  if (!transcriptText || !transcriptText.trim()) {
    throw new Error('Chưa có dữ liệu biên bản thoại trong cuộc họp để tạo tóm tắt.');
  }

  const prompt = `Bạn là một Thư ký Cuộc họp & Chuyên gia Phân tích Doanh nghiệp AI cấp cao.
Hãy đọc kỹ toàn bộ nội dung bản ghi âm cuộc họp (transcript) dưới đây và tạo ra một BẢN BIÊN BẢN HỌP CHUYÊN NGHIỆP (Meeting Minutes) bằng Tiếng Việt chuẩn mực, chi tiết và súc tích.

--- THÔNG TIN CUỘC HỌP ---
Thời lượng: ${meetingDuration || 'N/A'}
Thời gian tạo: ${new Date().toLocaleString('vi-VN')}

--- TOÀN BỘ NỘI DUNG THOẠI (TRANSCRIPT) ---
${transcriptText}

--- YÊU CẦU ĐỊNH DẠNG BIÊN BẢN HỌP (MARKDOWN) ---
# 📋 BIÊN BẢN CUỘC HỌP (AI MEETING MINUTES)
**Thời lượng:** ${meetingDuration} | **Thời gian:** ${new Date().toLocaleString('vi-VN')}

## 1. 🎯 Tóm Tắt Tổng Quan (Executive Summary)
(Tóm tắt nội dung và mục tiêu cốt lõi của cuộc họp trong 2 - 3 câu)

## 2. 🔑 Các Chủ Đề & Ý Kiến Chính Được Thảo Luận (Key Discussions)
(Gạch đầu dòng chi tiết các luận điểm, ý kiến thảo luận quan trọng)

## 3. 🤝 Các Quyết Định Đã Thống Nhất (Decisions & Agreements)
(Liệt kê các quyết định mà các bên đã đồng thuận)

## 4. ⚡ Việc Cần Làm & Phân Công (Action Items & Next Steps)
| STT | Công việc cần làm | Người phụ trách / Bộ phận | Thời hạn (Deadline) |
|---|---|---|---|
(Điền bảng công việc rõ ràng)

## 5. 💡 Ghi Chú & Lưu Ý Quan Trọng (Important Notes)
(Các rủi ro, câu hỏi mở hoặc vấn đề cần theo dõi thêm)

Hãy trình bày chỉn chu, chuyên nghiệp, giữ nguyên tên người, số liệu, tiền tệ, ngày tháng chính xác.`;

  return translateText(prompt, 'vi', 'vi');
}
