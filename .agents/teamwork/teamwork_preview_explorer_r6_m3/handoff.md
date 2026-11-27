# Module 3 Investigation & Implementation Plan — Cinematic Ultimate Cutscene (`xuan_feng_sage`)

**Summary:** `src/game/UltimateCutscene.ts` already receives `skinId` via `CutsceneTheme` from `Game.ts:3750` (`this.cutscene.start`), uses `this.timer` (`0..2.7s`) with zero `performance.now()` and zero `ctx.shadowBlur`, and dispatches `mactien` at `UltimateCutscene.ts:173-174`. Module 3 only needs to add a dedicated `this.theme.skinId === 'xuan_feng_sage'` branch in `UltimateCutscene.ts` rendering the unfurling ink-wash scroll, misty mountains, corner bamboo/peach branches, calm white-robed `mactien` sweeping the Jade Brush into an Enso circle + spring wind with petals/calligraphy, and large ink-wash `"春"` with layered jade glow + small corner red seal stamp.

---

## 1. Observation

1. **Exact file path (`find_by_name`)**:
   - `/storage/emulated/0/Antigravity/Stickman/src/game/UltimateCutscene.ts` (2,457 lines).
2. **`CutsceneTheme` interface & state (`UltimateCutscene.ts:8-16, 46-64`)**:
   - `CutsceneTheme` includes `characterId?: CharacterId`, `skinId?: SkinId`, `kanji: string`, `primaryColor: string`, `secondaryColor: string`, `accentColor?: string`, `bannerTitle: string`.
   - `this.duration = 2.7` (`UltimateCutscene.ts:49`); `this.timer` advances in `update(dt, audio, camera)` (`UltimateCutscene.ts:105-157`).
   - Audio/impact milestones in `update()`: `0.18s`, `0.42s`, `0.72s`, `1.15s`, `1.86s` (`sheathClicked`), `2.18s` (`kanjiDropped`, calls `this.callbacks?.onKanjiImpact()`), `2.70s` (`onComplete()`).
3. **Caller `skinId` plumbing (`grep_search` + `view_file` on `Game.ts:3413, 3748-3757`)**:
   - `Game.ts` is the sole caller of `UltimateCutscene`. In `activateScarletSheath()`, `this.cutscene.start(...)` passes:
     ```ts
     {
       characterId: ch.id,
       skinId: this.skinId,
       kanji: ch.ultimateKanji,
       primaryColor: vfx.cutscenePrimary,
       secondaryColor: vfx.cutsceneSecondary,
       accentColor: vfx.cutsceneAccent,
       bannerTitle: ch.ultimateBannerTitle,
     }
     ```
   - `Game.ts:4274-4276` calls `this.cutscene.renderScreen(ctx, this.viewW, this.viewH)`.
4. **Dispatch in `renderScreen` (`UltimateCutscene.ts:159-204`)**:
   - Line 163-164 opens `ctx.save(); try { ... } finally { ctx.restore(); }` around all ultimate branches and the top-left banner (`lines 189-200`, bordered by `this.theme.primaryColor` with `this.theme.bannerTitle`).
   - Lines 173-178 show how character and skin-specific branches are structured:
     ```ts
     } else if (this.theme.characterId === 'mactien' || style === 'spring_scroll') {
       this.renderSpringScroll(ctx, viewW, viewH);
     } else if (this.theme.skinId === 'radiant_seraph') {
       this.renderRadiantSeraphUltimate(ctx, viewW, viewH);
     } else if (this.theme.skinId === 'void_walker') {
       this.renderVoidWalkerUltimate(ctx, viewW, viewH);
     ```
   - Other mythic skins (`prismatic_archon` at line 1300, `abyssal_valkyrie` at 1446, `celestial_empress` at 1447, `void_shatterer` at 1614, `chrono_sovereign` at 1794) branch via `this.theme.skinId === '...'`.
