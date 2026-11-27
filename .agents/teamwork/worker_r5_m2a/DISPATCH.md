## 2026-11-26T15:59:36Z

Sender: `5921fcfe-3b03-4b72-8e17-fd8ef853796e`
Role: `worker_r5_m2a` (Milestone M2A Worker)

Exclusive Write Ownership:
- `src/game/Entities.ts`
- `src/game/PeriodicTableBG.ts`
- `src/game/UltimateCutscene.ts`
- `src/components/GameHUD.tsx`
- `src/App.tsx`
- `src/game/Boss.ts`

Requirements for M2A:
1. `src/game/Entities.ts` — `TemporalEcho` class (R2):
   - Export `TemporalPoseSnapshot`, `TemporalEchoStrike`, `TemporalEcho`
   - Full Stickman state + `queueStrike` + `update(dt, delayedSample?)` + `render(ctx)` using `renderStickman` + underfoot rotating Roman/clockwork aura, `try/finally`, zero `shadowBlur`, zero `performance.now()`.
2. `src/game/PeriodicTableBG.ts` — Ancient Clock Tower Domain (R4, R5):
   - Import `DomainKind` from `./types`
   - Separate `mirageDomainBlend` and `chronoDomainBlend`, `domainKind: DomainKind`
   - Backward-compatible `update(dt, awakened, domainActive = false, domainKind?)`
   - `getDomainBlend()`, `getMirageDomainBlend()`, `getChronoDomainBlend()`, `getDomainKind()`, `resetDomain()`
   - Render Tháp Đồng Hồ Cổ Đại in `renderChronoDomainScreenBackdrop` and `renderChronoDomainWorld` when `chronoDomainBlend > 0.02`, preserving `this.stageTheme` untouched.
3. `src/game/UltimateCutscene.ts` — `renderTimeStop` & Static Cleanup (R3, R5):
   - Fix lines 1414, 1461, 1463 (`${hex}XX` -> `colorWithAlpha(...)`), zero `${hex}XX` in file
   - Wrap ALL `ctx.save()` calls in `try { ... } finally { ctx.restore(); }`
   - Upgrade `renderTimeStop` into rich Ink-Wash Roman numeral clock cutscene (concentric counter-rotating cogwheels, 12 Roman numerals `XII..XI`, beveled reversing hands, `chrono_sovereign` gold-azure enhancement, Phase 2 shattered clock-face fracture climax).
4. `src/components/GameHUD.tsx` & `src/App.tsx` (R3, R4):
   - Pass/read `domainKind`, `timeStopActive`, `timeStopTimeLeft` cleanly
   - Branch `data-testid="hud-domain-badge"` on `hud.domainKind === 'chrono'` (`'LÃNH ĐỊA: THÁP ĐỒNG HỒ CỔ ĐẠI'`), preserving Mirage badge
   - Add `data-testid="hud-timestop-badge"` when `hud.timeStopActive` is true (`'NGƯNG ĐỌNG THỜI GIAN'` with remaining seconds)
5. `src/game/Boss.ts` (R3):
   - In `updateBoss`, when `dt <= 0` (frozen by Time Stop), Boss skips phase-2 enrage triggers, Fable/telegraph timers, movement, and attack updates cleanly while preserving `render()`.
