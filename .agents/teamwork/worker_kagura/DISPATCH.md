# Dispatch — worker_kagura (Kagura Character Pose & Movement Overhaul)

- **Role**: Character Pose Specialist (`teamwork_preview_worker`) — Kagura
- **Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kagura`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Exclusive Target File**: `src/game/poses/kaguraPoses.ts`
- **Parent Conversation ID**: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- **Authoritative Request**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`
- **Scope Document**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`

## 2026-11-25T18:05:30Z

Dedicated Character Pose Specialist for KAGURA (`worker_kagura`). Exclusive write target: `src/game/poses/kaguraPoses.ts`.
Design objective: Heavy Flame Nodachi Powerhouse across all 8 `BasicPoseName` states (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) meeting all `PROJECT_R2.md` quantitative invariants and Anime Fighting / Hyuns Dojo silhouette distinction.

## 2026-11-25T18:06:11Z

Visual polish notes from M1 baseline render (`all_5_chars_poses_grid.png`):
- `parry`: drop `hip.y` slightly lower (`~-37..-38`) with wider planted boots and a firm forward-braced lean (`~0.16` rad) so the heavy Nodachi guard feels even more grounded and immovable.
- `land`: make `land` a deep wide shock-absorb squat.
