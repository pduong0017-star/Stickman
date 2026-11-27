# Scarlet Sheath (Stickman) — Tổng Hợp Dự Án & Handoff Cho Chat Mới

## 1. Thông Tin Môi Trường & Lệnh Chạy Nhanh (Android)
- **Thư mục mã nguồn chính (Shared Storage, `noexec`):** `/storage/emulated/0/Antigravity/Stickman`
- **Thư mục build & chạy lệnh (Internal, có `node_modules`):** `/data/user/0/com.agy/files/stickman-build`
- **Đồng bộ mã nguồn sang mirror build:**
  ```bash
  cp -r "/storage/emulated/0/Antigravity/Stickman/src" "/storage/emulated/0/Antigravity/Stickman/tests" "/data/user/0/com.agy/files/stickman-build/"
  ```
- **Chạy Unit Test (17/17 pass):**
  ```bash
  ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts
  ```
- **Chạy E2E Test Mirage (12/12) & Chrono (8/8):**
  ```bash
  NODE_OPTIONS="--max-old-space-size=2048" ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs tests/e2e/r4_mirage.e2e.test.ts tests/e2e/r5_chrono.e2e.test.ts
  ```
- **Build Production & đồng bộ `dist/`:**
  ```bash
  node node_modules/vite/bin/vite.js build && cp -r "/data/user/0/com.agy/files/stickman-build/dist" "/storage/emulated/0/Antigravity/Stickman/"
  ```
- **Chạy Dev Server (cổng 3000):**
  ```bash
  node node_modules/vite/bin/vite.js --port=3000 --host=127.0.0.1
  ```

---

## 2. Quy Tắc Kỹ Thuật Bắt Buộc (Invariants)
- **KHÔNG dùng `ctx.shadowBlur`** trong toàn bộ `src/` (gây lag nặng trên Android Canvas 2D).
- **KHÔNG dùng `performance.now()`** bên trong `src/game/renderer/`.
- **Cân bằng tuyệt đối `ctx.save()` / `ctx.restore()`** (`depth === 0` sau mỗi frame).
- Giữ tệp `.nomedia` trong `/storage/emulated/0/Antigravity/`.

---

## 3. Toàn Bộ Tính Năng Đã Hoàn Thành

### A. 8 Nhân Vật Chơi Được (Mỗi tướng có Kanji, `[U]` skill, Thức Tỉnh & Tuyệt kỹ Nộ riêng 100%)
1. **`kuro`** (`斬` — Hắc Kiếm Sĩ): Katana, Tường Băng (`cryo_wall`), có thêm skin Thần Thoại `eclipse_ronin`.
2. **`raijin`** (`雷` — Lôi Thương): Lôi Thương, Lôi Thiểm (`thunder_blink`).
3. **`kagura`** (`炎` — Hỏa Đao): Hỏa Đại Đao, Cột Dung Nham (`magma_eruption`).
4. **`zero`** (`影` — Ảnh Sát): Song Đoản Đao, Phi Đao Ảnh Bộ (`phantom_barrage`).
5. **`aether`** (`虹` — Đại Pháp Sư Cận Chiến · VIP): Đã buff `maxHp: 215`, `reachBonus: 36`, `damageMultiplier: 1.14`, thêm **Arcane Ward** (`+8 HP` & `0.42s` hộ thể khi dùng `[U]`), nâng cấp VFX Thức Tỉnh & Tuyệt kỹ `arcane_supernova`.
6. **`valkyrie`** (`聖` — Thánh Quang Chiến Nữ): Thiên Kích Boomerang (`ValkyrieBoomerang` bay xuyên & hút quái khi quay về), Thức Tỉnh cột sáng + lông vũ + tự ném Kích, Tuyệt kỹ `renderValkyrieAscension` độc quyền + 2 skin `celestial_empress` (Thần Thoại) & `abyssal_valkyrie` (Huyền Thoại).
7. **`mirage`** (`鏡` — Ảnh Kính Hư Không):
   - Đánh bằng **mảnh gương & vết nứt không gian** (`mirror_fracture` / `void_prism_fracture`, không có vệt chém kiếm).
   - `[U]` mở **Cổng Gương Hư Không (`MirrorRift`)** phản xạ đạn địch; **tương tác trực tiếp**: đánh `[J]` làm nổ bão 5 mảnh kính, lướt `Dash` xuyên cổng kích hoạt **Mirror Warp**.
   - Skin Thần Thoại **`Ma Kính (void_shatterer)`** có tạo hình độc bản và **Bành Trướng Lãnh Địa Ma Kính** đổi trực tiếp map đấu trường (`DomainKind = 'mirage'`).
8. **`chrono`** (`時` — Kiếm Sĩ Thời Gian):
   - Vũ khí **Kim Đồng Hồ / Song Kim Thần Thời Gian**, phụ kiện **Bánh Răng Thời Gian**, vệt chém bánh răng/số La Mã.
   - `[U]` **Phân Thân Quá Khứ (`TemporalEcho`)**: vẽ full xương bằng `renderStickman`, ghi lịch sử tư thế & chém bồi trễ `0.4s`.
   - `[I]` **Ngưng Đọng Toàn Cầu (`renderTimeStop`)**: đóng băng quái/Boss/đạn `3.5s` (`4.2s` Thức Tỉnh), tích dồn sát thương rồi kích nổ đồng loạt.
   - Skin Thần Thoại **`Thần Thời Gian (chrono_sovereign)`** có ngoại hình độc bản và **Bành Trướng Lãnh Địa Tháp Đồng Hồ Cổ Đại** đổi trực tiếp map (`DomainKind = 'chrono'`).

