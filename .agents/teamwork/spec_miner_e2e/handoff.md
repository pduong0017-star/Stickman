# Handoff Report — `spec_miner_e2e`

**Handoff Type**: Hard (Complete)
**Artifact**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/spec_miner_e2e/analysis.md`

---

## 1. Observation

1. **Authoritative Requirements & Contracts**:
   - `.agents/teamwork/ORIGINAL_REQUEST.md:12-33` mandates distinct attack VFX (slash trails, weapon trails, aura, particles) per skin (R1), bounded lifecycle & cleanup returning active entities to 0 after >=50 attacks (R2), R3 combat/UI compatibility, 0 build/type errors, 0 runtime exceptions across all skins, and visual verification.
   - `PROJECT.md:17-109` defines 9 features (`F1`–`F9`), milestones `E2E`, `M1`–`M4`, and exact interface contracts (`skinVfx.ts`, `ParticleSystem.ts` `MAX_PARTICLES = 720`, `StickmanRenderer.ts` `SlashTrail` / `StickmanRenderOptions`, `Player.ts` `getActiveVfxCounts()`, `Entities.ts` `ProjectileConfig` / `MagmaPillar`).
2. **Codebase Inspection**:
   - `src/game/characters.ts:83-613` defines 4 fighters (`kuro`, `raijin`, `kagura`, `zero`) × 3 skins = 12 `(CharacterId, SkinId)` pairs; `characters.ts:529` (`frost_empress`) and `characters.ts:602` (`astral_phantom`) currently share `slashColors: ['#38bdf8', '#c084fc']`.
   - `src/game/Game.ts:2297-2321` (`syncHudThrottled`) does not yet include `this.skinId` in `fp`.
   - `src/game/Player.ts:151-162` (`setCharacter`) does not clear `slashTrails`/`afterimages`, and `Player.ts:392-399` (`updateIdleOnTitle`) does not tick them.
   - `src/game/Game.ts:768-770` calls `window.requestAnimationFrame(tick)` unconditionally; `AudioEngine.ts:47` and `InputHandler.ts:39` guard `typeof window !== 'undefined'`.
   - Scan of all 19 files in `src/game/` confirmed the exact `CanvasRenderingContext2D` API surface: methods `arc`, `beginPath`, `bezierCurveTo`, `closePath`, `ellipse`, `fill`, `fillRect`, `fillText`, `lineTo`, `moveTo`, `quadraticCurveTo`, `restore`, `rotate`, `save`, `scale`, `setLineDash`, `stroke`, `strokeRect`, `strokeText`, `translate`, `createLinearGradient`, `createRadialGradient`; properties `fillStyle`, `font`, `globalAlpha`, `globalCompositeOperation`, `lineCap`, `lineJoin`, `lineWidth`, `strokeStyle`, `textAlign`, `textBaseline`; 0 usages of `Path2D`, `OffscreenCanvas`, `DOMMatrix`, or `shadowBlur`.
   - `src/App.tsx:254-275` and `src/components/TitleScreen.tsx:215-254` wire `selectedSkin` and `onSelectSkin` into the UI; `react-dom/server` (`renderToStaticMarkup`) is available in Node `v26.13.1`.
3. **Empirical Environment Verification**:
   - Running `ESBUILD_BINARY_PATH="${TMPDIR:-/tmp}/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` passed **17/17** tests in 1.41s (`exit 0`).
   - Running `node node_modules/typescript/bin/tsc --noEmit` in `/storage/emulated/0/Antigravity/Stickman` failed (`Error: Unable to resolve @typescript/typescript-android-arm64`) because bundled `typescript@7.0.2` (`tsgo`) lacks an Android ARM64 binary.
   - Running `node node_modules/typescript/bin/tsc --noEmit` (`typescript@5.8.3`) and `node node_modules/vite/bin/vite.js build` (`vite@8.3.8`) inside `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build` both succeeded (`TSC OK`, `VITE BUILD OK` in 1.16s, `exit 0`).
   - Python `Pillow 13.0.0` confirmed `ImageChops.add` and `ImageFont.load_default(size=18)` work, while `PIL.ImageColor.getrgb('rgba(250, 204, 21, 0.45)')` raised `ValueError: unknown color specifier` (requiring a custom CSS color parser in `render-skins.py`).

## 2. Logic Chain

