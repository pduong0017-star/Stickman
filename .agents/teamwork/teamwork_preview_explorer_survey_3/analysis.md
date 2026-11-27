# Phase 0 Survey — Build, Typecheck, Testing & Browser Runtime Tooling

**Repository**: `/storage/emulated/0/Antigravity/Stickman`  
**Explorer**: `teamwork_preview_explorer_survey_3`  
**Date**: `2026-11-25T11:14:00Z`

---

## Executive Summary

The Stickman project (`SCARLET SHEATH`) uses React 19 + Vite 8 + Tailwind CSS v4 + TypeScript (`^7.0.2`) and already contains a 17-test `node:test` suite (`src/game/rules.test.ts`) with pure-TS game/rendering modules cleanly decoupled from top-level DOM globals. However, **running `npm run build`, `npm run lint` (`tsc --noEmit`), `tsx`, and browser checks directly in `/storage/emulated/0/Antigravity/Stickman` hits four concrete Android environment constraints**:
1. **Missing `node_modules/.bin` + FUSE `noexec` + Android linker namespace**: `npm` scripts fail immediately (`tsc: not found`, `vite: not found`), `esbuild` fails with `EACCES`, and Vite 8's native `.node` addons (`rolldown`, `@tailwindcss/oxide`, `lightningcss`) fail `dlopen()` from `/storage/emulated/0`.
2. **TypeScript `7.0.2` (`tsgo`) lacks `android-arm64` support**: `node node_modules/typescript/bin/tsc` throws `Unable to resolve @typescript/typescript-android-arm64`.
3. **Unit tests work via `ESBUILD_BINARY_PATH` in `/data`**: Copying `esbuild` into internal `/data` storage lets `tsx --test` run all 17 existing tests cleanly (`17 pass, 0 fail`).
4. **No headless browser or Chrome DevTools MCP is available**: `chrome`/`chromium` in `runtime/bin` are URL-opener shims, `rish` lacks `rish_shizuku.dex`, and no Playwright/Puppeteer/Chromium binary exists.

---

## 1. Project Build, Dev Server & Typecheck Configuration

| File | Key Findings | Source |
|---|---|---|
| `package.json` | React `^19.0.1`, Vite `^8.3.0` (`8.3.8` installed), `@tailwindcss/vite` `^4.3.3`, `@vitejs/plugin-react` `^6.1.1`, `lucide-react`, `motion`, `express`, `@google/genai`. DevDeps: `typescript` `^7.0.2`, `tsx` `^4.21.0` (`4.23.15` installed), `esbuild` `^0.25.0`, `@types/node` `^22.14.0`, `@types/react`/`@types/react-dom` `^19.3.0`. | `package.json:1-37` |
| Scripts | `dev`: `vite --port=3000 --host=0.0.0.0`<br>`build`: `vite build`<br>`preview`: `vite preview`<br>`clean`: `rm -rf dist server.js`<br>`lint`: `tsc --noEmit` | `package.json:6-12` |
| `tsconfig.json` | `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `allowImportingTsExtensions: true`, `noEmit: true`, `skipLibCheck: true`, `paths: { "@/*": ["./*"] }`, `exclude: ["dist"]`. Note: `strict` is not enabled. | `tsconfig.json:1-28` |
| `vite.config.ts` | Uses `react()`, `tailwindcss()`, `@` alias to repo root, `DISABLE_HMR` toggle for `server.hmr`/`watch`, and `copy-unbundled-src-assets` plugin copying `src/assets` -> `dist/src/assets` (note: project currently has `public/assets/aistudio`, not `src/assets`). | `vite.config.ts:1-45` |
| `index.html` | `<html lang="vi">`, loads Google Fonts (`Barlow Condensed`, `JetBrains Mono`, `Noto Serif JP`, `Plus Jakarta Sans`), mounts `/src/main.tsx` into `#root`. | `index.html:1-30` |
| `node_modules/` | 147 package directories installed (plus `package-lock.json`), **no `node_modules/.bin` directory**. Android ARM64 native packages are present on disk: `@esbuild/android-arm64`, `@rolldown/binding-android-arm64`, `@tailwindcss/oxide-android-arm64`, `lightningcss-android-arm64`. | `node_modules/` listing |