### B. 12 Màn Chiến Dịch, 12 Boss & Cơ Chế Chống Nhàm Chán
- Đã xoá 4 map lỗi cũ và xây mới hoàn chỉnh màn `09`–`12` với 4 Boss mới (`boss_raiden`, `boss_akaza`, `boss_kronos`, `boss_omega`).
- Thêm 2 loại quái mới (`frost_mage`, `berserker_reaper`), Tinh Thể Đấu Trường (`SoulCrystal`), Nhiệm Vụ Đợt Quái (Wave Bounties), và 4 Ấn Chú mới (`chain_lightning`, `meteor_slam`, `blade_storm`, `phoenix_grace`).

### C. Đồ Hoạ Thủy Mặc / Ink-Wash & Giao Diện Thương Mại
- Toàn bộ 8 nhân vật, skin, quái thường/Tinh Anh, 12 Boss và 12 đấu trường đã nâng cấp lên phong cách **Thủy mặc / Ink-Wash** (nét bút lông vuốt nhọn, rim-light, sương giấy xuyến chỉ trung cảnh).
- Giao diện sảnh chờ (`TitleScreen.tsx`) thiết kế lại dạng **Tab (Nhân vật / Trang phục / Màn chơi) + Carousel cuộn ngang** không bị dài ra khi thêm tướng/màn mới.

### D. Hệ Thống Xương (Procedural Rig), Tốc Độ Chiến Đấu & AI Quái
- Sửa triệt để lỗi gập gối/cúi lưng (lỗi kẹp Pythagoras `hipBaseY` và bộ lọc `stepSkeletonBlend`): dáng đứng thẳng tự nhiên, dáng chạy Naruto nghiêng `39°` sải chân `65.9px`, dáng lướt nghiêng `60°` kèm 5 lớp bóng mờ.
- Tốc độ di chuyển `1.5x`, Dash `3.3x`, startup đòn đánh ~2 frames (`38ms`), hỗ trợ Animation Cancel (Dash/Jump/Parry).
- AI Quái hiếu chiến hơn: xoá đứng chờ thụ động, quái kiếm biết bọc sườn/backstep/combo 2–3 hit, quái khiên che chắn & phản đòn tức thì, tỉ lệ `30%` tự đỡ đòn/nhảy lùi sau 3 hit liên tiếp.

---

## 4. Bản Đồ Các File Chính
- `src/game/types.ts` — Kiểu dữ liệu lõi (`CharacterId`, `SkinId`, `SlashVfxMotif`, `DomainKind`...).
- `src/game/characters.ts` — Roster 8 nhân vật, chỉ số, kỹ năng & toàn bộ skin.
- `src/game/skinVfx.ts` — Bảng cấu hình VFX cho từng cặp `characterId:skinId`.
- `src/game/synergy.ts` — Hệ thống Ấn Chú nguyên tố cho cả 8 nhân vật.
- `src/game/animation.ts` — Move table, `UltimateStyleId`, `blendSkeleton`, `animeSwingCurve`.
- `src/game/poses/poseMath.ts` & `src/game/poses/*Poses.ts` — Toán học IK 2 xương & dáng đứng/chạy/lướt của từng nhân vật.
- `src/game/StickmanRenderer.ts` — Bộ render nhân vật Thủy mặc chính.
- `src/game/renderer/inkStyle.ts` — Bảng màu mực tàu `SkinInkPalette`.
- `src/game/renderer/weapons.ts`, `gear.ts`, `trails.ts`, `types.ts` — Vũ khí, giáp/mũ/cánh/bánh răng, vệt chém & dư ảnh.
- `src/game/Entities.ts` — Các thực thể chiến đấu (`Projectile`, `IceWall`, `MagmaPillar`, `SoulCrystal`, `ValkyrieBoomerang`, `MirrorRift`, `TemporalEcho`).
- `src/game/Player.ts` — Điều khiển người chơi, combo, cancel, `[U]` skill, Thức Tỉnh.
- `src/game/Enemy.ts`, `Boss.ts`, `enemyVisuals.ts` — AI & tạo hình quái thường, Tinh Anh, 12 Boss.
- `src/game/Game.ts` — Vòng lặp game chính, va chạm, Time Stop, Domain Expansion, tương tác `MirrorRift` & `TemporalEcho`.
- `src/game/UltimateCutscene.ts` — Cutscene Tuyệt kỹ Nộ riêng cho cả 8 nhân vật.
- `src/game/PeriodicTableBG.ts` & `stages.ts` — 12 đấu trường + nền Bành Trướng Lãnh Địa (`mirage` & `chrono`).
- `src/components/TitleScreen.tsx` & `GameHUD.tsx` — Sảnh chờ thương mại & HUD trong trận.
- `src/game/rules.test.ts`, `tests/e2e/r4_mirage.e2e.test.ts`, `tests/e2e/r5_chrono.e2e.test.ts` — Toàn bộ kiểm thử tự động (đều đang PASS 100%).
