const defaultApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '';

function getApiKeys() {
  try {
    const yapSettings = JSON.parse(localStorage.getItem('yap-settings') || '{}');
    const igrenSettings = JSON.parse(localStorage.getItem('igren-settings') || '{}');
    
    const keys = [];
    
    // 1. Separate keys
    if (yapSettings.groqApiKey && yapSettings.groqApiKey.trim()) keys.push(yapSettings.groqApiKey.trim());
    if (yapSettings.geminiApiKey && yapSettings.geminiApiKey.trim()) keys.push(yapSettings.geminiApiKey.trim());
    if (yapSettings.openaiApiKey && yapSettings.openaiApiKey.trim()) keys.push(yapSettings.openaiApiKey.trim());

    // 2. Legacy apiKeys string
    const rawKeys = yapSettings.apiKeys || igrenSettings.apiKeys || '';
    if (rawKeys && rawKeys.trim()) {
      const extraKeys = rawKeys.split(/[\n,; ]+/).map(k => k.trim()).filter(Boolean);
      for (const k of extraKeys) {
        if (!keys.includes(k)) keys.push(k);
      }
    }

    if (keys.length > 0) return keys;
  } catch (e) {
    console.error("Lỗi đọc API keys từ LocalStorage:", e);
  }
  if (defaultApiKey && defaultApiKey !== 'your_api_key_here') {
    return [defaultApiKey];
  }
  return [];
}

async function fetchWithRetry(requestFn) {
  const keys = getApiKeys();
  if (keys.length === 0 || !keys[0] || keys[0] === 'your_api_key_here') {
    throw new Error("Chưa cấu hình API Key. Hãy vào phần Cài đặt để thêm khóa API.");
  }

  // Shuffle keys or just try them sequentially
  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const currentKey = keys[i];
    try {
      const response = await requestFn(currentKey);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || response.statusText;
        
        // If it's a rate limit (429) AND we have more keys to try, continue to next key
        if ((response.status === 429 || (errMsg && errMsg.includes('quota'))) && i < keys.length - 1) {
          console.warn(`Key ${i + 1} hit quota, rotating to next key...`);
          continue; 
        }

        // Otherwise, throw immediately
        if (response.status === 429 || (errMsg && errMsg.includes('quota'))) {
           throw new Error('Đã hết hạn mức sử dụng của tất cả khóa API. Vui lòng đợi 30 giây hoặc thêm khóa API mới trong Cài đặt.');
        }
        throw new Error(`Lỗi API: ${errMsg}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      // Only rotate on specific network or quota errors, but fetch throws TypeError on network fail
      if (i === keys.length - 1) throw error;
    }
  }
  throw lastError;
}

export async function translateText({ text, sourceLanguage, targetLanguage }) {
  if (!text || text.trim() === '') return '';

  try {
    const response = await fetchWithRetry((key) => {
      // 1. Groq API (Verified 200 OK with qwen/qwen3.8-27b)
      if (key.startsWith('gsk_')) {
        return fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: 'You are a professional bilingual translator. Translate accurately and naturally. Preserve names, numbers, prices, dates, addresses, product codes, technical terms, and brand names. Do not add explanation or formatting. Return only the translated text.'
              },
              {
                role: 'user',
                content: `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`
              }
            ]
          })
        });
      }
      
      // 2. OpenAI API
      if (key.startsWith('sk-')) {
        return fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: 'You are a professional bilingual translator. Translate accurately and naturally. Return only the translated text.'
              },
              {
                role: 'user',
                content: `Translate from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`
              }
            ]
          })
        });
      }

      // 3. Google Gemini
      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a professional bilingual translator. Translate accurately and naturally. Preserve names, numbers, prices, dates, addresses, product codes, technical terms, and brand names. Do not add explanation. Do not summarize. Return only the translated result.\n\nTranslate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`
            }]
          }],
          generationConfig: { temperature: 0.3 }
        })
      });
    });

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    return '';
  } catch (error) {
    console.error("Translation API error:", error);
    throw new Error(error.message || "Lỗi kết nối API. Hãy kiểm tra lại API Key.");
  }
}

