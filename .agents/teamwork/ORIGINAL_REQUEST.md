# Original User Request

## Initial Request — 2026-11-25T11:09:30Z

Nâng cấp hệ thống hiệu ứng hình ảnh khi vung chiêu (vệt chém / slash trails, aura, hạt hiệu ứng) riêng biệt theo chủ đề của từng skin trong game Stickman (Vite/TypeScript) hiện có, nhằm mang lại trải nghiệm thị giác đẹp mắt và khác biệt rõ rệt giữa các skin ở mức độ bản demo hoàn chỉnh.

Working directory: /storage/emulated/0/Antigravity/Stickman
Integrity mode: development

## Requirements

### R1. Hiệu ứng vung chiêu & vệt chém riêng cho từng skin
Mọi skin hiện có trong game Stickman phải có bộ hiệu ứng vung chiêu (slash trails, vệt vũ khí, aura/hào quang khi ra đòn và các hạt hiệu ứng đi kèm) được thiết kế riêng phù hợp với chủ đề, màu sắc và phong cách của skin đó. Người chơi có thể nhận biết ngay sự khác biệt giữa các skin chỉ qua hiệu ứng ra đòn, không dùng chung một kiểu hiệu ứng mặc định đơn điệu.

### R2. Hiệu năng mượt mà & dọn dẹp vòng đời hiệu ứng
Hệ thống hiệu ứng mới phải vận hành mượt mà trong quá trình chơi liên tục (spam đòn đánh, đổi skin liên tục): các hạt hiệu ứng, vệt chém và aura phải có vòng đời rõ ràng, tự động giải phóng/dọn dẹp sau khi kết thúc để không gây rò rỉ bộ nhớ hay tụt khung hình.

### R3. Tương thích hoàn toàn với game hiện tại
Nâng cấp phải tích hợp liền mạch vào gameplay, hệ thống chọn skin và các chiêu thức/đòn đánh hiện có mà không làm hỏng cơ chế chiến đấu, va chạm, điều khiển hay giao diện sẵn có.

## Acceptance Criteria

### Build & Kiểm tra mã nguồn
- [ ] Lệnh build production (`npm run build`) và kiểm tra kiểu TypeScript (nếu có trong project) chạy thành công với 0 lỗi.
- [ ] Không có lỗi runtime hay uncaught exception trong console trình duyệt khi tải game, chuyển đổi giữa tất cả các skin và thực hiện các đòn đánh/chiêu thức.

### Tính khác biệt giữa các skin (Programmatic & Rubric)
- [ ] Có kiểm thử tự động (test script hoặc unit test) xác nhận 100% các skin hiện có trong game đều được ánh xạ tới cấu hình hiệu ứng vung chiêu riêng biệt (không có 2 skin nào dùng chung cấu hình hiệu ứng giống hệt nhau).
- [ ] Kiểm tra trực quan (chụp ảnh màn hình hoặc đánh giá độc lập theo tiêu chí) xác nhận khi đổi sang từng skin và vung chiêu, vệt chém/aura hiển thị rõ ràng, khớp với chủ đề màu sắc/phong cách của skin và dễ phân biệt bằng mắt thường.

### Độ ổn định & Hiệu năng
- [ ] Kiểm thử mô phỏng việc tung đòn liên tục (ví dụ >= 50 lần vung chiêu) xác nhận số lượng thực thể hiệu ứng/hạt đang hoạt động trở về 0 (hoặc mức nền ổn định) sau khi hiệu ứng kết thúc, không tăng tuyến tính vô hạn.

## Follow-up — 2026-11-25T17:33:57Z

Requested team: Full team — phân chia mỗi agent phụ trách đại tu dáng & chuyển động cho từng nhân vật (Kuro, Raijin, Kagura, Zero, Aether).

Đại tu toàn bộ hệ thống tư thế và chuyển động cơ bản (chạy, lướt, nhảy, rơi, đáp đất, đỡ/parry, đứng yên) cho cả 5 nhân vật (`kuro`, `raijin`, `kagura`, `zero`, `aether`) trong game Stickman theo phong cách **Anime Fighting / Hyuns Dojo** (dứt khoát, mạnh mẽ, có trọng lực và độ vươn khớp rõ ràng, loại bỏ hoàn toàn dáng "rón rén").

Working directory: /storage/emulated/0/Antigravity/Stickman
Integrity mode: development

## Requirements

### R1. Đại tu tư thế & chuyển động chuẩn Anime Fighting cho từng nhân vật
Mỗi nhân vật trong 5 nhân vật (`kuro`, `raijin`, `kagura`, `zero`, `aether`) phải có bộ chuyển động cơ bản riêng biệt, dứt khoát và có lực:
- **Chạy (Run)**: Thân chúi về phía trước, sải chân rộng có pha đẩy/thu chân rõ ràng (không rón rén bước ngắn), tay/vũ khí đánh nhịp hoặc kéo về sau đúng khí chất từng nhân vật.
- **Lướt (Dash)**: Thân hạ thấp sát mặt đất, duỗi thẳng trục người theo hướng lướt, chân sau đạp thẳng tạo lực đẩy.
- **Nhảy & Rơi (Jump / Fall)**: Có pha bật nhảy vươn người/cuộn gọn rõ ràng khi lên cao và tư thế giữ thăng bằng/chuẩn bị tiếp đất khi rơi xuống.
- **Đáp đất (Land)**: Nén gối, hạ trọng tâm dứt khoát rồi đàn hồi về tư thế đứng chiến đấu (không cứng đơ).
- **Đỡ / Parry (Guard / Parry)**: Thủ thế chắc chắn, chân trụ vững, tay/vũ khí (hoặc vòng ma pháp đối với Aether) chắn đúng hướng đòn.