1. Because `/storage/emulated/0` is `noexec` and `typescript@7.0.2` lacks Android ARM64 binaries, `tests/e2e/run-e2e.mjs` must copy `@esbuild/android-arm64/bin/esbuild` to `$TMPDIR/esbuild_bin` (`chmod 0o755`) and run `node_modules/tsx/dist/cli.mjs --test`, while `tsc --noEmit` and `vite build` must execute against a synced copy in `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build` (Obs. 3).
2. Because `Game.ts` uses `window.requestAnimationFrame` and `localStorage` and `src/game/` uses a small, closed set of Canvas2D methods with nested `save/translate/scale/rotate/restore`, a lightweight Node `window`/`document` shim + screen-space tessellating `RecordingContext2D` allows exercising the full `Game`, `Player`, `ParticleSystem`, `StickmanRenderer`, `UltimateCutscene`, and `Entities` pipeline directly in Node without Chromium (Obs. 2).
3. Because `PIL.ImageColor.getrgb` rejects `rgba(...)` strings with floats/spaces, `tests/e2e/render-skins.py` must include a custom CSS color parser supporting `#RRGGBB`, `#RRGGBBAA`, `#RGB`, `rgb(...)`, and `rgba(...)`, plus `ImageChops.add` for `globalCompositeOperation = 'lighter'` (Obs. 3).
4. Mapping every one of the 9 features (`F1`–`F9`) across Tier 1 (`46` >= `45`), Tier 2 (`46` >= `45`), Tier 3 (`12` >= `9`), and Tier 4 (`6` >= `5`) yields **110 concrete opaque-box tests** (`>= 104`), covering programmatic uniqueness, `>=50`-attack cleanup to `0`, 12-skin combat zero-exception cycling, R3 hitbox invariance, and Pillow PNG visual verification (Obs. 1, 2).

## 3. Caveats

- `tests/e2e/render-skins.py` was designed from verified Pillow 13.0.0 primitives (`ImageChops.add`, `ImageFont.load_default(size=...)`, `ImageColor` failure case) and the complete `src/game/` Canvas2D scan; its exact rendering fidelity will be verified when the E2E engineer implements and runs it against the 12 skins and inspects the resulting PNGs via `view_file`.
- `StickmanRenderOptions` in `StickmanRenderer.ts:133-197` will be extended by M2 (`attackProgress`, `attackAuraColor`, etc.); Tier 1–4 tests should treat optional new fields per `PROJECT.md § Interface Contracts` so both baseline failure modes and M1–M3 post-implementation passes are unambiguous.
- Node 26 defines a read-only `globalThis.navigator`; the E2E Node shim must avoid overwriting `globalThis.navigator` directly.

## 4. Conclusion

The complete, read-only E2E & Visual Verification Specification is documented in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/spec_miner_e2e/analysis.md`. It provides:
1. `TEST_INFRA.md` & `tests/e2e/run-e2e.mjs` specification with Android `ESBUILD_BINARY_PATH` handling and `--tier=1|2|3|4|all` sequential execution.
2. **110 concrete opaque-box test cases** across Tier 1 (46), Tier 2 (46), Tier 3 (12), and Tier 4 (6) covering all 9 features (`F1`–`F9`).
3. Full mock-`CanvasRenderingContext2D` draw-trace + Python `Pillow 13.0.0` PNG rasterizer specification (including custom CSS `rgba`/`#RRGGBBAA` parsing and `ImageChops.add` `'lighter'` blending) for all 12 `(CharacterId, SkinId)` pairs.
4. Verified `/data` scratch `tsc --noEmit` (`typescript@5.8.3`) + `vite build` (`vite@8.3.8`) procedure.

## 5. Verification Method

1. Inspect specification artifact:
   - `view_file` `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/spec_miner_e2e/analysis.md`
2. Independently verify the baseline test runner and scratch build commands used in the spec:
   - In `/storage/emulated/0/Antigravity/Stickman`:
     `mkdir -p "$TMPDIR" && cp node_modules/tsx/node_modules/@esbuild/android-arm64/bin/esbuild "$TMPDIR/esbuild_bin" && chmod +x "$TMPDIR/esbuild_bin" && ESBUILD_BINARY_PATH="$TMPDIR/esbuild_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` (expect 17/17 pass).
   - In `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/stickman-build`:
     `node node_modules/typescript/bin/tsc --noEmit && node node_modules/vite/bin/vite.js build` (expect `exit 0`).
3. Confirm no files outside `.agents/teamwork/spec_miner_e2e/` were modified (`git status` in `/storage/emulated/0/Antigravity/Stickman`).