---

## 2. Automated Testing & Node/TS Execution Capabilities

### Installed Test/Execution Stack
- **Node.js**: `v26.13.1` (`npm 12.2.2`) in `/data/user/0/com.agy/files/usr/bin`.
- **No external test/DOM frameworks**: `package-lock.json` contains **zero** matches for `vitest`, `jest`, `playwright`, `puppeteer`, `jsdom`, or `happy-dom`.
- **Existing test suite**: `src/game/rules.test.ts` (349 lines, 17 tests) uses Node's built-in `node:test` and `node:assert/strict`, importing `./rules`, `./characters`, `./animation`, `./StickmanRenderer`, `./synergy`, `./stages` **without `.ts` extensions**.

### Execution Test Results

| Command Attempted | Result | Root Cause |
|---|---|---|
| `npm run lint` | **FAIL** (`sh: 1: tsc: not found`) | `node_modules/.bin` does not exist on `/storage/emulated/0` |
| `npm run build` | **FAIL** (`sh: 1: vite: not found`) | `node_modules/.bin` does not exist on `/storage/emulated/0` |
| `node node_modules/typescript/bin/tsc --version` | **FAIL** (`Unable to resolve @typescript/typescript-android-arm64`) | `typescript@7.0.2` (`tsgo`) has no `android-arm64` optionalDependency (`typescript/package.json:65-85`) and checks `process.platform === "android"` (`getExePath.js:22`) |
| `node node_modules/vite/bin/vite.js --version` | **FAIL** (`dlopen failed ... rolldown-binding.android-arm64.node is not accessible for the namespace "(default)"`) | `/storage/emulated/0` is FUSE `noexec` and outside Android linker `permitted_paths` (`.../data:...`) |
| `node node_modules/tsx/dist/cli.mjs -e '...'` | **FAIL** (`spawn .../esbuild EACCES`) | `/storage/emulated/0` is mounted `noexec` |
| `node --test src/game/rules.test.ts` | **FAIL** (`ERR_MODULE_NOT_FOUND: .../src/game/rules`) | Node v26 strips TS types natively, but ESM requires explicit `.ts` extensions unless a loader hook is used |
| `ESBUILD_BINARY_PATH="$TMPDIR/esbuild_test_bin" node node_modules/tsx/dist/cli.mjs --test src/game/rules.test.ts` | **PASS (17/17 tests in ~2.1s)** | Copying `esbuild` binary to `/data/user/0/com.agy/cache` (`$TMPDIR`, exec-enabled) allows `tsx` to run unmodified `.ts` files |

### Headless Game/Renderer Testability in Node
- `grep_search` across `src/game/*.ts` confirms `window.` and `document.` appear **only** inside methods of `AudioEngine.ts`, `Game.ts`, and `InputHandler.ts` — **never** at module top level and **never** in `characters.ts`, `animation.ts`, `ParticleSystem.ts`, `StickmanRenderer.ts`, `Player.ts`, `Entities.ts`, `rules.ts`, `stages.ts`, `synergy.ts`, or `types.ts`.
- Additionally, `node:module` in Node v26.13.1 exposes `registerHooks` (`function`), enabling custom extensionless `.ts` resolution even without `esbuild`.

---

## 3. Browser Runtime, Screenshot & Console Inspection Capabilities

