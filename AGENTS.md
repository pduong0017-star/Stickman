# Scarlet Sheath (Stickman) — Workspace Agent Rules

## 1. Kiến Trúc Thư Mục & Server Chạy Thật (Symlinked Build Runner)
- **Mã nguồn gốc (Shared Storage):** `/storage/emulated/0/Antigravity/Stickman`
- **Thư mục chạy Vite Server & `node_modules` (Internal):** `/data/user/0/com.agy/files/stickman-build`
- **Cơ chế đồng bộ tự động (Symlink):**
  - `src`, `public`, `tests`, `index.html` trong `/data/user/0/com.agy/files/stickman-build/` (và cả `$HOME/.gemini/antigravity-app/scratch/stickman-build/`) là **symlink** trỏ thẳng về `/storage/emulated/0/Antigravity/Stickman/`.
  - `vite.config.ts` (bật `preserveSymlinks: true`) và `node_modules` phải là file/thư mục thật nằm trong `stickman-build` (vì Android chặn nạp thư viện native `lightningcss.android-arm64.node` từ `/storage/emulated/0`).
  - **TUYỆT ĐỐI KHÔNG** xóa symlink `src` để chép đè thư mục thường vào `stickman-build`. Nếu sửa `vite.config.ts` hoặc `package.json`, hãy copy sang `/data/user/0/com.agy/files/stickman-build/`.

## 2. Lệnh Kiểm Tra, Chạy Server & Build Chuẩn
- **Kiểm tra TypeScript (không dùng `npx tsc` trần gây treo hỏi cài gói):**
  ```bash
  node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
  ```
- **Kiểm tra / Khởi động Dev Server (`http://127.0.0.1:3000`):**
  Chạy tại `Cwd: /data/user/0/com.agy/files/stickman-build`:
  ```bash
  node node_modules/vite/bin/vite.js --port=3000 --host=127.0.0.1
  ```
- **Build Production & cập nhật `dist/`:**
  Chạy tại `Cwd: /data/user/0/com.agy/files/stickman-build`:
  ```bash
  node node_modules/vite/bin/vite.js build && cp -r dist/. "/storage/emulated/0/Antigravity/Stickman/dist/"
  ```

## 3. Bất Biến Kỹ Thuật Bắt Buộc
- Không dùng `ctx.shadowBlur` trong `src/`.
- Không dùng `performance.now()` trong `src/game/renderer/`.
- Cân bằng tuyệt đối `ctx.save()` / `ctx.restore()` trong mọi hàm render.