5. **Existing `mactien` block (`renderSpringScroll`, `UltimateCutscene.ts:2055-2456`)**:
   - Computes `safeW = Math.max(1, viewW)`, `safeH = Math.max(1, viewH)`, `t = this.timer`, `progress = Math.min(1, t / Math.max(0.01, this.duration))`.
   - Draws aged yellow-beige parchment (`#e5d8bc` / `#f3ebd8`), 3 Bezier sumi-e mountain layers, leaning ink silhouette with `#fde047` brush tip, 5 thick swirling ribbons + a dragon head crest (`lines 2275-2333`), gold/jade ink splatters, wooden/gold rollers, and a slamming golden `"春"` (`#f59e0b` / `#fef08a`) + dashed red `"静"` circle (`lines 2419-2441`).
6. **Helpers & Invariants (`UltimateCutscene.ts:6`, `inkStyle.ts:16-18`, `grep_search`)**:
   - `UltimateCutscene.ts:6` already imports `{ colorWithAlpha, finiteOr } from './renderer/inkStyle'`.
   - `grep_search` for `shadowBlur|performance\.now` in `UltimateCutscene.ts` confirmed **0** `performance.now()` calls and **0** `ctx.shadowBlur` calls (lines 2379 and 2396 explicitly comment `no shadowBlur`).
   - `types.ts:11-26` defines `SkinId` (currently ending at `'chrono_sovereign'`; Module 1 adds `'xuan_feng_sage'`).

---

## 2. Logic Chain

1. Because `Game.ts:3750` already passes `skinId: this.skinId` into `CutsceneTheme` and `Game.ts:4275` calls `this.cutscene.renderScreen(ctx, this.viewW, this.viewH)`, `UltimateCutscene.ts` already receives both `characterId` and `skinId` at runtime. Therefore, **no edits to `Game.ts` are required** for Module 3.
2. In `renderScreen()` (`UltimateCutscene.ts:173-174`), `this.theme.characterId === 'mactien' || style === 'spring_scroll'` currently unconditionally calls `renderSpringScroll(...)`, which contains the yellow parchment, dragon head crest, and golden `"春"`. Placing `} else if (this.theme.skinId === 'xuan_feng_sage') { this.renderXuanFengSageScroll(ctx, viewW, viewH); }` immediately **before** line 173 guarantees:
   - `xuan_feng_sage` enters a completely standalone cinematic branch (zero tube/rope dragon, zero harsh gold).
   - Default `mactien` (`renderSpringScroll`) remains 100% untouched.
3. Because `this.theme.skinId` has type `SkinId | undefined` (`UltimateCutscene.ts:10`), `this.theme.skinId === 'xuan_feng_sage'` depends on Module 1 adding `'xuan_feng_sage'` to `SkinId` in `src/game/types.ts` before final `tsc --noEmit` verification passes.
4. Because `UltimateCutscene.ts` already imports `colorWithAlpha` and `finiteOr` and runs purely on `this.timer` (`0..2.7s`), the new `renderXuanFengSageScroll` can produce smooth, deterministic animations with zero `performance.now()`, zero `ctx.shadowBlur` (using multi-pass translucent `strokeText` for the jade glow outline), and `ctx.save()` / `try { ... } finally { ctx.restore(); }` on every transform/clip/alpha block.

---

## 3. Concrete Implementation Plan for Module 3 Worker

**Target file (ONLY file to modify):** `/storage/emulated/0/Antigravity/Stickman/src/game/UltimateCutscene.ts`

### Step A — Branch Dispatch in `renderScreen` (`UltimateCutscene.ts:173`)
Insert the `xuan_feng_sage` branch right before the existing `mactien` branch:
```ts
      } else if (this.theme.skinId === 'xuan_feng_sage') {
        this.renderXuanFengSageScroll(ctx, viewW, viewH);
      } else if (this.theme.characterId === 'mactien' || style === 'spring_scroll') {
        this.renderSpringScroll(ctx, viewW, viewH);
```

### Step B — Implement `private renderXuanFengSageScroll(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void`
Use palette constants aligned with R1/R3 (NO `#f59e0b` / `#fde047` harsh yellow or aggressive red):
- White / Morning Paper: `#f8fafc`, `#f1f5f9`, `#e2e8f0`
- Jade Teal: `#5eead4`, `#2dd4bf`, `#0f766e`, `#99f6e4`
- Ink Wash: `#0f172a`, `#1e293b`, `#334155`
- Peach Blossom Pink: `#fda4af`, `#fecdd3`, `#fbcfe8`
- Seal Cinnabar (refined small stamp only): `#b91c1c` / `#dc2626`

