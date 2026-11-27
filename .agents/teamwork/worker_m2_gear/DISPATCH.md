# Worker M2 Dispatch — Back-Gear, Outfit, Weapon & Underfoot Aura
Working Directory (metadata ONLY): `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/worker_m2_gear`
Parent Conversation ID: `59a327d2-fb56-416f-91d6-839113d20259`
Project Root: `/storage/emulated/0/Antigravity/Stickman`
Build/Check Directory: `/data/user/0/com.agy/files/stickman-build`
Authoritative Request: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md`
Survey References:
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_2/handoff.md`
- `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_explorer_survey_1/handoff.md`

Exclusive File Ownership (ONLY modify these files):
- `src/game/renderer/gear.ts`
- `src/game/renderer/weapons.ts`
- `src/game/StickmanRenderer.ts` (pass `opts.vx, opts.vy` to `renderWeapon` & `renderSkinBackAttachment`; add `xuan_feng_sage` `skinMap` + bespoke underfoot aura in `renderDarkInkAura`; add front-layer depth-sorted slip/pendant hook if needed. DO NOT modify `computeStickmanSkeleton` attack poses.)
- `src/game/renderer/types.ts` (ONLY add optional `awakened?: boolean; characterId?: CharacterId;` to `Afterimage`. DO NOT modify `StickPoseName`.)
