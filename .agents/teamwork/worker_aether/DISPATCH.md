# Dispatch — worker_aether (Aether Character Pose & Movement Overhaul)

- **Role**: Character Pose Specialist (`teamwork_preview_worker`) — Aether
- **Working Directory**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_aether`
- **Project Root**: `/storage/emulated/0/Antigravity/Stickman`
- **Exclusive Target File**: `src/game/poses/aetherPoses.ts`
- **Parent Conversation ID**: `cb9506f4-9088-4284-adc1-d9197e1f15f9`
- **Authoritative Request**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`
- **Scope Document**: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r2_gen3/PROJECT_R2.md`

## 2026-11-25T18:05:30Z
Assigned as dedicated Character Pose Specialist for AETHER (`worker_aether`).
Exclusive target: `src/game/poses/aetherPoses.ts` ONLY.
Objectives:
- Overhaul all 8 `BasicPoseName` states (`idle`, `run`, `brake_skid`, `jump`, `fall`, `land`, `dash`, `parry`) for Aether (VIP Arcane Battle Mage, dual palm magic circles, no blade).
- Meet all quantitative invariants from `PROJECT_R2.md`.
- Incorporate parent visual inspection feedback (2026-11-25T18:06:11Z):
  1. `dash`: extend `handR` cleanly forward aiming the comet-dash vector and trail `handL` behind as an arcane thruster, with rear leg driving straight back.
  2. `run`: decisive wind-gliding forward lean (~0.58 rad) with wider stride reach and asymmetric forward/trailing arcane palms (avoiding upright jog).
  3. `land`: widen the stance slightly and press both palms downward-outward to emphasize cushioned arcane landing compression.
