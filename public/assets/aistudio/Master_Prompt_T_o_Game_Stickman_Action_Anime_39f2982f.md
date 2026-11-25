# MASTER PROMPT: XÂY DỰNG GAME HÀNH ĐỘNG STICKMAN ANIME (2D HACK-AND-SLASH / BOSS RUSH)

## 1. VAI TRÒ & MỤC TIÊU TỔNG QUAN
Bạn là một Chuyên gia Lập trình Game (Senior Game Developer) kiêm Giám đốc Nghệ thuật (Art Director) chuyên về dòng game hành động 2D tốc độ cao (như *Devil May Cry*, *One Finger Death Punch*, *Stick Fight*, và phong cách hoạt hình chiến đấu của *Alan Becker*).

**Nhiệm vụ:** Hãy lập trình một tựa game hành động 2D Stickman hoàn chỉnh, mượt mà ở **60 FPS**, chạy trực tiếp trên trình duyệt web bằng **HTML5 Canvas 2D + JavaScript thuần + Web Audio API** (đóng gói gọn gàng trong **1 file `.html` duy nhất** để dễ dàng chạy ngay, không cần cài đặt thư viện ngoài). 
*(Lưu ý: Nếu người dùng yêu cầu xuất sang Unity C# hoặc Godot GDScript, hãy giữ nguyên toàn bộ kiến trúc thiết kế bên dưới và chuyển đổi sang ngôn ngữ tương ứng).*

---

## 2. CHỦ ĐỀ, BỐI CẢNH & CỐT TRUYỆN (THEME)
- **Chủ đề:** Đại chiến các "Thực thể AI" dưới hình dạng Chiến binh Người Que (Stickman) mang phong cách Anime Cyberpunk tối giản nhưng cực kỳ mãn nhãn.
- **Bối cảnh sân đấu:** Một không gian phòng thí nghiệm / đấu trường xám tối có lưới mờ (grid background) và sàn phẳng màu tối. Khi nhân vật tung tuyệt kỹ hoặc thức tỉnh, phông nền sẽ biến đổi động (tối đen, rực đỏ, hoặc hiện lên **Bảng Tuần Hoàn Các Nguyên Tố Hóa Học** phát sáng ở phía sau).

---

## 3. THIẾT KẾ NHÂN VẬT CHÍNH (PROTAGONIST)
- **Ngoại hình:**
  - Người que màu **tím neon** có viền phát sáng nhẹ.
  - **Hào quang bóng tối (Dark Aura):** Luôn có các làn khói đen/tím bốc lên từ dưới chân.
  - **Khăn choàng cổ màu xanh dương (Flowing Scarf):** Bắt buộc lập trình bằng vật lý dây mềm (Verlet Integration hoặc mảng các điểm nối có trọng lực và sức gió) để khăn bay phấp phới cực mượt theo hướng chạy, nhảy và chém.
  - **Bao kiếm (Sheath):** Đeo ngang hông, có chi tiết ánh đỏ/vàng.
- **Trạng thái đặc biệt (Meme & Style):**
  - **Intro / Idle:** Khi mới vào màn (trước khi địch áp sát), nhân vật ngồi vắt chân cực ngầu trên một **chiếc ghế nhựa màu trắng** (phong cách meme Vergil), xung quanh có tia sét nhẹ và hào quang tím. Khi địch lao tới hoặc người chơi bấm nút, nhân vật bật dậy đá văng/làm tan biến chiếc ghế để vào trận.
  - **Victory Dance (Điệu nhảy chiến thắng):** Sau khi dọn sạch một đợt quái lớn bằng tuyệt kỹ, nhân vật có thể tự động (hoặc bấm phím Taunt) thực hiện điệu nhảy ăn mừng vui nhộn trong khi khói trắng của kẻ địch vẫn còn bay dưới sàn.

---

## 4. HỆ THỐNG ĐỒ HỌA & HOẠT ẢNH (PROCEDURAL ANIMATION & GAME JUICE)
Thay vì dùng ảnh tĩnh (spritesheet), hãy vẽ Stickman bằng **Hệ thống khung xương Procedural (Inverse Kinematics / Keyframe Interpolation)** với các khớp: Đầu, Cổ, Vai, Khuỷu tay, Bàn tay, Hông, Đầu gối, Bàn chân. Đảm bảo chuyển động dẻo dai, có độ rướn người khi vung kiếm và độ nhún khi tiếp đất.

**Bắt buộc phải có các yếu tố "Game Juice" để tạo cảm giác đánh cực đã tay:**
1. **Hit-Stop (Đóng băng khung hình):** Khi chém trúng địch hoặc Parry thành công, tạm dừng logic game từ `30ms` đến `80ms` để tạo lực va chạm nặng.
2. **Screen Shake (Rung màn hình):** Rung theo hướng đòn đánh, cường độ tăng dần từ đòn thường -> phá băng -> tuyệt kỹ.
3. **Slash Trails (Vệt kiếm):** Vẽ các vòng cung phát sáng (gradient trắng ở lõi, xanh cyan hoặc đỏ rực ở viền) bám theo lưỡi kiếm trong từng nhát chém.
4. **Afterimages (Tàn ảnh):** Khi lướt (Dash) hoặc dùng chiêu tốc độ cao, để lại 3–5 bóng mờ màu tím/xanh mờ dần phía sau.
5. **Dynamic Camera:** Camera tự động zoom nhẹ (1.05x - 1.3x) và bám theo nhân vật khi tung đòn kết liễu, Parry hoặc khi Boss xuất hiện.
6. **Hệ thống Hạt (Particle System):** Tia lửa kim loại khi chạm kiếm, mảnh tinh thể băng vỡ vụn, khói trắng cuộn tròn khi kẻ địch bị tiêu diệt, vết nứt trên sàn khi đập mạnh.

---

## 5. HỆ THỐNG CHIẾN ĐẤU & BỘ KỸ NĂNG (COMBAT SYSTEM)

### 5.1. Điều khiển cơ bản (Hỗ trợ Bàn phím + Nút ảo cảm ứng cho Mobile)
- `A / D` hoặc `Mũi tên Trái / Phải`: Di chuyển.
- `W` hoặc `Space`: Nhảy (hỗ trợ Nhảy đôi - Double Jump).
- `Shift` hoặc `L`: Lướt nhanh (Dash) kèm bất tử ngắn (i-frames) và tàn ảnh.
- `J`: Tấn công thường (nhấn liên tục tạo chuỗi Combo 4 đòn: Đá xoay -> Chém ngang -> Chém hất tung -> Chém bổ xuống). Có thể thực hiện **Air Combo** trên không.
- `K`: **Parry / Đỡ đòn hoàn hảo (Deflect)**. Nếu bấm đúng lúc đòn đánh hoặc đạn của địch sắp chạm vào (`parry window ~ 200ms`), nhân vật vung kiếm tạo vòng cung sáng, **phản ngược đạn về phía địch**, làm choáng kẻ địch cận chiến, phát tiếng *"KENG!"* vang dội và hồi đầy thanh Nộ nhanh chóng.

### 5.2. Bộ Kỹ năng Đặc biệt (Special Skills)
- **Phím `U` — Kỹ năng Băng / Pha Lê (Cryo Pillar & Crush):**
  - *Bấm lần 1:* Triệu hồi một bức tường/khối pha lê màu xanh cyan trồi lên từ mặt đất phía trước mặt. Bức tường này có tác dụng **chặn toàn bộ đạn bắn** từ địch tầm xa (hiện vết nứt dần khi trúng đạn).
  - *Bấm lần 2 (hoặc bấm `J` vào tường băng):* Nhân vật đấm/đá mạnh khiến khối băng lao tới nghiền nát (`CRUSHED`) hàng loạt kẻ địch trên đường đi rồi vỡ tan thành hàng chục mảnh pha lê.
- **Phím `I` — Tuyệt kỹ Cutscene Toàn Màn Hình: "SCARLET SHEATH" (Judgment Cut):**
  - *Điều kiện:* Thanh Nộ (Rage/Ultimate Bar) đạt 100%.
  - *Diễn biến hoạt ảnh (tự động chuyển cảnh cực ngầu trong ~2.5 giây):*
    1. Thời gian ngưng đọng, màn hình tối sầm lại. Hiện banner góc trên: `SCARLET SHEATH`.
    2. Hàng loạt đường chém màu đỏ rực phóng xạ từ tâm ra toàn màn hình.
    3. Hiệu ứng cắt cảnh cận cảnh: Một vòng tròn đỏ rực bị chém đôi, một vết rách không gian đen-đỏ kèm tia sét chớp nháy, và hình ảnh một **con mắt phát sáng** lóe lên giữa màn hình.
    4. Quay lại đấu trường: Toàn bộ kẻ địch bị biến thành **bóng đen (silhouettes)** bất động, 2–3 đường kiếm màu đỏ rực cắt ngang qua người chúng.
    5. Nhân vật đứng giữa, từ từ đẩy đốc kiếm vào bao phát ra tiếng **"CẠCH!"**.
    6. Một con dấu chữ Hán màu đỏ rực khổng lồ **"断"** (Đoạn - Cắt đứt) đóng mạnh lên màn hình. Toàn bộ kẻ địch đồng loạt tan biến thành những đám khói trắng trên mặt đất!
- **Phím `O` — Thức Tỉnh: "ELEMENTAL AWAKENING" (Phase 2 / Huyết Kiếm):**
  - Khi thanh Thức tỉnh đầy (hoặc kích hoạt khi bị Boss đánh gãy kiếm ở màn cuối):
  - Kiếm thường vỡ tan -> Nhân vật giơ tay tụ năng lượng đỏ rực, triệu hồi **Hắc Huyết Đại Kiếm** (lưỡi kiếm đen viền đỏ phát sáng, tầm đánh dài gấp đôi).
  - Nền phía sau sân đấu xuất hiện **Bảng Tuần Hoàn Hóa Học** với các ô nguyên tố (`H`, `C`, `O`, `Ne`, `Ar`, `Kr`) phát sáng rực rỡ và bắn tia năng lượng kết nối với nhân vật.
  - Tăng mạnh tốc độ đánh, sát thương, mỗi nhát chém tạo sóng kiếm (Sword Wave) tầm xa màu đen-đỏ cắt ngang màn hình.
- **Phím `T` — Taunt / Victory Dance:** Nhân vật thực hiện động tác khiêu khích hoặc nhảy ăn mừng (tăng nhẹ thanh Nộ nếu đang trong giao tranh).

---

## 6. HỆ THỐNG KẺ ĐỊCH & CẤU TRÚC MÀN CHƠI (WAVE & BOSS RUSH)
Game được chia thành các phân cảnh (Acts) có thanh tiêu đề góc trên bên trái kiểu phim Anime (ví dụ: `01 MAIN FIGHT`, `02 CRYO CRUSH`, `03 SCARLET SHEATH`, `04 BOSS RUSH`):

1. **Wave 1 — Quân đoàn Lính Thường (Phe META & DEEPSEEK):**
   - *Stickman Trắng (Cận chiến):* Lao vào đấm đá, cầm dao găm từ cả 2 phía trái và phải.
   - *Stickman Súng (Xạ thủ - DEEPSEEK):* Đứng từ xa rút súng lục bắn liên thanh. (Gợi ý người chơi dùng tường băng `U` để chắn hoặc `K` để phản đạn).
2. **Wave 2 — Đám đông Bao vây (Swarm):**
   - Hàng chục Stickman cầm kiếm và gậy ập tới từ 2 bên để người chơi tích đầy thanh Nộ và kích hoạt tuyệt kỹ **Scarlet Sheath**.
3. **Wave 3 — BIỆT ĐỘI BOSS (BOSS SQUAD / THE CLAUDE & OPENAI FAMILY):**
   - Khi từng Boss bước ra, game tạm dừng ngắn (0.8s) với thanh tiêu đề giới thiệu tên phe và tên Boss ở góc trên bên phải:
   - **Boss 1: Kẻ Cầm Khiên (Vanguard / Haiku):** Cầm khiên tròn và đoản kiếm, có khả năng đỡ đòn trực diện, lao tới húc. Người chơi phải nhảy qua sau lưng hoặc Parry đòn húc.
   - **Boss 2: Kẻ Cầm Giáo (Lancer / Astra):** Tầm đánh cực xa, phóng giáo và đâm liên hoàn.
   - **Boss 3: Đội Trưởng Kiếm Laser Đỏ (Leader / Opus):** Mặc áo choàng đỏ, cầm kiếm ánh sáng đỏ, tốc độ di chuyển ngang ngửa nhân vật chính, tung các chuỗi chém liên hoàn đòi hỏi Parry liên tục.
   - **Boss 4: Xạ Thủ Năng Lượng (Sniper / Sol):** Đứng tuyến sau bắn tia laser năng lượng tốc độ cao, bắt buộc phải Parry để phản sát thương.
   - **Final Boss: Thực Thể Neon Xanh (Fable):** Người que màu xanh lá phát sáng, bay lơ lửng trên không, triệu hồi **Vòng Tròn Ma Pháp (Magic Circle)** dưới đất và bắn cầu sét màu tím. Khi giao chiến với Boss này, kích hoạt sự kiện kịch tính cho phép người chơi mở khóa chế độ **Thức Tỉnh Bảng Tuần Hoàn (Huyết Kiếm)** để kết liễu.

---

## 7. GIAO DIỆN NGƯỜI DÙNG (UI/UX) & HỆ THỐNG ĐIỂM SỐ
- **HUD trong trận (Tối giản, hiện đại, kiểu Anime/Sci-Fi):**
  - *Góc trên trái:* Thanh tiêu đề phân cảnh (VD: `01 MAIN FIGHT`), Thanh Máu (HP), Thanh Nộ (Ultimate - phát sáng khi đầy 100%), Thanh Thức Tỉnh (Awakening).
  - *Góc trên phải:* Thanh Máu & Tên của Boss hiện tại (khi đánh Boss), kèm **Bộ đếm Combo & Hạng Phong Cách (Style Rank: D -> C -> B -> A -> S -> SS -> SSS)** nhảy kích thước theo nhịp đánh.
  - *Góc dưới:* Biểu tượng các kỹ năng (`J`, `K`, `U`, `I`, `O`) hiển thị thời gian hồi chiêu (Cooldown) trực quan.
- **Các màn hình đầy đủ:**
  - **Main Menu:** Nhân vật ngồi trên ghế nhựa ở giữa màn hình với hiệu ứng hạt bay, các nút: *CHƠI NGAY (Story/Wave Mode)*, *ĐẤU BOSS (Boss Rush)*, *LUYỆN TẬP (Training Mode - vô hạn Nộ)*, *HƯỚNG DẪN ĐIỀU KHIỂN*, *CÀI ĐẶT ÂM THANH*.
  - **Pause Menu (`ESC` / `P`):** Tạm dừng, xem danh sách Combo, chơi lại, về Menu.
  - **Game Over / Victory Screen:** Thống kê tổng thời gian, Max Combo, số lần Parry hoàn hảo, Hạng tổng kết, nút Chơi lại.

---

## 8. HỆ THỐNG ÂM THANH TỔNG HỢP (WEB AUDIO API)
Không dùng file `.mp3` bên ngoài để tránh lỗi đường dẫn. Hãy viết một **Audio Synthesizer Engine** tích hợp bằng `Web Audio API` để tự tạo ra các âm thanh chất lượng cao:
- **SFX:** Tiếng vung kiếm xé gió (Filtered White Noise sweep), tiếng chém trúng thịt/giáp (Low punchy sine + noise), tiếng Parry kim loại vang ngân *"KENG!"* (High frequency FM synthesis), tiếng băng mọc lên & vỡ vụn (Crystalline arpeggio + crackle), tiếng súng bắn, tiếng tra kiếm *"CẠCH!"*, tiếng Bass Drop cực nặng khi đóng dấu chữ **"断"**.
- **BGM (Nhạc nền):** Một vòng lặp nhạc điện tử / Phonk tốc độ cao (130-140 BPM) gồm tiếng trống Kick, Snare, Bassline dồn dập và giai điệu Synth năng động (có nút Bật/Tắt nhạc).

---

## 9. YÊU CẦU KỸ THUẬT & CHẤT LƯỢNG CODE
1. **Kiến trúc hướng đối tượng (OOP) rõ ràng:** Tách biệt các lớp `Game`, `InputHandler`, `Camera`, `AudioEngine`, `ParticleSystem`, `Player`, `Enemy`, `Boss`, `IceWall`, `Projectile`, `UltimateCutscene`, `PeriodicTableBG`.
2. **Delta Time (`dt`):** Mọi chuyển động, vật lý và hồi chiêu phải tính theo `dt` để game chạy đồng nhất trên cả màn hình 60Hz, 120Hz và 144Hz.
3. **Responsive Canvas:** Tự động căn chỉnh tỷ lệ hiển thị sắc nét trên mọi kích thước màn hình (PC & Mobile), tự động hiện nút cảm ứng nếu phát hiện thiết bị màn hình chạm.
4. **Không cắt bớt code (No Placeholders):** Viết đầy đủ 100% logic có thể chạy ngay lập tức mà không có chú thích kiểu `// TODO: implement here`.

Hãy bắt đầu viết toàn bộ mã nguồn hoàn chỉnh cho tựa game này!