Normalize geometry & time at top of method:
- `const safeW = Math.max(1, finiteOr(viewW, 1280));`
- `const safeH = Math.max(1, finiteOr(viewH, 720));`
- `const cx = safeW * 0.5; const cy = safeH * 0.5;`
- `const t = finiteOr(this.timer, 0);`
- `const progress = Math.min(1, Math.max(0, t / Math.max(0.01, this.duration)));`
- Scroll dimensions: `scrollOpen = Math.min(1, progress / 0.24)`, `easedOpen = 1 - Math.pow(1 - scrollOpen, 3)`, `scrollHalfW = safeW * 0.485 * easedOpen`, `scrollH = Math.min(safeH * 0.74, 400)`, `scrollTop = cy - scrollH * 0.5`.

Structure the visual layers inside balanced `ctx.save(); try { ... } finally { ctx.restore(); }` blocks:

1. **Cinema Backdrop & Unfurling Cool-Morning Ink-Wash Scroll (`progress 0 -> 0.24`)**:
   - Fill screen backdrop with deep ink-slate wash (`rgba(10, 15, 24, 0.90)`).
   - Open inner `ctx.save() / try / finally` with `ctx.beginPath(); ctx.rect(cx - scrollHalfW, scrollTop, scrollHalfW * 2, scrollH); ctx.clip();`.
   - Paper wash: vertical gradient `#e2e8f0` -> `#f8fafc` -> `#f1f5f9` -> `#dbeafe`/`#cbd5e1` + subtle radial morning-jade mist (`rgba(94, 234, 212, 0.14)` at upper center, fading to `rgba(15, 23, 42, 0.14)` at scroll edges).
   - Scroll rollers (drawn outside the clip at `cx ± scrollHalfW`): dark ink-ebony rods (`#1e293b`) with subtle `#0f766e` stroke and `#5eead4` jade end-caps.

2. **Misty Morning Mountains + Corner Bamboo & Peach Blossom Branches**:
   - **3 Misty Sumi-e Mountain Layers**: smooth Bezier ridges (similar structure to `renderSpringScroll:2114-2157`, using slate-ink `#334155` / `#1e293b` / `#0f172a` gradients fading into morning mist `#f8fafc` at base), overlaid with 2–3 horizontal drifting mist bands (`rgba(248, 250, 252, 0.55)`).
   - **Corner Bamboo (bottom-left / upper-left corner)**: 2–3 thin segmented ink-wash stalks (`#1e293b` / `#334155`) swaying softly (`Math.sin(t * 2.1 + idx) * 4`) with tapered lanceolate leaves (`#1e293b` & `#0f766e`).
   - **Corner Peach Blossom Branches (top-right & lower-right / upper-left accent)**: curved ink-wash boughs (`#1e293b`, `lineCap = 'round'`) sweeping inward from the corners, blooming with 5-petal peach flowers (`#fecdd3` / `#fda4af` with tiny `#be123c` center dots) scaled in smoothly with `easedOpen`.

3. **Calm White-Robed `mactien`, Sleeve Flick & Jade Brush Sweep (`progress 0.06 -> 0.65`)**:
   - Position on left third of scroll: `hx = cx - scrollHalfW * 0.55`, `hy = scrollTop + scrollH * 0.63 + Math.sin(t * 2.4) * 2.5`.
   - Upright serene posture (NO aggressive forward lunge).
   - **White Scholar Robe**: layered `#f8fafc` outer robe and `#e2e8f0` under-fold with `#1e293b` ink-wash contour and `#2dd4bf` jade collar/hem trim.
   - **Sleeve Flick**: wide flowing white sleeve (`bezierCurveTo`) extending gracefully outward as `flickP = clamp01((progress - 0.08) / 0.28)` swings from tucked poise to an airy outward sweep.
   - **Head & Jade Hairpin**: calm head silhouette (`#f8fafc` / `#1e293b` ink contour) + ink topknot + glowing jade hairpin (`#5eead4` / `#2dd4bf`).
   - **Jade Brush (Ngọc Tiêu Tiên Bút)**: arm sweeps smoothly (`sweepAng` from `-0.9` to `+0.55` across `progress 0.12 -> 0.52`), holding a translucent white-jade shaft (`#f8fafc` core, `#5eead4` rim), flowing jade silk tassel (`#2dd4bf`) at the end, and white bristles (`#f8fafc`) tipped with luminous jade-teal ink (`#2dd4bf`).

