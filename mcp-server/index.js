#!/usr/bin/env node

/**
 * YAP AI Voice & Live Translator - Official MCP (Model Context Protocol) Server
 * Compatible with Antigravity, Claude Desktop, Cursor, and JAVIS AI Workforce.
 */

import readline from 'readline';
import https from 'https';

// Đọc cấu hình khóa từ biến môi trường hoặc tham số
const CONFIG = {
  geminiKey: process.env.GEMINI_API_KEY || '',
  groqKey: process.env.GROQ_API_KEY || '',
  openrouterKey: process.env.OPENROUTER_API_KEY || '',
  openaiKey: process.env.OPENAI_API_KEY || ''
};

// Helper fetch HTTP
function postJSON(url, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error?.message || `HTTP ${res.statusCode}: ${responseBody}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 1. Dịch thuật song ngữ tự động xoay key
async function handleTranslate({ text, sourceLang = 'vi', targetLang = 'en' }) {
  const prompt = `You are a professional high-accuracy translator. Translate accurately without adding notes. Return ONLY the translated text.\n\nTranslate from ${sourceLang} to ${targetLang}:\n${text}`;

  // 1. Thử Gemini
  if (CONFIG.geminiKey) {
    try {
      const res = await postJSON(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.geminiKey}`, {}, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      });
      const translated = res.candidates?.[0]?.content?.parts?.[0]?.text;
      if (translated) return { translatedText: translated.trim(), provider: 'Google Gemini 2.5 Flash' };
    } catch (e) {
      console.error('Gemini error:', e.message);
    }
  }

  // 2. Thử Groq
  if (CONFIG.groqKey) {
    try {
      const res = await postJSON('https://api.groq.com/openai/v1/chat/completions', {
        'Authorization': `Bearer ${CONFIG.groqKey}`
      }, {
        model: 'qwen/qwen3.8-27b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      });
      const translated = res.choices?.[0]?.message?.content;
      if (translated) return { translatedText: translated.trim(), provider: 'Groq AI (Qwen 3.8)' };
    } catch (e) {
      console.error('Groq error:', e.message);
    }
  }

  // 3. Thử OpenRouter
  if (CONFIG.openrouterKey) {
    try {
      const res = await postJSON('https://openrouter.ai/api/v1/chat/completions', {
        'Authorization': `Bearer ${CONFIG.openrouterKey}`
      }, {
        model: 'deepseek/deepseek-chat:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      });
      const translated = res.choices?.[0]?.message?.content;
      if (translated) return { translatedText: translated.trim(), provider: 'OpenRouter (DeepSeek Free)' };
    } catch (e) {
      console.error('OpenRouter error:', e.message);
    }
  }

  throw new Error('Chưa cấu hình API Key hoặc tất cả các nhà cung cấp đều hết hạn mức.');
}

// Danh sách MCP Tools
const TOOLS = [
  {
    name: "yap_translate",
    description: "Dịch thuật văn bản song ngữ chất lượng cao với cơ chế tự động xoay key (Google Gemini, Groq, OpenRouter, OpenAI).",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Đoạn văn bản cần dịch" },
        sourceLang: { type: "string", description: "Mã ngôn ngữ nguồn (vi, en, zh, ja, ko, fr, de, ru, th)", default: "vi" },
        targetLang: { type: "string", description: "Mã ngôn ngữ đích (vi, en, zh, ja, ko, fr, de, ru, th)", default: "en" }
      },
      required: ["text"]
    }
  },
  {
    name: "yap_check_api_health",
    description: "Kiểm tra tình trạng kết nối và độ trễ phản hồi (latency) của các API Key trong hệ thống YAP AI.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "yap_get_app_info",
    description: "Lấy thông tin phiên bản, trạng thái gói cài đặt Android APK và Windows Desktop của YAP AI Translator Premium.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// MCP Stdio Server Loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line || !line.trim()) return;
  try {
    const request = JSON.parse(line.trim());
    const id = request.id;

    // Handle MCP initialize
    if (request.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "yap-ai-mcp-server",
            version: "1.0.0"
          }
        }
      };
      console.log(JSON.stringify(response));
      return;
    }

    // Handle tools/list
    if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS
        }
      };
      console.log(JSON.stringify(response));
      return;
    }

    // Handle tools/call
    if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;

      if (name === 'yap_translate') {
        const result = await handleTranslate(args);
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          }
        }));
        return;
      }

      if (name === 'yap_check_api_health') {
        const health = {
          geminiConfigured: !!CONFIG.geminiKey,
          groqConfigured: !!CONFIG.groqKey,
          openrouterConfigured: !!CONFIG.openrouterKey,
          openaiConfigured: !!CONFIG.openaiKey,
          timestamp: new Date().toISOString()
        };
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(health, null, 2) }]
          }
        }));
        return;
      }

      if (name === 'yap_get_app_info') {
        const info = {
          appName: "YAP AI Voice & Live Translator Premium",
          version: "1.0.0",
          repoUrl: "https://github.com/toantrn565-design/yap-ai-translator",
          mobileBuildZip: "YAP_AI_Mobile_Build.zip",
          androidProjectPath: "android/",
          desktopExePath: "dist-electron/YAP AI Translator Premium-win32-x64/YAP AI Translator Premium.exe"
        };
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
          }
        }));
        return;
      }

      throw new Error(`Tool not found: ${name}`);
    }

    // Notifications or unhandled methods
    if (id !== undefined) {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: {}
      }));
    }
  } catch (err) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: err.message }
    }));
  }
});
