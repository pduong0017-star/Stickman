## 2026-11-25T11:17:46Z
Sender: b589790b-28b0-4a60-980a-68ac67599fd4

You are `spec_miner_e2e` (E2E & Visual Verification Spec Miner).
Your working directory is: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/spec_miner_e2e`
Project root is: `/storage/emulated/0/Antigravity/Stickman`
Parent conversation ID: `b589790b-28b0-4a60-980a-68ac67599fd4`

Mission:
Inspect `ORIGINAL_REQUEST.md`, `PROJECT.md`, `src/game/rules.test.ts`, `src/game/types.ts`, `src/game/characters.ts`, `src/App.tsx`, and `src/components/TitleScreen.tsx` to specify the complete, opaque-box 4-tier E2E test suite & visual render verification pipeline:
1. Design `TEST_INFRA.md` structure and test runner (`tests/e2e/run-e2e.mjs`) compatible with Android `/storage/emulated/0` (`ESBUILD_BINARY_PATH` copied to `$TMPDIR` + `node node_modules/tsx/dist/cli.mjs --test` with `--tier=1|2|3|4|all` support).
2. Enumerate concrete test cases across all 4 Tiers covering all 9 features (F1–F9) from `PROJECT.md`:
   - Tier 1 (Feature coverage, >=5 per feature = >=45 tests)
   - Tier 2 (Boundary & corner cases, >=5 per feature = >=45 tests)
   - Tier 3 (Cross-feature pairwise combinations, >=9 tests)
   - Tier 4 (Real-world gameplay workloads, >=5 scenarios, including >=50-attack spam cleanup to 0, 12-skin combat cycling with zero uncaught exceptions, and mock-Canvas 2D draw-call + PNG visual rendering via Python Pillow).
   Total >= 104 test cases (`~11*N + max(5, N/2)`).
3. Design the mock-`CanvasRenderingContext2D` recorder + Python `Pillow 13.0.0` PNG rasterizer specification so every one of the 12 `(CharacterId, SkinId)` pairs produces a crisp visual frame capturing the character + weapon + slash trail + swing aura + particles, allowing independent visual inspection via `view_file`.
4. Specify build & typecheck verification steps under `/data` scratch per `PROJECT.md § Environment Execution Notes` (and verify whether pure-JS `typescript@5.x` or `vite build` + `esbuild` checks apply).