4. **Enso Ink Circle + Spring Wind, Calligraphy Strokes & Peach Petals (`progress 0.16 -> 0.85`)**:
   - **Strictly NO dragon head, NO tube/rope body.**
   - **Enso Ink Circle**: centered near `(cx + safeW * 0.03, cy)`, radius `ensoR = Math.min(scrollH * 0.36, safeW * 0.19)`. Drawn progressively via `ensoP = clamp01((progress - 0.18) / 0.36)` along an open Zen arc (`startAngle = -Math.PI * 0.72`, max sweep `1.84 * Math.PI` leaving an authentic open brush gap). Render as 3 layered strokes for authentic sumi-e + jade aura:
     - Soft jade mist halo (`#5eead4` at `0.22` alpha, `lineWidth = 22`)
     - Tapered ink-wash main body (`#0f172a` / `#1e293b`, `lineWidth = 13`, `lineCap = 'round'`, plus a dry-brush offset arc `#334155` at `lineWidth = 6`)
     - Delicate jade-teal inner whisper rim (`#2dd4bf` at `0.65` alpha, `lineWidth = 2.6`)
   - **Spring Wind & Calligraphy Strokes**: 4–5 sweeping S-curve Bezier ribbons crossing left-to-right across the scroll (`progress 0.22 -> 0.75`): translucent spring breeze ribbons (`colorWithAlpha('#5eead4', 0.38)`), mist-white wind threads (`colorWithAlpha('#f8fafc', 0.65)`), and dynamic tapering ink-wash calligraphy strokes (`#1e293b` / `#334155`).
   - **Drifting Peach Blossom Petals & Bamboo Leaves**: deterministic loop (e.g. `22` petals) moving along the wind trajectory with gentle vertical sine-wave float and rotation (`t`-driven, zero `Math.random()` inside render), colored `#fda4af` / `#fecdd3` (petals) and `#0f766e` / `#2dd4bf` (occasional bamboo leaf).

5. **Large Flowing Ink-Wash `"春"` with Jade Glow Outline + Small Red Seal Stamp (`progress >= 0.44`)**:
   - Reveal progress: `kanjiP = clamp01((progress - 0.44) / 0.22)`, eased `1 - Math.pow(1 - kanjiP, 3)`, subtle scale settling from `1.32 -> 1.0`.
   - At `t >= 2.18` (`progress >= 0.807`, when `onKanjiImpact` fires), emit a gentle expanding jade-mist breeze ring (`colorWithAlpha('#5eead4', ...)`), keeping the aesthetic serene rather than violent.
   - **Layered Jade Glow Outline (NO `ctx.shadowBlur`)**:
     - `ctx.font = \`italic 900 ${fontSize}px "Noto Serif JP", "Yu Mincho", Georgia, serif\`` (or non-italic flowing serif — keep consistent with `fontSize = Math.round(Math.min(safeW, safeH) * 0.34)`).
     - Outer translucent jade glow strokes:
       - `lineWidth = 22`, `strokeStyle = colorWithAlpha('#5eead4', 0.16 * kanjiAlpha)`
       - `lineWidth = 13`, `strokeStyle = colorWithAlpha('#2dd4bf', 0.30 * kanjiAlpha)`
       - `lineWidth = 6`, `strokeStyle = colorWithAlpha('#99f6e4', 0.58 * kanjiAlpha)`
     - Subtle offset ink-wash shadow (`rgba(15, 23, 42, 0.22)` at `(4, 6)`).
     - Ink-wash character fill (`linearGradient` `#0f172a` -> `#1e293b` -> `#334155`) + crisp thin jade-white inner rim (`lineWidth = 1.6`, `#ccfbf1`).
   - **Refined Small Red Seal Stamp in Corner (`progress >= 0.56`)**:
     - Positioned neatly in the bottom-right corner of the scroll (`sealX = cx + scrollHalfW - 54`, `sealY = scrollTop + scrollH - 48`), only visible once `scrollHalfW > 90`.
     - Stamp ease: `sealP = clamp01((progress - 0.56) / 0.12)`, `sealScale = 1.25 - 0.25 * easeOut(sealP)`.
     - Small `30x30` (half `15`) traditional cinnabar square (`#b91c1c` at `0.85` alpha) with crisp `#991b1b` outer border (`lineWidth = 2`), inner `#f8fafc` carved glyph `"春"` (or `"風"` / `"印"` — `"春"` or `"靜"` matches character lore cleanly; `"靜"` / `"文"` complements the huge `"春"`).