### R2. Chuyển tiếp mượt mà & không gãy khớp
Mọi chuyển đổi giữa các trạng thái (`idle` ↔ `run` ↔ `dash` ↔ `jump` ↔ `fall` ↔ `land` ↔ `parry`) phải mượt mà, không bị giật cục, không đảo ngược khớp bất thường (khuỷu tay/đầu gối gập sai chiều) và không sinh giá trị `NaN` trong tọa độ xương.

### R3. Tương thích hoàn toàn với gameplay & bản build
Thay đổi chỉ nâng cấp phần tư thế/animation và không làm hỏng hitbox, tốc độ di chuyển, cơ chế chiến đấu, 12+ skin hay các bài test hiện có. Đồng thời build lại bản production (`dist/`) sạch lỗi.

## Acceptance Criteria

### Kiểm tra mã nguồn & Build
- [ ] Toàn bộ bộ test hiện có (`node tests/e2e/run-e2e.mjs --with-unit --tier=all` hoặc các tier liên quan) chạy pass 100% không lỗi.
- [ ] Build production (`vite build`) thành công 0 lỗi và đồng bộ `dist/` mới nhất.

### Kiểm thử tư thế & khớp xương (Programmatic)
- [ ] Có kiểm thử tự động kiểm tra tất cả 5 nhân vật qua đủ các trạng thái (`run`, `dash`, `jump`, `fall`, `land`, `parry`) xác nhận:
  - Không có tọa độ khớp `NaN` hoặc `Infinity`.
  - Độ nghiêng thân khi chạy/lướt và độ mở sải chân khi chạy đạt ngưỡng rõ ràng (không đứng thẳng đơ/rón rén bước ngắn).
  - Độ cao trọng tâm khi đáp đất (`land`) và lướt (`dash`) thấp hơn rõ rệt so với khi đứng (`idle`).

### Kiểm tra trực quan (Visual Check)
- [ ] Xuất ảnh hoặc kiểm tra render từng trạng thái (`run`, `dash`, `jump`, `land`, `parry`) cho các nhân vật, xác nhận dáng đứng dứt khoát, đẹp mắt, đúng phong cách Anime Fighting.

## Follow-up — 2026-11-26T09:54:29Z

Nâng cấp toàn diện đồ hoạ nhân vật và quái vật cho game hành động đối kháng 2D Stickman ("Scarlet Sheath") theo phong cách Thủy mặc / Ink-Wash kiếm hiệp Nhật Bản (tương phản đen – trắng – đỏ son / mực tàu sắc nét), thay thế hình khối vector đơn giản bằng thiết kế giàu chi tiết, có chiều sâu và đạt chuẩn game thương mại trên di động.

Working directory: /storage/emulated/0/Antigravity/Stickman
Mirror build & test directory (Android noexec workaround): /data/user/0/com.agy/files/stickman-build
Integrity mode: development
Requested team: Full team

## Requirements

### R1. Đồ hoạ Nhân vật chơi được (6 đấu sĩ) theo phong cách Thủy mặc / Ink-Wash
- Nâng cấp toàn bộ 6 nhân vật (`kuro`, `raijin`, `kagura`, `zero`, `aether`, `valkyrie`) và hệ thống skin của họ với đường nét bút lông mực tàu sắc sảo (biến thiên độ dày nét, viền sáng rim-light tương phản cao, mảng đổ bóng cel-shading/ink-wash).
- Làm giàu chi tiết giáp, áo choàng/khăn quàng bay mượt, mũ/phụ kiện đầu, cánh/hào quang Thức Tỉnh và vũ khí phát sáng mang dấu ấn mực tàu – son đỏ – ánh kim đặc trưng cho từng tướng mà vẫn giữ nguyên bản sắc màu của từng skin.

### R2. Đồ hoạ Quái vật & Trùm (12 Boss) đồng bộ phong cách Thủy mặc
- Nâng cấp tạo hình quái thường, quái tinh anh (Elite) và 12 Boss với đường nét mực tàu, giáp/khiên/vũ khí chi tiết, hiệu ứng aura/mắt phát sáng và phân biệt rõ cấp bậc (quái thường / tinh anh / Boss Phase 1 & Phase 2 cuồng nộ).
- Đảm bảo nhân vật và quái luôn nổi bật rõ ràng trên nền đấu trường, không bị chìm màu hay rối mắt khi giao tranh tốc độ cao.

### R3. Hiệu năng & Tương thích chuẩn Android Canvas 2D
- Giữ vững ràng buộc kỹ thuật của engine: tuyệt đối không dùng `ctx.shadowBlur` (gây giật lag trên Android Canvas), giữ cân bằng `ctx.save()` / `ctx.restore()` (= 0 sau mỗi frame), và không phá vỡ logic chiến đấu hay hệ thống xương hiện tại.
- Đồng bộ mã nguồn từ `/storage/emulated/0/Antigravity/Stickman/src` sang `/data/user/0/com.agy/files/stickman-build/src` để chạy kiểm thử và build.

## Acceptance Criteria

