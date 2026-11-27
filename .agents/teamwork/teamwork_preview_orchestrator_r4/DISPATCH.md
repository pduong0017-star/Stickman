# Dispatch Log

## 2026-11-26T11:14:14Z
Sender: `54ca8b92-c5ae-4f73-a8ce-46136c5e8cf8`

You are the Project Orchestrator (`teamwork_preview_orchestrator`) for the Round 4 Mirage overhaul in Stickman ("Scarlet Sheath").

## Identity & Workspace
- Working directory: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r4`
- Project root: `/storage/emulated/0/Antigravity/Stickman`
- Mirror build & test directory (Android noexec workaround): `/data/user/0/com.agy/files/stickman-build`
- Authoritative Request File: `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/ORIGINAL_REQUEST.md` (read the latest section `## Follow-up — 2026-11-26T11:13:35Z`)

## Task Summary
Design and execute a comprehensive overhaul of Mirage (7th character — Ảnh Kính Hư Không) across combat VFX, mythic skin (`void_shatterer`) geometry, exclusive Domain Expansion arena transformation, and active MirrorRift (`[U]`) interactions:
1. **R1 — Glass/Mirror Combat VFX**: Eliminate all sword-style arc trails (`slashArc`) on Mirage basic attacks (ground & aerial combos); replace with sharp spatial fractures, polygonal mirror shard volleys, prismatic reflection flashes, and glass-shatter impact sparks.
2. **R2 — Unique Mythic Skin `Ma Kính (void_shatterer)`**: Redesign `mirage:void_shatterer` silhouette, head/mask, cloak/armor, floating mirror-shard halo/ring behind back, and weapons so it is structurally distinct from `default` (not just a recolor), in high-contrast Ink-Wash / Thủy mặc style.
3. **R3 — Exclusive Domain Expansion (`void_shatterer` only)**: Only `mirage:void_shatterer` (on Awakening or after Rage Ultimate) triggers Domain Expansion, directly transforming the arena background (`PeriodicTableBG` / arena) into Ma Kính Hư Không Giới (fractured polygonal sky, floating black-red-cyan mirror monoliths, shattered reflective floor, floating glass shards) for the duration, then smoothly reverting to the original map when expired. Mirage `default` skin MUST NOT alter the map. Empower Mirage and MirrorRifts during Domain Expansion (mirror beams linking rifts, increased reflection range & shatter damage).
4. **R4 — Active `MirrorRift` (`[U]`) Interactions**:
   - Attacking (`[J]`) a MirrorRift shatters it into piercing glass shards aimed at the nearest enemy (or area shatter burst + chain interaction).
   - Dashing (`Dash`) through a MirrorRift triggers Mirror Warp (teleport behind nearest enemy or to another MirrorRift, with shattered-glass afterimage and brief cooldown refund).
   - Clear visual feedback and callout text on each MirrorRift interaction.
5. **R5 — Performance & Android Canvas 2D Compatibility**:
   - Zero `ctx.shadowBlur` anywhere in `src/`.
   - Strict `ctx.save()` / `ctx.restore() === 0` balance and zero NaN/exceptions.
   - Sync updated `src/` (and tests if needed) to `/data/user/0/com.agy/files/stickman-build` and verify clean production Vite build (`dist/`), unit tests (`rules.test.ts`), new automated tests for R1-R4, and headless Canvas 2D `save/restore === 0` render check.
   - Note: Skip heavy Pillow PNG visual inspection / tier4 visual E2E; user will inspect directly in the browser after programmatic verification passes.

## Operational Instructions
- Maintain `progress.md` and `BRIEFING.md` in `/storage/emulated/0/Antigravity/Stickman/.agents/teamwork/teamwork_preview_orchestrator_r4/` and update `progress.md` at each phase/milestone.
- Use a Full Team (explorers, implementation workers, reviewer/verifier) and ensure each subagent gets its own unique subdirectory under `.agents/teamwork/` (do NOT collide with existing `r1`/`r2`/`r3` folders; prefix with `r4_`, e.g., `teamwork_preview_explorer_r4_1`, `worker_r4_...`).
- When all requirements and acceptance criteria are verified, write `handoff.md` in your working directory and send a completion report back to me via `send_message`.