---

## 4. Caveats

1. **Cross-module type dependency (`SkinId`)**: `src/game/types.ts:11-26` does not yet include `'xuan_feng_sage'` in the `SkinId` union (Module 1 owns `types.ts`, `characters.ts`, `skinVfx.ts`). If Module 3 worker runs `tsc --noEmit` before Module 1 adds `'xuan_feng_sage'` to `SkinId`, TypeScript will flag `this.theme.skinId === 'xuan_feng_sage'` as non-overlapping unless `types.ts` is updated first (or temporarily after integration).
2. **Banner color & title**: `renderScreen()` (`UltimateCutscene.ts:189-200`) draws the top-left banner using `this.theme.primaryColor` and `this.theme.bannerTitle`, which come from `vfx.cutscenePrimary` and `ch.ultimateBannerTitle` in `Game.ts:3752-3755`. I did not inspect `characters.ts` (Module 1 scope), so `renderScreen`'s banner border color relies on Module 1 setting `cutscenePrimary` in `skinVfx.ts` to jade teal (`#2dd4bf` / `#5eead4`).
3. **Timing alignment**: `Game.ts` triggers `onKanjiImpact` at `this.timer >= 2.18` (`progress ≈ 0.807`). Having `"春"` appear at `progress >= 0.44` (`~1.19s`) with a jade wind-ripple pulse at `progress >= 0.80` aligns both with the scroll's visual pacing (matching `renderSpringScroll`'s `0.40` reveal) and the `2.18s` gameplay hit.

---

## 5. Verification Method

After Module 3 worker edits `/storage/emulated/0/Antigravity/Stickman/src/game/UltimateCutscene.ts` (and once Module 1 has added `'xuan_feng_sage'` to `SkinId` in `types.ts`):

1. **Type-check** (from `Cwd: /data/user/0/com.agy/files/stickman-build`):
   ```bash
   node /data/user/0/com.agy/files/tsc5/node_modules/typescript/bin/tsc --noEmit
   ```
   Expected: exit code `0`, zero TypeScript errors.
2. **Production build** (from `Cwd: /data/user/0/com.agy/files/stickman-build`):
   ```bash
   node node_modules/vite/bin/vite.js build && cp -r dist/. "/storage/emulated/0/Antigravity/Stickman/dist/"
   ```
   Expected: exit code `0`.
3. **Technical Invariants Check**:
   - `grep_search` across `/storage/emulated/0/Antigravity/Stickman/src` for `shadowBlur` -> 0 matches.
   - `grep_search` across `/storage/emulated/0/Antigravity/Stickman/src/game/UltimateCutscene.ts` and `src/game/renderer/` for `performance.now` -> 0 matches.
   - Inspect `renderXuanFengSageScroll` in `UltimateCutscene.ts` to confirm every `ctx.save()` is paired with `try { ... } finally { ctx.restore(); }`, and confirm no dragon/tube/rope geometry or harsh `#f59e0b` / `#fde047` gold colors appear in the branch.
   - **Invalidation condition**: If `Game.ts` or `skinVfx.ts` fails to pass `skinId: 'xuan_feng_sage'`, or if `SkinId` lacks `'xuan_feng_sage'`, the branch will fail type-check or never trigger at runtime.