### Kiểm thử tự động (Programmatic Verification)
- [ ] Toàn bộ 17/17 unit test trong `src/game/rules.test.ts` vượt qua (`ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts`).
- [ ] Build production Vite (`node node_modules/vite/bin/vite.js build`) thành công không lỗi TypeScript/bundler.
- [ ] Kiểm tra tĩnh đảm bảo không phát sinh `shadowBlur` trong mã render Canvas mới thêm.
- [ ] Kiểm tra render headless (mock Canvas 2D) cho cả 6 nhân vật (trạng thái thường & Thức Tỉnh) và các loại quái/Boss chính đảm bảo cân bằng `save/restore === 0` và không phát sinh NaN/exception.

### Đánh giá chất lượng đồ hoạ (Visual Quality Rubric)
- [ ] Tất cả 6 nhân vật có độ tương phản mực tàu (đen-trắng-đỏ/màu skin), chi tiết giáp/khăn/vũ khí và hào quang nổi bật rõ rệt so với bản gốc.
- [ ] Quái thường, quái tinh anh và Boss có tạo hình sắc nét, dễ phân biệt ngay lập tức trong giao tranh.
- [ ] Giao tranh 60fps mượt mà trên màn hình ngang di động, không có lỗi đồ hoạ thừa hay lệch khớp xương.

## Follow-up — 2026-11-26T10:19:48Z

User update: Please skip the Pillow visual/graphics inspection and heavy visual E2E testing phase — the user will inspect the graphics directly in the browser once finished. Once Wave 2 implementation workers finish, just run the unit tests (rules.test.ts), verify zero shadowBlur & vite build in /data/user/0/com.agy/files/stickman-build, and wrap up cleanly so the user can test in the browser right away.

## Follow-up — 2026-11-26T11:13:35Z

Thiết kế lại toàn diện trải nghiệm chiến đấu, tạo hình skin và cơ chế Bành Trướng Lãnh Địa (Domain Expansion) cho nhân vật thứ 7 MIRAGE (Ảnh Kính Hư Không) trong game Stickman ("Scarlet Sheath"): loại bỏ hoàn toàn vệt chém kiếm vô lý khi dùng gương, biến skin Thần Thoại Ma Kính (`void_shatterer`) thành tạo hình độc bản khác biệt hoàn toàn, cho phép riêng skin Thần Thoại Ma Kính (`void_shatterer`) mở Bành Trướng Lãnh Địa biến đổi trực tiếp bản đồ đấu trường, và cho phép Mirage tương tác vật lý trực tiếp với Cổng Gương Hư Không (`[U]`).

Working directory: /storage/emulated/0/Antigravity/Stickman
Mirror build & test directory (Android noexec workaround): /data/user/0/com.agy/files/stickman-build
Integrity mode: development
Requested team: Full team
Note: Skip heavy Pillow PNG visual inspection / tier4 visual E2E; user will visually inspect directly in the browser after programmatic verification passes.

## Requirements

### R1. Đánh bằng Kính / Mảnh Gương thực thụ (Loại bỏ vệt chém kiếm giả)
- Loại bỏ hoàn toàn các vệt chém vòng cung kiểu kiếm (`slashArc` kiếm thường) trên đòn đánh cơ bản của Mirage.
- Thay thế bằng hiệu ứng chiến đấu đúng chất Kính & Hư Không: vết nứt không gian sắc cạnh, luồng mảnh gương đa giác bay cắt, chớp phản chiếu lăng kính và tia vỡ kính tại điểm va chạm cho cả chuỗi combo mặt đất lẫn trên không.

### R2. Skin Thần Thoại `Ma Kính (void_shatterer)` khác biệt hoàn toàn (Không chỉ đổi màu)
- Thiết kế lại ngoại hình `mirage:void_shatterer` với hình khối, phụ kiện đầu/mặt nạ, áo choàng/giáp, vòng mảnh gương trôi nổi sau lưng và vũ khí khác biệt rõ rệt so với bản `default` (không chỉ thay bảng màu).
- Đồng bộ phong cách Thủy mặc / Ink-Wash tương phản cao, nổi bật trên mọi đấu trường.

### R3. Bành Trướng Lãnh Địa (Domain Expansion) — Độc quyền Skin Thần Thoại `Ma Kính (void_shatterer)`
- Chỉ riêng skin Thần Thoại `mirage:void_shatterer` (khi kích hoạt Thức Tỉnh hoặc sau Tuyệt kỹ Nộ) mới mở Bành Trướng Lãnh Địa: toàn bộ nền đấu trường (`PeriodicTableBG` / arena) chuyển đổi trực tiếp sang Ma Kính Hư Không Giới (bầu trời nứt vỡ đa giác, các khối gương đen-đỏ-xanh trôi nổi, mặt sàn phản chiếu gương vỡ và mảnh kính bay lơ lửng) trong suốt thời gian duy trì lãnh địa, sau đó hoàn nguyên mượt mà về map gốc khi hết giờ. Skin `default` của Mirage KHÔNG đổi map.
- Trong thời gian Bành Trướng Lãnh Địa, Mirage và các Cổng Gương được cường hoá rõ rệt (nối tia gương giữa các cổng, tăng tầm phản xạ và sát thương vỡ kính).

### R4. Tương tác trực tiếp với Cổng Gương Hư Không (`[U]`)
- Cho phép Mirage tương tác chủ động với các `MirrorRift` do mình tạo ra trên sân:
  - Đánh (`[J]`) trúng Cổng Gương: Làm vỡ tung Cổng Gương thành bão mảnh kính xuyên thấu bắn dồn về phía kẻ địch gần nhất (hoặc gây nổ kính diện rộng + kích hoạt chuỗi tương tác).
  - Lướt (`Dash`) xuyên qua Cổng Gương: Dịch chuyển tức thời (Mirror Warp) xuyên không gian ra phía sau kẻ địch gần nhất hoặc sang Cổng Gương còn lại, kèm dư ảnh kính vỡ và hồi ngắn thời gian hồi chiêu.
