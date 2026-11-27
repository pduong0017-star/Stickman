# Worker Dispatch — M4 Integration Wiring & Build/Test Sync

## Mandatory Reads First
1. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (including `## Follow-up — 2026-11-26T10:19:48Z`)
2. `/storage/emulated/0/Antigravity/Stickman/PROJECT.md`
3. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m2a/handoff.md` (especially Section 3 Caveats!)
4. `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m1/handoff.md`

## Working Directory & Ownership
- **Your Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m4_wiring`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Mirror Build Directory**: `/data/user/0/com.agy/files/stickman-build`
- **EXCLUSIVE Write Ownership**:
  - `src/game/StickmanRenderer.ts` (ONLY for wiring the pass-through arguments to `gear.ts`!)
  - `/data/user/0/com.agy/files/stickman-build/src` (full clean sync from `Stickman/src`)
  - `/storage/emulated/0/Antigravity/Stickman/dist` (sync built `dist/` from `stickman-build/dist` after Vite build)

## Detailed Tasks
1. **Fix `StickmanRenderer.ts` → `gear.ts` pass-through wiring** (per `worker_r3_m2a/handoff.md` Section 3):
   - Inspect `src/game/StickmanRenderer.ts` around `renderSkinBackAttachment`, `renderAwakenedBackForm`, `renderBossOutfitDetails`, `renderSkinBodyArmor`, `renderHeroHeadGear`, and `renderAwakenedHeadForm` (and inspect `src/game/renderer/gear.ts` exported signatures to match 100%).
   - Ensure `renderSkinBackAttachment` and `renderSkinBodyArmor` are NOT skipped when `opts.skinId === 'default'` (guard with `!isMono && (opts.characterId || opts.skinId)` so enemies/bosses without `characterId`/`skinId` don't get player armor, while all 6 playable characters' `default` + custom skins DO receive their ink-wash armor & back attachments!), and pass `opts.characterId`!
   - Forward `safePoseTime`, `opts.entityTier`, `opts.enragePhase` to `renderBossOutfitDetails(ctx, joints, headR, opts.bossOutfit, safePoseTime, opts.entityTier, opts.enragePhase)`.
   - Forward `opts.skinId`, `opts.characterId` to `renderHeroHeadGear(ctx, joints, headR, opts.headGear, safePoseTime, opts.skinId, opts.characterId)`.
   - Verify `renderAwakenedBackForm` and `renderAwakenedHeadForm` also receive `opts.skinId`!
   - Maintain zero `ctx.shadowBlur`, balanced `ctx.save()`/`ctx.restore()` (`try/finally`), and `finiteOr` guards.
2. **Clean Full Mirror Sync & Build**:
   - Cleanly sync `/storage/emulated/0/Antigravity/Stickman/src` → `/data/user/0/com.agy/files/stickman-build/src` (`rm -rf /data/user/0/com.agy/files/stickman-build/src /data/user/0/com.agy/files/stickman-build/dist && cp -r /storage/emulated/0/Antigravity/Stickman/src /data/user/0/com.agy/files/stickman-build/src`) and verify `diff -rq` exits `0`.
   - Also copy `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts` if needed (check first) and run `node node_modules/vite/bin/vite.js build` in `/data/user/0/com.agy/files/stickman-build` (must exit `0`).
   - Sync `/data/user/0/com.agy/files/stickman-build/dist` → `/storage/emulated/0/Antigravity/Stickman/dist` (`rm -rf .../Stickman/dist && cp -r .../stickman-build/dist .../Stickman/dist`) so the project's `dist/` has the latest production bundle.
3. **Run Programmatic Verification Suite (skipping Pillow visual rendering per user directive)**:
   - Static `shadowBlur` check across all `src/**/*.ts*` (`0` matches).
   - Run `rules.test.ts` in `/data/user/0/com.agy/files/stickman-build`:
     `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs src/game/rules.test.ts` (must pass **17/17**).
   - Run all **14 programmatic R3 tests** (excluding `R3-VISUAL-01` Pillow sheet):
     `ESBUILD_BINARY_PATH=/data/user/0/com.agy/cache/esbuild_bin node --test --test-name-pattern="R3-STATIC|R3-CONTRACT|R3-HERO|R3-ENEMY|R3-BOSS|R3-STAGE" --import /data/user/0/com.agy/files/stickman-build/node_modules/tsx/dist/loader.mjs tests/e2e/r3_inkwash.e2e.test.ts` (must pass **14/14**!).
4. Write `handoff.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_r3_m4_wiring/handoff.md` with exact commands and verbatim results, and message `07826cb9-c437-445a-9ca0-4b73578e251e`.