// Chuyển đổi giọng nói thành văn bản thuần (Yap Voice-to-Text)
export async function transcribeAudioOnly({ audioBlob, base64Audio, mimeType, language = 'vi' }) {
  try {
    const response = await fetchWithRetry(async (key) => {
      // 1. Groq Whisper (Siêu nhanh, miễn phí)
      if (key.startsWith('gsk_')) {
        const formData = new FormData();
        const blobToUse = audioBlob || new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: mimeType || 'audio/webm' });
        const file = new File([blobToUse], 'audio.webm', { type: mimeType || 'audio/webm' });
        formData.append('file', file);
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', language === 'vi' ? 'vi' : language);
        formData.append('response_format', 'json');

        return fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`
          },
          body: formData
        });
      }

      // 2. OpenAI Whisper
      if (key.startsWith('sk-')) {
        const formData = new FormData();
        const blobToUse = audioBlob || new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: mimeType || 'audio/webm' });
        const file = new File([blobToUse], 'audio.webm', { type: mimeType || 'audio/webm' });
        formData.append('file', file);
        formData.append('model', 'whisper-1');
        formData.append('language', language === 'vi' ? 'vi' : language);

        return fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`
          },
          body: formData
        });
      }

      // 3. Google Gemini Audio
      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert speech recognition system. Transcribe the audio accurately into Vietnamese (or the spoken language). Fix punctuation, capitalization, and spelling. Do not add any explanation or preamble. Return ONLY the transcribed text.`
            }, {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: base64Audio
              }
            }]
          }],
          generationConfig: {
            temperature: 0.1
          }
        })
      });
    });

    const data = await response.json();
    if (data.text) {
      return data.text.trim();
    }
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    return '';
  } catch (error) {
    console.error("Transcribe API error:", error);
    throw new Error(error.message || "Lỗi khi nhận diện giọng nói.");
  }
}

// Yap AI Refine / Chuẩn hóa văn bản theo chế độ
export async function refineTextWithAI({ text, mode = 'exact', customPrompt = '' }) {
  if (!text || !text.trim()) return '';

  let systemPrompt = 'Bạn là trợ lý AI chuyên xử lý văn bản tiếng Việt từ giọng nói (Yap AI).';
  let userPrompt = '';

  switch (mode) {
    case 'work':
      userPrompt = `Viết lại đoạn văn sau thành văn phong chuẩn mực công việc, lưu loát, chuyên nghiệp và rõ ràng, giữ trọn vẹn thông tin:\n\n"${text}"\n\nChỉ trả về văn bản kết quả, không thêm giải thích hay lời mở đầu.`;
      break;
    case 'summary':
      userPrompt = `Tóm tắt các ý chính trong đoạn văn sau thành các gạch đầu dòng ngắn gọn, súc tích:\n\n"${text}"\n\nChỉ trả về kết quả tóm tắt.`;
      break;
    case 'message':
      userPrompt = `Viết lại đoạn văn sau thành một tin nhắn (Zalo/SMS/Email) ngắn gọn, lịch sự, thân thiện và dễ đọc:\n\n"${text}"\n\nChỉ trả về nội dung tin nhắn.`;
      break;
    case 'english':
      userPrompt = `Dịch đoạn văn bản sau sang tiếng Anh tự nhiên, chuẩn xác:\n\n"${text}"\n\nChỉ trả về bản dịch tiếng Anh.`;
      break;
    case 'custom':
      userPrompt = `${customPrompt || 'Hãy viết lại đoạn sau cho hay hơn'}:\n\n"${text}"\n\nChỉ trả về kết quả.`;
      break;
    case 'exact':
    default:
      userPrompt = `Sửa lỗi chính tả, thêm dấu chấm câu và viết hoa cho chuẩn xác đoạn văn sau, giữ nguyên toàn bộ từ ngữ gốc:\n\n"${text}"\n\nChỉ trả về đoạn văn đã sửa.`;
      break;
  }

  try {
    const response = await fetchWithRetry((key) => {
      // 1. Groq (qwen/qwen3.8-27b)
      if (key.startsWith('gsk_')) {
        return fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            temperature: 0.3,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        });
      }

      // 2. OpenAI
      if (key.startsWith('sk-')) {
        return fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        });
      }

      // 3. Gemini
      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: { temperature: 0.3 }
        })
      });
    });

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    return data.choices?.[0]?.text?.trim() || '';
  } catch (error) {
    console.error("Refine API error:", error);
    throw new Error(error.message || "Lỗi khi xử lý AI.");
  }
}

// Yap AI Chat Assistant
export async function chatWithAI({ messages }) {
  try {
    const response = await fetchWithRetry((key) => {
      // Groq
      if (key.startsWith('gsk_')) {
        return fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            temperature: 0.5,
            messages: [
              { role: 'system', content: 'Bạn là Yap AI - Trợ lý thông minh đa năng, hỗ trợ trả lời câu hỏi, soạn thảo văn bản, tóm tắt và dịch thuật bằng tiếng Việt tự nhiên và hữu ích.' },
              ...messages
            ]
          })
        });
      }

      // OpenAI
      if (key.startsWith('sk-')) {
        return fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.5,
            messages: [
              { role: 'system', content: 'Bạn là Yap AI - Trợ lý thông minh đa năng bằng tiếng Việt.' },
              ...messages
            ]
          })
        });
      }

      // Gemini
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'Bạn là Yap AI - Trợ lý thông minh đa năng bằng tiếng Việt.' }]
          },
          contents,
          generationConfig: { temperature: 0.5 }
        })
      });
    });

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    return '';
  } catch (error) {
    console.error("Chat API error:", error);
    throw new Error(error.message || "Lỗi khi trò chuyện với AI.");
  }
}

export async function transcribeAndTranslateAudio({ base64Audio, mimeType, sourceLang, targetLang }) {
  try {
    const response = await fetchWithRetry((key) => {
      // 1. Groq
      if (key.startsWith('gsk_')) {
        const blobToUse = new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: mimeType || 'audio/webm' });
        const formData = new FormData();
        formData.append('file', new File([blobToUse], 'audio.webm', { type: mimeType || 'audio/webm' }));
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('response_format', 'json');

        return fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}` },
          body: formData
        });
      }

      // 2. Gemini
      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert bilingual transcriber and translator. Listen to the audio.
1. Identify if the audio is spoken in ${sourceLang} or ${targetLang}.
2. Transcribe the original speech exactly in the identified language.
3. Translate it accurately to the OTHER language.
Return ONLY a valid JSON object in this exact format, with no markdown code blocks:
{"transcript": "original text here", "translation": "translated text here"}`
            }, {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: base64Audio
              }
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });
    });

    const data = await response.json();
    if (data.text) {
      // Whisper returns transcript -> translate it with translateText
      const transcript = data.text.trim();
      const translation = await translateText({ text: transcript, sourceLanguage: sourceLang, targetLanguage: targetLang });
      return { transcript, translation };
    }
    const resultText = data.candidates[0].content.parts[0].text.trim();
    return JSON.parse(resultText); // { transcript, translation }
  } catch (error) {
    console.error("Transcription API error:", error);
    throw new Error(error.message || "Lỗi khi xử lý âm thanh.");
  }
}