- Hiển thị phản hồi thị giác & chữ gọi chiêu rõ ràng mỗi khi kích hoạt tương tác với Cổng Gương.

### R5. Hiệu năng & Tương thích Android Canvas 2D
- Tuyệt đối không dùng `ctx.shadowBlur`, giữ cân bằng `ctx.save()` / `ctx.restore() === 0`, không lỗi NaN/exception.
- Đồng bộ mã nguồn sang `/data/user/0/com.agy/files/stickman-build/src` và build sạch production `dist/`.

## Acceptance Criteria

### Kiểm thử tự động (Programmatic Verification)
- [ ] Toàn bộ 17/17 unit test trong `src/game/rules.test.ts` vượt qua.
- [ ] Có kiểm thử tự động xác nhận:
  - Mirage không phát sinh vệt chém kiểu kiếm cơ bản mà dùng hiệu ứng mảnh kính/nứt không gian.
  - Bành Trướng Lãnh Địa chỉ kích hoạt trên skin `mirage:void_shatterer`, biến đổi bản đồ và tự hoàn nguyên khi hết thời gian (skin `default` không đổi map).
  - Đánh vào `MirrorRift` kích hoạt vỡ kính bắn mảnh/gây sát thương; Lướt qua `MirrorRift` kích hoạt Mirror Warp.
- [ ] Build production Vite (`node node_modules/vite/bin/vite.js build`) thành công (exit 0).
- [ ] Kiểm tra tĩnh `0` `shadowBlur` trong toàn bộ `src/` và render headless `save/restore === 0` cho cả 2 skin Mirage (thường, Thức Tỉnh, và trong Lãnh Địa).

## Follow-up — 2026-11-26T15:21:21Z

Làm lại toàn diện từ đầu đến cuối nhân vật thứ 8 CHRONO (Kiếm Sĩ Thời Gian) trong game hành động đối kháng 2D Stickman ("Scarlet Sheath") để khắc phục mọi lỗi và sự sơ sài của bản nháp trước, nâng chất lượng đồ hoạ, tạo hình skin, cơ chế Phân Thân Quá Khứ ([U]), Ngưng Đọng Toàn Cầu ([I]) và Bành Trướng Lãnh Địa Tháp Đồng Hồ Cổ Đại lên chuẩn game thương mại Thủy mặc / Ink-Wash.

Working directory: /storage/emulated/0/Antigravity/Stickman
Mirror build & test directory (Android noexec workaround): /data/user/0/com.agy/files/stickman-build
Integrity mode: development
Requested team: Full team
Note: Skip heavy Pillow PNG visual inspection / tier4 visual E2E; user will inspect directly in the browser once programmatic verification passes.

## Requirements

### R1. Đồ hoạ & Tạo hình Thủy mặc / Ink-Wash độc bản cho CHRONO (2 Skin khác biệt hoàn toàn)
- Bổ sung đầy đủ `SkinInkPalette`, chân dung SVG riêng trên `TitleScreen.tsx`, giáp/áo choàng, phụ kiện bánh răng/vương miện thời gian và vũ khí Kim Đồng Hồ (`chrono_hand`) / Song Kim Thần Thời Gian (`chrono_twin_hands`) sắc nét.
- Skin Thần Thoại `Thần Thời Gian (chrono_sovereign)` phải có hình khối, vầng bánh răng cổ đại sau lưng, mũ/giáp và vũ khí khác biệt hoàn toàn so với bản `default` (không chỉ đổi màu).
- Vệt chém (`trails.ts`) mang dấu ấn Thời Gian (vòng số La Mã, bánh răng xoay, tia đồng hồ) thay vì vệt chém mặc định.

### R2. Chiêu `[U]` — PHÂN THÂN QUÁ KHỨ (`TemporalEcho`) hoàn chỉnh, không vẽ sơ sài
- Thay thế hoàn toàn hình vẽ vòng tròn/đường thẳng sơ sài trước đó: Phân Thân Quá Khứ phải được vẽ bằng khung xương Stickman đầy đủ (`renderStickman` / afterimage mờ tông xanh ngọc – vàng đồng), ghi lại lịch sử vị trí, tư thế (`pose`), hướng mặt và đòn đánh của Chrono rồi tự động tái hiện & chém bồi trễ `0.4s` chính xác, có hiệu ứng đồng hồ nhỏ dưới chân và không gây lỗi/crash.

### R3. Tuyệt kỹ Nộ `[I]` — NGƯNG ĐỌNG TOÀN CẦU (`Time Stop` 3.5s) & Tích dồn sát thương
- Nâng cấp cutscene mặt đồng hồ La Mã khổng lồ quay ngược (`renderTimeStop`) giàu chi tiết, sắc nét.
- Trong `3.5s` (`4.2s` khi Thức Tỉnh) Ngưng Đọng Toàn Cầu: đóng băng hoàn toàn quái, Boss và đạn địch, phủ bộ lọc thị giác thời gian ngưng đọng (vòng đồng hồ mờ + tông xanh ngọc/vàng cổ đại) lên đấu trường; mọi đòn đánh của Chrono trong thời gian đóng băng được tích dồn và phát nổ đồng loạt với hiệu ứng vỡ thời gian khi hết giờ.

