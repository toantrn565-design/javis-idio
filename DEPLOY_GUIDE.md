# Hướng dẫn đưa App Dịch thuật AI lên Online (Vercel / Netlify)

Để sử dụng ứng dụng này ở bất kỳ đâu (trên điện thoại iPhone, Android, máy tính bảng hay máy tính khác), anh có thể đưa ứng dụng lên các nền tảng đám mây miễn phí như Vercel hoặc Netlify. Dưới đây là hướng dẫn nhanh:

---

## ⚡ Cách 1: Triển khai nhanh qua Vercel (Khuyên dùng)

1. **Đăng ký/Đăng nhập:** Truy cập [Vercel.com](https://vercel.com/) và đăng nhập (bằng tài khoản GitHub của anh hoặc đăng ký tài khoản email thông thường).
2. **Cài đặt Vercel CLI (Nếu muốn triển khai trực tiếp từ dòng lệnh):**
   * Mở terminal/CMD tại thư mục `04_igren-ai-translator` và chạy lệnh:
     ```bash
     npm install -g vercel
     ```
   * Tiếp tục gõ lệnh:
     ```bash
     vercel login
     ```
     (Làm theo hướng dẫn trên trình duyệt để xác thực).
   * Triển khai app lên internet bằng lệnh duy nhất:
     ```bash
     vercel --prod
     ```
     *Hệ thống sẽ tự động hỏi một số câu cấu hình đơn giản (nhấn Enter để chọn mặc định).* Sau 1 phút, anh sẽ nhận được một đường dẫn công khai dạng: `https://igren-ai-translator-xxxx.vercel.app`

3. **Cập nhật API Key trên Web:**
   * Sau khi truy cập đường dẫn web của anh, hãy nhấp vào phần **Cài đặt** (Settings) trên App để điền các API Key Gemini của anh vào (phân tách bằng dấu phẩy). Dữ liệu này được lưu bảo mật ngay trên thiết bị của anh (LocalStorage) mà không bị lộ lên máy chủ.

---

## ☁️ Cách 2: Triển khai thủ công (Không cần dùng dòng lệnh CLI)

1. Chạy lệnh build sinh ra thư mục tĩnh tại máy tính của anh:
   ```bash
   npm run build
   ```
2. Thư mục `dist` sẽ được tạo ra chứa toàn bộ mã nguồn của trang web.
3. Truy cập **[Netlify Drop](https://app.netlify.com/drop)**.
4. Kéo thả trực tiếp thư mục `dist` vừa tạo ở trên vào ô kéo thả của Netlify.
5. Netlify sẽ tự động tải lên và cấp cho anh một đường link website hoạt động tức thì!

---

## 📲 Cách cài đặt thành App trên Điện thoại (PWA)

Vì ứng dụng đã được em tích hợp sẵn **PWA (Progressive Web App)**:
* **Trên iPhone (Safari):** Truy cập đường link web của anh > Bấm nút **Chia sẻ** (Share) > Chọn **Thêm vào màn hình chính** (Add to Home Screen).
* **Trên Android (Chrome):** Truy cập đường link web của anh > Nhấn nút menu 3 chấm ở góc phải > Chọn **Cài đặt ứng dụng** (Install app).

Lúc này, biểu tượng ứng dụng **IGREN AI** sẽ xuất hiện trên màn hình điện thoại của anh và hoạt động giống hệt một app di động tải về từ App Store/CH Play, giao diện toàn màn hình cực kỳ mượt mà!
