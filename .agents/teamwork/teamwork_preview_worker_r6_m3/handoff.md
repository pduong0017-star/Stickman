# Module 3 Handoff — Cinematic Ultimate Cutscene (`xuan_feng_sage`)

**Type:** Hard Handoff  
**Agent:** `worker_r6_m3` (`teamwork_preview_worker`)  
**Modified File (Exclusive Ownership):** `/storage/emulated/0/Antigravity/Stickman/src/game/UltimateCutscene.ts`

---

## 1. Observation

1. **Dispatch Edit (`UltimateCutscene.ts:173-176`)**:
   - Inserted `} else if (this.theme.skinId === 'xuan_feng_sage') { this.renderXuanFengSageScroll(ctx, viewW, viewH); }` immediately before `} else if (this.theme.characterId === 'mactien' || style === 'spring_scroll')`.
   - `renderSpringScroll` (`UltimateCutscene.ts:2057-2458`) and `update()` (`UltimateCutscene.ts:105-157`, including `2.18s` `onKanjiImpact` and `2.70s` `onComplete`) were left completely untouched.
2. **Implemented `renderXuanFengSageScroll` (`UltimateCutscene.ts:2466-3183`)**:
   - **Cool-morning unfurling scroll (`lines 2486-2520, 3065-3079`)**: Deep slate backdrop (`rgba(10, 15, 24, 0.90)`), clipped unfurling Xuan-paper wash (`#e2e8f0` -> `#f8fafc` -> `#f1f5f9`), morning-jade radial mist (`rgba(94, 234, 212, 0.15)`), and ink-ebony rollers (`#1e293b` with `#0f766e` trim & `#5eead4` end-caps).
   - **Misty mountains + bamboo & peach blossoms (`lines 2522-2759`)**: 3 smooth Bezier ink-wash mountain layers (`#334155` / `#1e293b` / `#0f172a` fading into `#f8fafc`), 3 drifting mist bands, swaying bottom-left bamboo stalks with lanceolate leaves (`#1e293b` / `#0f766e`), and curved peach blossom boughs (`#fecdd3` / `#fda4af` 5-petal blooms with `#be123c` centers) sweeping inward from the top-right and upper-left corners.
   - **White-robed `mactien`, sleeve flick & Jade Brush (`lines 2761-2932`)**: Upright serene figure on left third (`#f8fafc` outer scholar robe, `#e2e8f0` under-fold, `#2dd4bf` jade collar/trim/trailing sash), outward sleeve flick, ink topknot with jade hairpin (`#2dd4bf`/`#5eead4`), and sweeping Ngọc Tiêu Tiên Bút (translucent white-jade shaft `#f8fafc`/`#5eead4`, `#0f766e` ferrule, `#2dd4bf` tassel, white bristles with `#2dd4bf`/`#99f6e4` jade-ink tip).
   - **Open Zen Enso + spring wind & petals (`lines 2934-3059`)**: Progressive unclosed Zen Enso arc (`-Math.PI * 0.72` to `+1.84 * Math.PI`) with `#5eead4` mist halo, `#0f172a` main sumi-e stroke, `#334155` dry-brush offset, and `#2dd4bf` inner rim; 5 sweeping Bezier spring-wind & calligraphy ribbons; 24 deterministic `this.timer`-driven peach petals (`#fda4af`/`#fecdd3`) and bamboo leaves (`#0f766e`/`#2dd4bf`). Zero dragon head, zero tube/rope body, zero harsh gold/yellow (`foundColors: []`).
   - **Flowing ink-wash `"春"` & corner cinnabar seal (`lines 3081-3179`)**: Large `"春"` with gentle jade-mist breeze ripples at `progress >= 0.80` (`~2.16s`), 3-layer translucent jade glow outline (`#5eead4` / `#2dd4bf` / `#99f6e4`, zero `shadowBlur`), `#0f172a -> #1e293b -> #334155` gradient fill, `#ccfbf1` inner rim, plus refined `30x30` bottom-right cinnabar seal (`#b91c1c` / `#991b1b`) carved with `"靜"`.