### R4. Bành Trướng Lãnh Địa riêng — THÁP ĐỒNG HỒ CỔ ĐẠI (Độc quyền Skin `chrono_sovereign`)
- Tách biệt hoàn toàn với Lãnh Địa Ma Kính của Mirage: khi skin Thần Thoại `chrono:chrono_sovereign` Thức Tỉnh (`[O]`) hoặc tung Tuyệt kỹ Nộ (`[I]`), nền đấu trường (`PeriodicTableBG`) chuyển sang Tháp Đồng Hồ Cổ Đại (bánh răng cơ khí khổng lồ xoay chậm, mặt đồng hồ La Mã phát sáng trên bầu trời, bụi vàng thời gian trôi lơ lửng, cột kiến trúc đồng cổ) rồi hoàn nguyên mượt mà về map gốc khi hết giờ. Skin `default` KHÔNG đổi map.

### R5. Sửa triệt để lỗi & Đảm bảo hiệu năng Android Canvas 2D
- Sửa sạch mọi lỗi runtime, lỗi không nhận skin/domain, lỗi chồng chéo với Mirage.
- Tuyệt đối không dùng `ctx.shadowBlur`, giữ cân bằng `ctx.save()` / `ctx.restore() === 0`, không dùng `performance.now()` trong `src/game/renderer/`.
- Đồng bộ mã nguồn sang `/data/user/0/com.agy/files/stickman-build/src` và build sạch production `dist/`.

## Acceptance Criteria

### Kiểm thử tự động (Programmatic Verification)
- [ ] Toàn bộ 17/17 unit test trong `src/game/rules.test.ts` vượt qua.
- [ ] Bộ test R4 Mirage (`tests/e2e/r4_mirage.e2e.test.ts`) vẫn vượt qua 12/12 (không gây hồi quy lên Mirage).
- [ ] Có bộ test tự động riêng cho Chrono (`tests/e2e/r5_chrono.e2e.test.ts`) xác nhận:
  - Cả 2 skin Chrono (`default`, `chrono_sovereign`) có `SkinInkPalette` riêng và hình khối render khác biệt.
  - Chiêu `[U]` tạo `TemporalEcho` có dữ liệu xương/tư thế thật và chém bồi gây sát thương sau `0.4s`.
  - Tuyệt kỹ `[I]` kích hoạt `timeStopTimer > 0`, đóng băng quái & đạn, và kích nổ sát thương khi hết giờ.
  - Lãnh Địa Tháp Đồng Hồ Cổ Đại chỉ kích hoạt trên `chrono:chrono_sovereign` (tách biệt với `mirage:void_shatterer`) và tự hoàn nguyên khi hết giờ.
- [ ] Build production Vite (`node node_modules/vite/bin/vite.js build`) thành công (exit 0) và `0` `shadowBlur` trong `src/`.

## Follow-up — 2026-11-27T02:40:34Z

Create a standalone `mythic`-tier skin "Xuân Phong Văn Thánh" (`xuan_feng_sage`, subtitle: `春風 · Nhất Khí Hạo Nhiên`) for character `mactien` in the Scarlet Sheath (Stickman) game, featuring an elegant, flowing, refined scholar aesthetic (distinct from the default heavy/harsh-gold look).

Working directory: /storage/emulated/0/Antigravity/Stickman
Integrity mode: development

## Strict Scope & Token-Saving Constraints

- DO NOT read or modify: `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`.
- DO NOT modify hitboxes, damage, cooldowns, or combat logic. DO NOT run E2E tests or open a browser.
- DO NOT read entire large files; use `grep -n "mactien\|chrono_sovereign\|void_shatterer"` to locate exact reference blocks and insert `skinId === 'xuan_feng_sage'` branches right alongside them.
- Workspace invariants (from `AGENTS.md`):
  - No `ctx.shadowBlur` anywhere in `src/`.
  - No `performance.now()` in `src/game/renderer/`.
  - Strictly balanced `ctx.save()` / `ctx.restore()` in every render function.
- Partition work cleanly with zero file overlap across 3 modules:

## Requirements

### R1. Module 1 — Data, Gear & Weapon (`characters.ts`, `skinVfx.ts`, `inkStyle.ts`, `gear.ts`, `weapons.ts`)
1. Register skin `xuan_feng_sage` (tier: `mythic`, name: `Xuân Phong Văn Thánh`, subtitle: `春風 · Nhất Khí Hạo Nhiên`) for `mactien` in `characters.ts`, `skinVfx.ts`, and `inkStyle.ts`.
   - Refined color palette (NO harsh yellow/aggressive red): White Robe (`#f8fafc`), Jade Teal (`#5eead4` / `#2dd4bf`), Ink Wash (`#1e293b`), accented with Peach Blossom Pink (`#fda4af`) and subtle cinnabar.
2. Gear (`gear.ts`):
   - Multi-layered flowing white scholar robe with jade trim that sways softly with wind/velocity.
   - Behind the back: a delicate ink-wash moon ring (drawn as an open, unclosed Zen Enso brush stroke) rotating very slowly + 3–4 floating bamboo slips / scripture pages & peach blossom petals drifting gently around the character.
   - Awaken state: Do NOT switch to harsh gold. Transition to a soothing Moonlight White – Jade Teal aura, with the back Enso ring glowing clearly and spring petals falling around the character.
3. Weapon (`weapons.ts`):
   - Render Ngọc Tiêu Tiên Bút (translucent white jade brush shaft with a soft flowing jade silk tassel, white brush bristles tipped with softly glowing jade-teal ink).

