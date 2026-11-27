# BRIEFING — 2026-11-25T18:11:15Z

## Mission
Overhaul Kagura's 8 basic movement & stance poses (`src/game/poses/kaguraPoses.ts`) into an unmistakable Anime Fighting / Hyuns Dojo Heavy Flame Nodachi powerhouse suite satisfying all `PROJECT_R2.md` quantitative and visual invariants.

## 🔒 My Identity
- Archetype: Character Pose Specialist (`teamwork_preview_worker`)
- Roles: implementer, qa, specialist
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kagura`
- Original parent: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Milestone: M2-Kagura

## 🔒 Key Constraints
- Exclusive write ownership: `src/game/poses/kaguraPoses.ts` ONLY (do NOT modify any other source/test/build file).
- Do NOT touch `/data/.../scratch/stickman-build` to avoid parallel races.
- Zero `NaN`/`Infinity`, `dist(hip, footL/R) <= 51.5`, `dist(shoulderL/R, handL/R) <= 37.5`, non-inverted knees/elbows, smooth `blendSkeleton` transitions.
- Distinct Heavy Flame Nodachi powerhouse silhouette across all 8 poses (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) — visually distinct from Kuro, Raijin, Zero, Aether.
- Apply M1 visual polish feedback: `parry` lower `hip.y` (`~-37..-38`), wider planted boots, firm forward-braced lean (`~0.16` rad); `land` deep wide shock-absorb squat.

## Current Parent
- Conversation ID: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- Updated: 2026-11-25T18:05:30Z

## Task Summary
- **What to build**: Refined `kaguraPoses` in `src/game/poses/kaguraPoses.ts`.
- **Success criteria**: `rules.test.ts` (17/17 pass), programmatic `tsx` verification of all 8 poses + `blendSkeleton` + `Player('kagura')` transitions + distinctiveness vs other 4 fighters, plus visual strip verification.
- **Interface contracts**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`
- **Code layout**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md` § Code Layout

## Key Decisions Made
- **`idle`** (`lines 14-25`): Grounded 47px wide stance (`footL=(-23,0)`, `footR=(24,0)`), lower COG (`hip=(-1,-42)`), `torsoLean=0.18`, two-handed over-shoulder Nodachi brace (`handL=(19.5,-52)`, `handR=(13,-61)`, `weaponAngle=-2.22`).
- **`run`** (`lines 27-51`): Heavy charging juggernaut sprint via `computeAnimeSprintStride` (`torsoLeanBase=0.62`, `hipBaseY=-41.5`, `strideRadius=28.5` -> `maxStrideX=55.95px`, `footLift=17.5`, `driveBias=0.58`, `trailArm=(0,-38)` inside reach, `leadArm=(19,-51)`, `weaponAngleBase=-2.72`).
- **`dash`** (`lines 53-123` -> lines 111-123): Low battering-ram surge (`hip=(13,-32)`, `+10px` below `idle`, `torsoLean=0.88`, rear leg push-off `(-31,-6)`, chest-tucked `handL=(24,-41)`, trailing Nodachi `handR=(5,-39)`, `weaponAngle=-2.86`).
- **`jump` / `fall`** (`lines 66-94`): Weighty coiled overhead-cleave arc (`torsoLean=0.26`, `weaponAngle=-2.38`) and wide-braced meteor descent (`torsoLean=0.32`, `footL/R=(-21/21)`, `weaponAngle=-1.98`).
- **`land`** (`lines 96-109`): Deep 59px ground-cracking squat via `computeLandingCurve(t, 0.16)` (`peakHipY=-27.63`, `+14.37px` lower than `idle`), smoothly rebounding to `(-1,-42)` `idle` by `t=0.16`.
- **`parry`** (`lines 125-136`): Iron-wall greatblade fortress guard (`hip=(0,-37)`, 56px stance `(-29..27)`, `torsoLean=0.16`, two-handed vertical hilt grip `handL=(21.5,-49)`, `handR=(24,-65)`, `weaponAngle=-1.48`).
- **`brake_skid`** (`lines 53-64`): Heavy trench-carving skid (`hip=(-6,-35)`, `torsoLean=-0.26`, two-handed forward-low blade arrest `weaponAngle=0.36`).

## Change Tracker
- **Files modified**: `src/game/poses/kaguraPoses.ts` (exclusive write target)
- **Build status**: `rules.test.ts` passed `17/17`; `tsx` 8-pose invariant + `blendSkeleton` + `Player('kagura')` verification passed; temporary `render-poses.py` visual strip verified (`0` blank cells, `0` low-diff pairs).
- **Pending issues**: None (M3 handles full-repo `tsc`/`vite build`/`dist/` sync).

## Quality Status
- **Build/test result**: `rules.test.ts` 17/17 pass; all Kagura pose invariants & transition deltas pass (`maxJointDelta < 22px`, `minL2VsOthers >= 16.17px` across all 8 poses).
- **Lint status**: Clean TypeScript syntax verified via `tsx` compilation.
- **Tests added/modified**: None (read-only verification only per exclusive write ownership).

## Artifact Index
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kagura/DISPATCH.md` — Dispatch & polish notes
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kagura/progress.md` — Liveness heartbeat
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kagura/handoff.md` — Hard handoff report
