# Dispatch — worker_kuro (Kuro Character Pose & Movement Overhaul)

- **Role**: Character Pose Specialist (`teamwork_preview_worker`) — Kuro
- **Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_kuro`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Exclusive Target File**: `src/game/poses/kuroPoses.ts`
- **Parent Conversation ID**: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- **Authoritative Request**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`
- **Scope Document**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`

## 2026-11-25T18:05:29Z
Dedicated Character Pose Specialist for **KURO** (`worker_kuro`).
- Exclusive Write Ownership: `src/game/poses/kuroPoses.ts` ONLY.
- Design Objective: Overhaul all 8 `BasicPoseName` states (`idle`, `run`, `dash`, `jump`, `fall`, `land`, `parry`, `brake_skid`) for Kuro (Iaido Swordsman, `katana`/`blood_greatsword`, `hasSheath: true`) in Anime Fighting / Hyuns Dojo style.

## 2026-11-25T18:06:11Z
Visual inspection feedback from parent on M1 baseline `all_5_chars_poses_grid.png`:
- M1 baseline `run`, `dash`, `land` look sharp.
- In `parry`, lower and widen Kuro's stance slightly (`hip.y ≈ -40`) and angle the katana forward-diagonal (`weaponAngle ≈ -1.10`) so it reads as an active anime sword deflection rather than a narrow vertical hold.
- In `idle`, emphasize the coiled Iaido hand-on-sheath silhouette with clear knee bend.