### R2. Module 2 — Soft Brush Trails, Seals & Afterimages (`trails.ts`, `animation.ts`, `Entities.ts`, and `mactien` VFX render blocks in `Player.ts` / `Game.ts`)
1. Basic attack trails (`trails.ts` & `animation.ts`):
   - Add a dedicated `xuan_feng_brush` trail style: finer and softer than default (flowing like a 2-layer white-jade-black ink-wash silk ribbon with razor-sharp tapered tips); each flick trails 2–3 small peach blossom petals / bamboo leaves (keep particle count low for performance).
   - Subtly refine brush-holding/swing angles for `xuan_feng_sage` (where skin branching exists) to feel graceful and light rather than heavy-handed.
2. Seals & Afterimages (`Entities.ts` / `Game.ts`):
   - Dash afterimage (echo) rendered in translucent white-jade like dissipating ink mist.
   - Upgrade the `静` seal into a fine-lined jade-teal calligraphy formation ring bordered with gently rotating petals, bursting into a spring breeze + petals instead of a blunt explosion.

### R3. Module 3 — Cinematic Ultimate Cutscene (`UltimateCutscene.ts`)
- Add a dedicated cutscene branch for `skinId === 'xuan_feng_sage'` (DO NOT reuse the default rope/tube dragon):
  - An ink-wash scroll unfurls revealing misty morning mountains with delicate bamboo/peach branches sweeping across the corners.
  - White-robed `mactien` stands calmly upright, flicks a sleeve, and sweeps the Jade Brush to paint an Enso ink circle + spring wind carrying peach blossom petals and calligraphy strokes across the screen (strictly no tube/rope dragon).
  - Large character `"春"` appears in flowing ink-wash style with a jade glow outline + a refined small red seal stamp in the corner.

## Acceptance Criteria

### TypeScript & Build Verification
- [ ] Type-check passes with zero errors using the workspace TypeScript binary from `/data/user/0/com.agy/files/stickman-build`:
  `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit`

### Technical Invariants & Scope Guardrails
- [ ] Zero occurrences of `ctx.shadowBlur` introduced in `src/`.
- [ ] Zero occurrences of `performance.now()` introduced in `src/game/renderer/`.
- [ ] Every modified render function has strictly balanced `ctx.save()` / `ctx.restore()`.
- [ ] None of the excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `PeriodicTableBG.ts`, `AudioEngine.ts`, `src/components/*`) were modified.
- [ ] No hitbox, damage, cooldown, or combat logic was modified.

### Deliverable Summary
- [ ] Final report concisely lists all modified files and highlights the skin's visual effects.

## Follow-up — 2026-11-27T03:27:56Z

Completely overhaul the visuals, full-screen Domain, multi-layered back aura, 3-phase high-contrast Ultimate Cutscene, refined scholar basic-attack poses, and Awakened skill transformations for the Mythic skin `xuan_feng_sage` (`mactien`) so that it matches the geometric density, layering depth, and cinematic quality of `chrono_sovereign`.

Working directory: /storage/emulated/0/Antigravity/Stickman
Integrity mode: development

## Mandatory Rules & Scope Guardrails

- Reference `chrono_sovereign` FIRST: Before editing any file, MUST run `grep -n "chrono_sovereign"` to read how `chrono_sovereign` renders:
  1. Full-screen Domain + 3D perspective floor ring,
  2. Multi-layered back aura,
  3. 3-phase Ultimate Cutscene with calligraphy seal frame,
  4. Floating VFX fragments and Awakened skill/effect transformations.
- NO minimalist / flat MS-Paint visuals: Strictly forbidden to draw flat white trapezoid robes, 2-stroke stickman in cutscene, or washed-out white cutscene backgrounds.
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Workspace invariants (`AGENTS.md`):
  - Zero `ctx.shadowBlur` in `src/`.
  - Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
  - Strictly balanced `ctx.save()` / `ctx.restore()` in every render function.

## Requirements

