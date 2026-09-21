// Hệ thống Dịch thuật & Nhận diện Giọng nói AI Đa Tầng với Cơ Chế Tự Động Xoay API (Auto-Rotate & Failover)

function getAllConfiguredKeys() {
  try {
    const yapSettings = JSON.parse(localStorage.getItem('yap-settings') || '{}');
    const igrenSettings = JSON.parse(localStorage.getItem('igren-settings') || '{}');

    return {
      gemini: (yapSettings.geminiApiKey || igrenSettings.geminiApiKey || '').trim(),
      groq: (yapSettings.groqApiKey || igrenSettings.groqApiKey || '').trim(),
      openrouter: (yapSettings.openrouterApiKey || igrenSettings.openrouterApiKey || '').trim(),
      openai: (yapSettings.openaiApiKey || igrenSettings.openaiApiKey || '').trim(),
      cohere: (yapSettings.cohereApiKey || igrenSettings.cohereApiKey || '').trim(),
    };
  } catch (e) {
    console.error("Lỗi đọc cấu hình API từ LocalStorage:", e);
    return {};
  }
}

// Hàm thực thi với cơ chế Tự Động Xoay API (Auto-Rotate Failover)
// Thứ tự ưu tiên: 1. Gemini -> 2. Groq -> 3. OpenRouter (Free DeepSeek/Llama) -> 4. OpenAI -> 5. Cohere
async function executeWithAutoFailover(taskName, providers) {
  const errors = [];

  for (const { name, execute } of providers) {
    try {
      // Thiết lập timeout 8 giây cho mỗi nhà cung cấp để tránh bị treo
      const result = await Promise.race([
        execute(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout quá 8 giây')), 8000))
      ]);

      if (result && typeof result === 'string' && result.trim()) {
        return result.trim();
      }
    } catch (err) {
      console.warn(`[Auto-Rotate] ${taskName}: ${name} thất bại (${err.message}). Tự động chuyển sang AI tiếp theo...`);
      errors.push(`${name}: ${err.message}`);
    }
  }

  // Nếu tất cả AI đều thất bại
  if (errors.length === 0) {
    throw new Error('Chưa cấu hình bất kỳ API Key nào. Vui lòng vào Cài đặt để thêm khóa Gemini, Groq hoặc OpenRouter.');
  }

  throw new Error(`Tất cả các nguồn AI đều gặp sự cố hoặc hết hạn mức (${errors.join(' | ')}). Vui lòng thêm hoặc kiểm tra API Key trong Cài đặt.`);
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

  // Ưu tiên 1: Google Gemini (Gemini 2.5 Flash / 2.0 Flash)
  if (keys.gemini) {
    providers.push({
      name: 'Google Gemini',
      execute: async () => {
        // Thử model 2.5 flash, fallback 2.0 flash, fallback 1.5 flash
        const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const model of models) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: translationPrompt }] }],
                generationConfig: { temperature: 0.2 }
              })
            });

            if (res.ok) {
              const data = await res.json();
              const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (result) return result;
            } else {
              const err = await res.json().catch(() => ({}));
              if (model === models[models.length - 1]) throw new Error(err.error?.message || `Lỗi ${res.status}`);
            }
          } catch (e) {
            if (model === models[models.length - 1]) throw e;
          }
        }
      }
    });
  }

  // Ưu tiên 2: Groq AI (Qwen 3.8 / Llama 3.3)
  if (keys.groq) {
    providers.push({
      name: 'Groq AI',
      execute: async () => {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.groq}`
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            temperature: 0.2,
            messages: [
              { role: 'system', content: 'You are a professional bilingual translator. Translate directly without explanation.' },
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

  // Ưu tiên 3: OpenRouter (DeepSeek R1 / Llama 3.3 Free)
  if (keys.openrouter) {
    providers.push({
      name: 'OpenRouter (DeepSeek / Llama)',
      execute: async () => {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openrouter}`,
            'HTTP-Referer': 'https://yap-ai.app',
            'X-Title': 'YAP AI Translator'
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat:free',
            temperature: 0.2,
            messages: [
              { role: 'system', content: 'You are a professional translator. Return only the translated text.' },
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

  // Ưu tiên 4: OpenAI (GPT-4o Mini)
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
              { role: 'system', content: 'You are a professional translator. Return only the translated text.' },
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

  // Ưu tiên 1: Google Gemini (Nhận diện âm thanh đa ngôn ngữ cực chuẩn)
  if (keys.gemini && base64Audio) {
    providers.push({
      name: 'Google Gemini Audio',
      execute: async () => {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keys.gemini}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe the spoken audio accurately into the spoken language (Vietnamese/English). Add appropriate punctuation, capitalization, and numbers. Do not add preamble or markdown notes. Return ONLY the transcribed words.' },
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/webm',
                    data: base64Audio
                  }
                }
              ]
            }],
            generationConfig: { temperature: 0.1 }
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Lỗi ${res.status}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    });
  }

  // Ưu tiên 2: Groq Whisper (Whisper Large V3 Turbo siêu tốc)
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
          headers: {
            'Authorization': `Bearer ${keys.groq}`
          },
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

  // Ưu tiên 3: OpenAI Whisper
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
          headers: {
            'Authorization': `Bearer ${keys.openai}`
          },
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

// 4. TRỢ LÝ AI CHAT
export async function chatWithAI({ messages }) {
  const keys = getAllConfiguredKeys();
  const providers = [];

  // 1. Gemini
  if (keys.gemini) {
    providers.push({
      name: 'Google Gemini Chat',
      execute: async () => {
        const contents = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keys.gemini}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Lỗi ${res.status}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    });
  }

  // 2. Groq
  if (keys.groq) {
    providers.push({
      name: 'Groq AI Chat',
      execute: async () => {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.groq}`
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            messages,
            temperature: 0.7
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

  // 3. OpenRouter
  if (keys.openrouter) {
    providers.push({
      name: 'OpenRouter Chat',
      execute: async () => {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openrouter}`
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat:free',
            messages,
            temperature: 0.7
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

  // 4. OpenAI
  if (keys.openai) {
    providers.push({
      name: 'OpenAI Chat',
      execute: async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openai}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7
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

  return executeWithAutoFailover('Trợ Lý AI', providers);
}