3. **Invariant & Type-Check Results**:
   - `grep_search` for `ctx.shadowBlur` in `/storage/emulated/0/Antigravity/Stickman/src`: **0 matches**.
   - `grep_search` for `performance.now` in `UltimateCutscene.ts` and `src/game/renderer`: **0 matches**.
   - Node check on `UltimateCutscene.ts`: `totalSaves: 59, totalRestores: 59`; inside `renderXuanFengSageScroll`: `fnSaves: 13, fnRestores: 13, fnTryFinally: 13`; `foundColors: []` for harsh gold/yellow (`#f59e0b`, `#fde047`, `#fef08a`, `#d97706`, `#fef9c3`, `#ef4444`).
   - `node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit` from `/data/user/0/com.agy/files/stickman-build`: **0 errors in `UltimateCutscene.ts`** (exited code 2 due to 24 unrelated errors in `src/game/poses/chronoPoses.ts` and `tests/e2e/*`).

---

## 2. Logic Chain

1. Because `renderScreen` evaluates `this.theme.skinId === 'xuan_feng_sage'` (`line 173`) before `this.theme.characterId === 'mactien' || style === 'spring_scroll'` (`line 175`), `xuan_feng_sage` always takes the dedicated `renderXuanFengSageScroll` path while default `mactien` continues using the untouched `renderSpringScroll`.
2. Because `SkinId` in `types.ts` already includes `'xuan_feng_sage'`, `tsc --noEmit` verified `this.theme.skinId === 'xuan_feng_sage'` and the entire `UltimateCutscene.ts` file with 0 TypeScript errors.
3. Because every coordinate and animation progression in `renderXuanFengSageScroll` is derived purely from `this.timer` and `finiteOr()`, and all 13 `ctx.save()` blocks are guarded by `try { ... } finally { ctx.restore(); }` without `ctx.shadowBlur`, all Android Canvas 2D invariants hold.

---

## 3. Caveats

- No edits were made to `Game.ts`, `types.ts`, or any excluded files; visual banner color/title (`this.theme.primaryColor`, `this.theme.bannerTitle`) relies on M1's `skinVfx.ts` / `characters.ts` configuration passed by `Game.ts:3748-3757`.
- `tsc --noEmit` across the whole repo currently exits 2 because of pre-existing errors in `src/game/poses/chronoPoses.ts` (15 errors) and `tests/e2e/*` (9 errors), which are outside Module 3's scope; `UltimateCutscene.ts` itself has 0 errors.
- E2E/browser visual rendering was not executed per task instructions.

---

## 4. Conclusion

Module 3 is complete. `src/game/UltimateCutscene.ts` now routes `skinId === 'xuan_feng_sage'` to a standalone, serene, cool-morning ink-wash and jade-teal ultimate cutscene (`renderXuanFengSageScroll`) with zero dragon/rope geometry, zero harsh gold, zero `ctx.shadowBlur`, zero `performance.now()`, and strictly balanced `ctx.save()`/`ctx.restore()`.

---

## 5. Verification Method

1. **Inspect dispatch & implementation**:
   - `UltimateCutscene.ts:173-176` (`xuan_feng_sage` branch before `mactien` branch)
   - `UltimateCutscene.ts:2466-3183` (`renderXuanFengSageScroll`)
2. **Static invariant checks**:
   - Search `ctx.shadowBlur` across `/storage/emulated/0/Antigravity/Stickman/src` -> expect 0 matches.
   - Search `performance.now` in `src/game/UltimateCutscene.ts` and `src/game/renderer/` -> expect 0 matches.
   - Verify `ctx.save()` count === `ctx.restore()` count (`59 === 59`, `13/13` `try..finally` in `renderXuanFengSageScroll`).
3. **Type-check** (from `Cwd: /data/user/0/com.agy/files/stickman-build`):
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
   Confirm `UltimateCutscene.ts` produces 0 diagnostics.
   - **Invalidation condition**: If `UltimateCutscene.ts` appears in `tsc --noEmit` diagnostics, or if `ctx.shadowBlur` / `performance.now()` / unbalanced `save/restore` is detected in `UltimateCutscene.ts`.