### R1. Full-Screen Domain System: "LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU" (`Game.ts` / Domain renderer used by `chrono_sovereign`)
When `xuan_feng_sage` casts Ultimate or activates Awaken, activate a full-screen Domain matching the exact structural architecture of Chrono's `Tháp Đồng Hồ Cổ Đại` Domain (including the left-corner banner `LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU`):
- 3D Perspective Floor Ring: Flat horizontal elliptical calligraphy/Heaven-Earth formation ring beneath the character's feet (3 concentric rings, 12 Earthly Branches / Confucian tick marks, slowly rotating radial lines in jade teal + pale gold).
- Central Backdrop: Giant Ink-Wash Sun-Moon & Classic Scripture Wheel (3 counter-rotating concentric rings: inner thick-thin Enso brush stroke, middle ring with 12 ancient calligraphy characters `春・風・靜・禮・義・仁・智・信...`, outer fine light rays + swirling ink-wash clouds).
- Symmetrical Side Architecture: 2 symmetrical Jade Scholar Pillars / Vertical Hanging Scrolls framing the left and right edges (mirroring Chrono's architectural pillars), plus bamboo branches and peach blossom petals drifting with depth parallax.

### R2. High-Density Character, Gear & Weapon (`gear.ts`, `weapons.ts`)
- Multi-layered Back Aura (Back-Gear — matching Chrono's gear density): Replace the simple single ring with a 3-Layer Heaven-Earth Literary Wheel (Thiên Địa Văn Luân):
  - Layer 1 (inner): Thick-thin Enso brush ring with ink-wash bleed.
  - Layer 2 (middle): Fine octagonal/scripture ring with 8 counter-rotating engraved ticks.
  - Layer 3 (outer): 4–6 Jade Bamboo Slips / Small Seals orbiting in a 3D elliptical path around the character's back (with proper front/back depth sorting).
- Outfit (`gear.ts`): Eliminate flat white trapezoid blocks. Render multi-layered scholar robes with physically swaying separate front/back coattails, jade-teal sash with hanging jade pendant, wide flowing sleeves moving with attack direction, jade hairpin, and sharp jade-teal eye glint.
- Weapon (`weapons.ts`): Detailed multi-segment Ngọc Tiêu Tiên Bút (jade shaft with pale-gold metallic joints, energy ring rotating around the brush ferrule, long velocity-driven silk tassel, glowing white-core brush tip with jade-teal edge).

### R3. High-Contrast 3-Phase Ultimate Cutscene (`UltimateCutscene.ts`)
Completely replace the current white-background cutscene. Rebuild 3 high-contrast cinematic phases on a deep ink-night background (`#070d12`) matching `chrono_sovereign`'s dramatic pacing:
- Phase 1 — Literary Wheel Convergence (0%–45%): Against deep ink night, 3 giant concentric counter-rotating Literary Wheels (calligraphy characters + Enso brush strokes + jade-teal/pale-gold rims) scale up sharply at center while ink ribbons and petals vortex inward.
- Phase 2 — Space Shatter / Transition (45%–70%): Radial ink streaks & jade-teal silk speedlines burst outward from center in all directions, accompanied by shattered bamboo slips / scripture pages flying toward the camera (mirroring Chrono's perspective shatter phase).
- Phase 3 — Grand Seal Impact (70%–100%): Full-detail `xuan_feng_sage` character (using the real full character renderer, NEVER a crude stickman) appears on the left within a radiant aura; on the right slams down a vibrant Cinnabar-Red / Jade-Teal Seal Frame stamping a massive, razor-sharp calligraphy `春`, complete with screen shake + Impact Frame flash.

### R4. Refined Scholar Basic-Attack Poses & Multi-Layer Trails (`poses/`, `animation.ts`, `trails.ts`, `Player.ts`)
Eliminate the heavy/aggressive slashing feel of default `mactien` for `xuan_feng_sage`:
- Basic-Attack Poses (4-hit combo): Keep the torso upright and composed, one hand resting behind the back or holding a hand seal at the chest, while the other hand lightly flicks the wrist / points the brush (or telekinetically guides the floating Jade Brush in front), NEVER hunching/lunging forward like a heavy swordsman:
  - Hit 1: Gentle horizontal flick creating a soft ink-wash silk ribbon.
  - Hit 2: Upward wrist flick painting a flowing calligraphic sweep trailing peach blossom petals.
  - Hit 3: Brush-tip point into thin air creating ink ripples + 2 jade bamboo slips darting forward.
  - Hit 4: Open palm gentle push unleashing a rotating jade-teal seal ring that pushes the opponent back gracefully yet decisively.
- Multi-Layer Trails (`trails.ts`): Finer, softer 3-layer structure (outer ink wash → inner jade-teal glow → sharp white flash at brush tip), accompanied by subtle 4-point star glints and slowly falling petals/ink droplets.

### R5. Distinct Awakened Skill Transformations (`Player.ts`, `Game.ts`, `Entities.ts`)
When `xuan_feng_sage` activates Awaken (palette shifts to Moonlight White – Jade Teal – Pale Gold, STRICTLY NO harsh yellow):
- Awakened Basic Attacks (Ngự Bút Thiên Hành): No need to swing close-up — each basic attack summons 2–3 floating calligraphy brush blades / Jade Bamboo Slips slashing diagonally from range (wider reach, graceful rain-of-scripture trajectories) with small glowing Hanzi characters flashing on impact.
- Awakened Skill — Upgrade `Tĩnh Tự Ấn` to Văn Thánh Trấn Thiên Trận:
  - Instead of a single `静` seal, summon a giant 3-tier Formation Ring with 4 orbiting sub-seals around the main `靜` / `禮` character overhead, raining down jade bamboo slips + swirling spring wind to pin the opponent, finishing with a razor-sharp ink cross-slash matching Chrono's visual spectacle.
- Awakened Dash: Leave behind white-robed afterimages dissolving into peach blossom petals & ink mist instead of rigid silhouettes.

## Acceptance Criteria

### TypeScript Verification
- [ ] Type-check passes with zero new errors across all modified files using:
  `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` (from `/data/user/0/com.agy/files/stickman-build`).

### Technical Invariants & Quality Guardrails
- [ ] Zero `ctx.shadowBlur` in `src/`.
- [ ] Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
- [ ] Strictly balanced `ctx.save()` / `ctx.restore()` in every modified render function.
- [ ] None of the excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`) were modified.
- [ ] All 5 modules (Domain, Back-Gear/Outfit/Weapon, 3-Phase Dark Cutscene, Scholar 4-Hit Poses & 3-Layer Trails, Awakened Skill Transformations) are implemented and verified.

### Deliverable Summary
- [ ] Final report concisely summarizes changes across all 5 modules.

## Follow-up — 2026-11-27T03:53:03Z

Resume and complete the overhaul of the Mythic skin `xuan_feng_sage` (`mactien`) in `/storage/emulated/0/Antigravity/Stickman` to match `chrono_sovereign`'s geometric density, layering depth, and cinematic quality.

NOTE ON PRIOR PROGRESS: A previous teamwork run completed Wave 1 (M1: Full-Screen Domain in `PeriodicTableBG.ts`/`Game.ts`/`GameHUD.tsx`, M2: Back-Gear/Outfit/Weapon in `gear.ts`/`weapons.ts`/`StickmanRenderer.ts`, M3: 3-Phase Dark Cutscene in `UltimateCutscene.ts`) before a transient network error interrupted execution right before Wave 2.
First verify Wave 1 (M1, M2, M3) is complete and compiles cleanly, then implement Wave 2 (M4 and M5) and run full verification.

Working directory: /storage/emulated/0/Antigravity/Stickman
Integrity mode: development

## Mandatory Rules & Scope Guardrails

- Reference `chrono_sovereign` FIRST (`grep -n "chrono_sovereign"`) before editing any file.
- NO minimalist / flat MS-Paint visuals.
- Excluded files (DO NOT read or modify): `tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`. DO NOT run E2E tests.
- Workspace invariants (`AGENTS.md`):
  - Zero `ctx.shadowBlur` in `src/`.
  - Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
  - Strictly balanced `ctx.save()` / `ctx.restore()` in every render function.

## Requirements

### R1–R3. Verify & Finalize Wave 1 (M1 Domain, M2 Gear/Weapon/Back-Aura, M3 3-Phase Dark Cutscene)
- Verify M1 ("LÃNH ĐỊA: XUÂN PHONG VĂN MIẾU" full-screen Domain with 3D perspective floor ring, Giant Ink-Wash Sun-Moon & Classic Scripture Wheel, symmetrical Jade Scholar Pillars / Hanging Scrolls, left-corner HUD banner).
- Verify M2 (3-Layer Thiên Địa Văn Luân back-aura with depth-sorted orbiting jade bamboo slips/seals, multi-layered swaying scholar robe, multi-segment Ngọc Tiêu Tiên Bút).
- Verify M3 (3-Phase deep ink-night `#070d12` Ultimate Cutscene with Literary Wheel convergence, radial speedlines + shattered bamboo slips, full-detail `xuan_feng_sage` character on left + Cinnabar/Jade Seal Frame stamping `春` on right with shake & impact flash).
- Fix any gaps or TypeScript errors found in Wave 1.

### R4. Module 4 — Refined Scholar Basic-Attack Poses & 3-Layer Trails (`poses/`, `animation.ts`, `trails.ts`, `Player.ts`)
Eliminate the heavy/aggressive slashing feel of default `mactien` for `xuan_feng_sage`:
- Basic-Attack Poses (4-hit combo): Keep the torso upright and composed, one hand resting behind the back or holding a hand seal at the chest, while the other hand lightly flicks the wrist / points the brush (or telekinetically guides the floating Jade Brush in front), NEVER hunching/lunging forward like a heavy swordsman:
  - Hit 1: Gentle horizontal flick creating a soft ink-wash silk ribbon.
  - Hit 2: Upward wrist flick painting a flowing calligraphic sweep trailing peach blossom petals.
  - Hit 3: Brush-tip point into thin air creating ink ripples + 2 jade bamboo slips darting forward.
  - Hit 4: Open palm gentle push unleashing a rotating jade-teal seal ring that pushes the opponent back gracefully yet decisively.
- Multi-Layer Trails (`trails.ts`): Finer, softer 3-layer structure (outer ink wash → inner jade-teal glow → sharp white flash at brush tip), accompanied by subtle 4-point star glints and slowly falling petals/ink droplets.

### R5. Module 5 — Distinct Awakened Skill Transformations (`Player.ts`, `Game.ts`, `Entities.ts`)
When `xuan_feng_sage` activates Awaken (palette shifts to Moonlight White – Jade Teal – Pale Gold, STRICTLY NO harsh yellow):
- Awakened Basic Attacks (Ngự Bút Thiên Hành): Each basic attack summons 2–3 floating calligraphy brush blades / Jade Bamboo Slips slashing diagonally from range (wider reach, graceful rain-of-scripture trajectories) with small glowing Hanzi characters flashing on impact.
- Awakened Skill — Upgrade `Tĩnh Tự Ấn` to Văn Thánh Trấn Thiên Trận:
  - Instead of a single `静` seal, summon a giant 3-tier Formation Ring with 4 orbiting sub-seals around the main `靜` / `禮` character overhead, raining down jade bamboo slips + swirling spring wind to pin the opponent, finishing with a razor-sharp ink cross-slash matching Chrono's visual spectacle.
- Awakened Dash: Leave behind white-robed afterimages dissolving into peach blossom petals & ink mist instead of rigid silhouettes.

## Acceptance Criteria

### TypeScript Verification
- [ ] Type-check passes with zero new errors across all modified files using:
  `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` (from `/data/user/0/com.agy/files/stickman-build`).

### Technical Invariants & Quality Guardrails
- [ ] Zero `ctx.shadowBlur` in `src/`.
- [ ] Zero `performance.now()` in `src/game/renderer/` and `UltimateCutscene.ts`.
- [ ] Strictly balanced `ctx.save()` / `ctx.restore()` in every modified render function.
- [ ] None of the excluded files (`tests/`, `stages.ts`, `BotBrain.ts`, `solo1v1.ts`, `AudioEngine.ts`) were modified.
- [ ] All 5 modules (M1–M5) are complete and verified.

### Deliverable Summary
- [ ] Final report concisely summarizes changes across all 5 modules.