| Tool / Channel | Status | Evidence |
|---|---|---|
| Headless Chromium / Chrome / Playwright / Puppeteer | **Unavailable** | `which` found none; `pkg search "browser\|chrom\|firefox\|headless\|xvfb\|playwright\|puppeteer"` returned 0 browser packages |
| `/data/user/0/com.agy/files/runtime/bin/{chrome,chromium,google-chrome}` | **URL-opener shims only** | All are 380-byte scripts invoking `am broadcast -a com.agy.ACTION_OPEN_URL -p com.agy --es url "$URL"` — cannot run headless, capture screenshots, or inspect console |
| Chrome DevTools MCP | **Unavailable** | Only `context-mode` and `gemini-api-docs` MCP servers are loaded; `mcp_config.json` contains no `chrome-devtools` server |
| Shizuku (`rish`) | **Unavailable** | `rish -c "..."` fails: `rish: rish_shizuku.dex not found under /data/user/0/com.agy/files/usr or its runtime` |
| Python image/vector tooling | **Available** | `python 3.14.10` with `Pillow 13.0.0` (`PIL.Image`, `PIL.ImageDraw`), plus `libcairo 1.18.6` (`pkg installed`) |

---

## 4. Environment Constraints & Impact on Acceptance Criteria

1. **Filesystem & Linker Constraint (`/storage/emulated/0` vs `/data`)**:
   - `/dev/fuse` on `/mnt/user/0/emulated` is mounted `noexec`, lacks symlink `.bin` links, and is excluded from Android's bionic linker `permitted_paths` (`.../data:...`).
   - **Empirical verification**: Copying `rolldown-binding.android-arm64.node`, `tailwindcss-oxide.android-arm64.node`, and `lightningcss.android-arm64.node` to `$TMPDIR` (`/data/user/0/com.agy/cache`) and loading them via `createRequire` succeeded for all three (`OK`).
   - **Implication for `npm run build` / `vite build`**: Production build cannot execute directly inside `/storage/emulated/0/Antigravity/Stickman/node_modules`. To run `vite build` or `vite dev` on this device, the project/dependencies must be mirrored or executed from an internal `/data` directory (e.g. `/data/user/0/com.agy/files/.gemini/antigravity-app/scratch/`).
2. **TypeScript Typecheck (`tsc --noEmit`)**:
   - `typescript@7.0.2` (`tsgo`) cannot execute on Android ARM64 (`process.platform === "android"`). Typechecking in this environment requires either using a pure-JS `typescript@5.x` installation in internal `/data` storage (or external CI/desktop) rather than the bundled `typescript@7.0.2`.
3. **Automated Skin Distinctness & Particle Lifecycle Tests**:
   - Fully runnable locally on-device using `ESBUILD_BINARY_PATH=<internal_esbuild> node node_modules/tsx/dist/cli.mjs --test <test_file>` (and/or Node `registerHooks`), testing `characters.ts`, `ParticleSystem.ts`, `StickmanRenderer.ts`, `Player.ts`, etc. with a mock `CanvasRenderingContext2D` to verify unique skin effect configs and >=50-swing particle/trail/aura cleanup to 0.
4. **Browser Console & Visual Screenshot Verification**:
   - **Hard environment gap**: No headless browser or DevTools MCP exists on this Android sandbox to execute the bundled React app in a real browser, capture live browser console logs, or take browser screenshots automatically.
   - **Mitigation**:
     - Programmatic Canvas-2D render-trace verification in Node (mocking `CanvasRenderingContext2D` to record stroke/arc/gradient/particle calls per skin and verify 0 thrown exceptions across skin switches and attacks), optionally rasterizing recorded draw commands to PNGs with Python `Pillow 13.0.0` (remembering `.nomedia` isolation) for visual inspection.
     - For real browser runtime/console/visual confirmation, manual user verification on-device via `vite` dev/preview server (hosted from `/data` on safe port `3000`/`5173`, bound to `127.0.0.1`) or external desktop/Playwright run is required.
   - **Reserved ports**: Never bind dev servers to `45157` or `45158`. Safe ports: `3000`, `5173`, `8000`, `8080`.
