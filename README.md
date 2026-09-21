# 💎 YAP AI Voice & Live Translator - PREMIUM EDITION

> **Ứng dụng Gõ Giọng Nói Chuẩn Hóa & Dịch Thuật Đàm Thoại Song Ngữ 2 Chiều Siêu Tốc (0.01s)**  
> Tích hợp hệ thống AI đa tầng: **Google Gemini 2.5 Flash**, **Groq AI (Whisper Large V3 Turbo + Qwen 3.8)**, **OpenRouter (DeepSeek R1 / Llama 3.3 Free)**, và **OpenAI (GPT-4o Mini)**.

---

## 🌟 Tính Năng Nổi Bật (Premium Features)

1. **🎙️ Gõ Giọng Nói Chuẩn Hóa (Voice Dictation Studio):**
   - Tự động sửa lỗi chính tả, ngắt câu và thêm dấu câu chuẩn xác.
   - 5 chế độ xử lý AI: *Chính xác*, *Công việc*, *Tin nhắn Zalo/SMS*, *Tóm tắt ý chính*, *Dịch sang Tiếng Anh*.

2. **🌐 Dịch Đàm Thoại 2 Chiều Song Ngữ (Dual Split Screen):**
   - Hiển thị song song 2 màn hình độc lập (🇻🇳 Tiếng Việt & 🇺🇸 Tiếng Anh / Ngoại ngữ).
   - Bấm nói từng bên &rarr; Tự động dịch và phát loa giọng bản xứ cho đối phương nghe.
   - Tự động sao chép (Auto-Copy) câu dịch để gửi ngay sang Zalo / Messenger.

3. **🤖 Trợ Lý AI Đa Phương Tiện (Multimodal Assistant):**
   - **📸 Chụp ảnh Camera / Upload ảnh (OCR):** Quét chữ và dịch trực tiếp từ hóa đơn, tài liệu, bảng hiệu.
   - **📎 Tải tài liệu (PDF, Word, TXT):** Đọc và tóm tắt / dịch toàn bộ nội dung file.
   - **🎙️ Giao tiếp giọng nói trực tiếp:** Nói chuyện qua Micro với trợ lý AI và nghe phản hồi bằng loa.

4. **🔄 Hệ Thống Tự Động Xoay Key (Auto-Failover):**
   - Luôn ưu tiên Google Gemini #1 &rarr; Tự động chuyển Groq / OpenRouter / OpenAI khi hết hạn mức (Quota).

5. **⚡ Phím Tắt Toàn Hệ Thống Trên PC (Windows):**
   - `Alt + Space`: Gọi nhanh ứng dụng từ bất kỳ đâu.
   - `Alt + D`: Dịch nhanh văn bản đang bôi đen.

---

## 📦 Các Gói Cài Đặt (Distribution Packages)

| Nền Tảng | Tên Gói / Đường Dẫn | Ghi Chú |
| :--- | :--- | :--- |
| **Windows PC Desktop** | `dist-electron/YAP AI Translator Premium-win32-x64/YAP AI Translator Premium.exe` | Bản Portable chạy ngay không cần cài đặt |
| **Launcher Bấm Nhanh PC** | `CHAY_YAP_AI_PC_PREMIUM.bat` | Bấm 1 chạm để mở app trên máy tính |
| **Mobile & Web PWA** | `YAP_AI_Mobile_Build_PREMIUM.zip` | Kéo thả vào Netlify để cập nhật |
| **Android Native APK** | `android/` | Dự án Capacitor Android Studio sẵn sàng xuất APK |
| **MCP Server** | `mcp-server/index.js` | Cổng kết nối AI Agents toàn cầu |

---

## 🚀 Cài Đặt & Phát Triển (Development)

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy môi trường phát triển (Dev Server)
npm run dev

# 3. Chạy bản Desktop Electron
npm run desktop

# 4. Đóng gói bản Web / Mobile PWA
npm run build

# 5. Đóng gói bản Windows Desktop Portable
npm run package

# 6. Đồng bộ sang Android Native
npx cap sync android
```

---

## 📄 Bản Quyền
© 2026 **YAP AI Translator Premium Team**. All rights reserved.
