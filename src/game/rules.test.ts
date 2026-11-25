import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSS_ORDER,
  BOSS_ROSTER,
  PARRY_WINDOW_SEC,
  calculateRunGrade,
  computeReflectedProjectile,
  computeStyleRank,
  createScarfChain,
  decayStyleScore,
  isAttackBlockedByShield,
  isWithinParryWindow,
  stepVerletScarf,
} from './rules';
import {
  CHARACTER_ORDER,
  CHARACTER_ROSTER,
  computeResponsiveCameraScale,
  getCharacterDef,
} from './characters';
import {
  animeSwingCurve,
  blendSkeleton,
  computeLandscapeFloorAnchor,
  computeRunStrideKinematics,
  getAwakenedVisualProfile,
  getComboMoveForCharacter,
  getUltimateStyleId,
  lerpAngle,
} from './animation';
import { computeStickmanSkeleton } from './StickmanRenderer';
import {
  ELEMENTAL_MARK_SPECS,
  computeDetonationDamage,
  computeOverdriveUltimateDamage,
  computeSynergyCooldownRefund,
} from './synergy';

test('style rank scales monotonically from D to SSS', () => {
  assert.equal(computeStyleRank(0), 'D');
  assert.equal(computeStyleRank(60), 'C');
  assert.equal(computeStyleRank(120), 'B');
  assert.equal(computeStyleRank(200), 'A');
  assert.equal(computeStyleRank(300), 'S');
  assert.equal(computeStyleRank(420), 'SS');
  assert.equal(computeStyleRank(550), 'SSS');
});

test('style score decays smoothly and never drops below zero', () => {
  assert.equal(decayStyleScore(100, 1), 85);
  assert.equal(decayStyleScore(5, 2), 0);
  assert.ok(decayStyleScore(400, 1) < 370);
});

test('parry window and projectile reflection math behave accurately', () => {
  assert.equal(isWithinParryWindow(0), false);
  assert.equal(isWithinParryWindow(PARRY_WINDOW_SEC), true);
  assert.equal(isWithinParryWindow(PARRY_WINDOW_SEC + 0.05), false);

  const reflected = computeReflectedProjectile(-500, 40, 20);
  assert.ok(reflected.vx > 500, 'Reflected horizontal velocity reverses and accelerates');
  assert.ok(reflected.damage >= 40, 'Reflected damage scales up for rewarding counterplay');
});

test('shielded boss blocks frontal attacks but takes hits from behind or unblockables', () => {
  // Defender at x=500 facing left (-1), attacker at x=300 (in front)
  assert.equal(isAttackBlockedByShield(500, -1, 300, true, false), true);
  // Attacker jumps behind to x=620
  assert.equal(isAttackBlockedByShield(500, -1, 620, true, false), false);
  // Unblockable attack (Cryo Crush / Scarlet Sheath / Awakened Wave) pierces shield
  assert.equal(isAttackBlockedByShield(500, -1, 300, true, true), false);
  // Shield broken (inactive)
  assert.equal(isAttackBlockedByShield(500, -1, 300, false, false), false);
});

test('Verlet scarf chain maintains anchor and segment length constraints', () => {
  const scarf = createScarfChain(200, 300, 8, 10);
  assert.equal(scarf.length, 8);

  for (let i = 0; i < 30; i++) {
    stepVerletScarf(scarf, 240 + i * 2, 290, -1200, 450, 10, 1 / 60);
  }

  assert.equal(scarf[0].x, 240 + 29 * 2);
  assert.equal(scarf[0].y, 290);

  for (let i = 1; i < scarf.length; i++) {
    const dist = Math.hypot(scarf[i].x - scarf[i - 1].x, scarf[i].y - scarf[i - 1].y);
    assert.ok(dist >= 7.5 && dist <= 13.5, `Segment ${i} distance ${dist} stayed bounded`);
  }
});

test('boss roster covers all 5 anime squad bosses in sequence', () => {
  assert.equal(BOSS_ORDER.length, 5);
  for (const id of BOSS_ORDER) {
    const meta = BOSS_ROSTER[id];
    assert.ok(meta.name.length > 0);
    assert.ok(meta.maxHp >= 350);
  }
});

test('run grade calculation rewards high combo, parries, and low damage', () => {
  assert.equal(
    calculateRunGrade({
      outcome: 'victory',
      maxCombo: 45,
      perfectParries: 10,
      damageTaken: 20,
      elapsedTime: 100,
      mode: 'story',
    }),
    'S+'
  );
  assert.equal(
    calculateRunGrade({
      outcome: 'gameover',
      maxCombo: 5,
      perfectParries: 0,
      damageTaken: 100,
      elapsedTime: 40,
      mode: 'story',
    }),
    'C'
  );
});

test('playable character roster defines 4 distinct fighters with unique skills and kanji', () => {
  assert.equal(CHARACTER_ORDER.length, 4);
  const kanjiSet = new Set<string>();
  const specialSet = new Set<string>();

  for (const id of CHARACTER_ORDER) {
    const def = CHARACTER_ROSTER[id];
    assert.equal(def.id, id);
    assert.ok(def.maxHp >= 120);
    assert.ok(def.moveSpeed >= 400);
    assert.ok(def.parryWindow >= 0.2);
    assert.ok(def.skills.specialName.length > 0);
    assert.ok(def.skills.ultimateName.length > 0);
    kanjiSet.add(def.skills.ultimateKanji);
    specialSet.add(def.specialKind);
  }

  assert.equal(kanjiSet.size, 4, 'Each fighter has a unique Ultimate Kanji');
  assert.equal(specialSet.size, 4, 'Each fighter has a unique [U] signature skill mechanic');
  assert.equal(CHARACTER_ROSTER.zero.maxJumps, 3, 'Zero has triple jump mobility');
  assert.equal(getCharacterDef('unknown_id').id, 'kuro', 'Unknown IDs fall back safely to Kuro');
});

test('responsive camera scale and landscape anchor frame mobile landscape cleanly', () => {
  const phoneLandscape = computeResponsiveCameraScale(844, 390);
  assert.ok(
    phoneLandscape >= 0.64 && phoneLandscape <= 0.85,
    `Phone landscape scale ${phoneLandscape} should fit full vertical arena`
  );

  const smallPhone = computeResponsiveCameraScale(667, 360);
  assert.ok(smallPhone >= 0.64 && smallPhone <= 0.75);

  const desktop = computeResponsiveCameraScale(1440, 900);
  assert.ok(desktop >= 0.98 && desktop <= 1.06, `Desktop scale ${desktop} stays crisp`);

  // Compact landscape lifts the floor anchor cleanly above thumb controls
  assert.ok(
    computeLandscapeFloorAnchor(844, 390) < computeLandscapeFloorAnchor(1440, 900),
    'Mobile landscape anchors the floor higher so characters stand above bottom touch controls'
  );
});

test('animeSwingCurve delivers anticipation coil, snap overshoot, and smooth settle', () => {
  assert.ok(animeSwingCurve(0.1) < 0, 'Anticipation phase coils slightly negative');
  assert.ok(animeSwingCurve(0.54) > 1.02, 'Explosive snap overshoots slightly for anime punch');
  assert.ok(Math.abs(animeSwingCurve(1.0) - 1.0) < 0.001, 'Settles cleanly to 1.0');
});

test('lerpAngle wraps cleanly across PI boundary and blendSkeleton interpolates joints smoothly', () => {
  const wrapped = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(Math.abs(Math.abs(wrapped) - Math.PI) < 0.05, 'Shortest arc across +/-PI');

  const idle = computeStickmanSkeleton('idle', 0, 0);
  const dash = computeStickmanSkeleton('dash', 0, 0);
  const mid = blendSkeleton(idle, dash, 0.5);
  assert.ok(mid.hip.x > idle.hip.x && mid.hip.x < dash.hip.x);
  assert.ok(mid.hip.y > idle.hip.y && mid.hip.y < dash.hip.y);
});

test('6-hit ground combo, 3-hit air combo, dash-slash, and parry-counter provide rich movesets', () => {
  for (const id of CHARACTER_ORDER) {
    const poses = new Set<string>();
    for (let step = 1; step <= 6; step++) {
      const move = getComboMoveForCharacter(id, step, 'ground');
      poses.add(move.pose);
      assert.ok(move.cancelRatio > 0.35 && move.cancelRatio < 0.7);
    }
    assert.ok(poses.size >= 5, `${id} has at least 5 distinct poses across its 6-hit combo`);

    const air3 = getComboMoveForCharacter(id, 3, 'air');
    assert.equal(air3.pose, 'air_slam');
    assert.equal(air3.unblockable, true);

    const dashSlash = getComboMoveForCharacter(id, 1, 'dash_slash');
    assert.ok(dashSlash.lungeSpeed >= 500);
    assert.equal(dashSlash.afterimages, true);

    const parryCounter = getComboMoveForCharacter(id, 1, 'parry_counter');
    assert.equal(parryCounter.pose, 'parry_counter');
    assert.equal(parryCounter.unblockable, true);
  }
});

test('computeRunStrideKinematics keeps both legs within natural IK bend without straight-leg locking', () => {
  const maxLegReach = 52; // 26 + 26 in StickmanRenderer
  let sawFootLLift = false;
  let sawFootRLift = false;
  let sawGroundContact = false;

  for (let i = 0; i < 36; i++) {
    const phase = (i / 36) * Math.PI * 2;
    const k = computeRunStrideKinematics(phase);
    const distL = Math.hypot(k.footL.x - k.hip.x, k.footL.y - k.hip.y);
    const distR = Math.hypot(k.footR.x - k.hip.x, k.footR.y - k.hip.y);
    assert.ok(
      distL < maxLegReach - 0.5,
      `Phase ${phase.toFixed(2)}: left leg dist ${distL.toFixed(2)} must stay below IK lock (${maxLegReach})`
    );
    assert.ok(
      distR < maxLegReach - 0.5,
      `Phase ${phase.toFixed(2)}: right leg dist ${distR.toFixed(2)} must stay below IK lock (${maxLegReach})`
    );
    if (k.footL.y < -14) sawFootLLift = true;
    if (k.footR.y < -14) sawFootRLift = true;
    if (k.footL.y === 0 || k.footR.y === 0) sawGroundContact = true;
  }

  assert.ok(sawFootLLift && sawFootRLift && sawGroundContact, 'Sprint alternates smoothly between ground contact and lifted recovery');
});

test('every fighter has a unique Ultimate cutscene style, Awakened visual motif, and distinct opening strike', () => {
  const ultStyles = new Set<string>();
  const motifs = new Set<string>();
  const upgradedSpecials = new Set<string>();
  const openers = new Set<string>();

  for (const id of CHARACTER_ORDER) {
    ultStyles.add(getUltimateStyleId(id));
    const profile = getAwakenedVisualProfile(id);
    motifs.add(profile.motif);
    upgradedSpecials.add(profile.upgradedSpecialName);
    openers.add(getComboMoveForCharacter(id, 1, 'ground').pose);
    assert.ok(profile.formTitle.length > 0);
    assert.ok(profile.transformationCallout.length > 0);
  }

  assert.equal(ultStyles.size, 4, 'All 4 fighters have unique Ultimate cutscenes');
  assert.equal(motifs.size, 4, 'All 4 fighters have unique Awakened visual transformations');
  assert.equal(upgradedSpecials.size, 4, 'All 4 fighters have unique Awakened [U] skill names');
  assert.equal(openers.size, 4, 'All 4 fighters open their basic combo with a distinct signature strike');
});

test('elemental mark detonations, Overdrive Ultimates, and cooldown refunds scale cleanly across all fighters', () => {
  const callouts = new Set<string>();
  const linkArts = new Set<string>();

  for (const id of CHARACTER_ORDER) {
    const spec = ELEMENTAL_MARK_SPECS[id];
    callouts.add(spec.detonateCallout);
    linkArts.add(spec.linkArtName);

    const d1 = computeDetonationDamage(id, 1, false, 1);
    const d2 = computeDetonationDamage(id, 2, false, 1);
    const d3 = computeDetonationDamage(id, 3, false, 1);
    const d3Awakened = computeDetonationDamage(id, 3, true, 1);
    assert.ok(d1 < d2 && d2 < d3 && d3 < d3Awakened, `${id} detonation scales monotonically with stacks & awakening`);

    const refund = computeSynergyCooldownRefund(id, 2);
    assert.ok(refund.specialRefund > 0 && refund.dashRefund > 0 && refund.rageBonus > 0);
  }

  assert.equal(callouts.size, 4, 'Every fighter has a distinct elemental detonation callout');
  assert.equal(linkArts.size, 4, 'Every fighter has a distinct [U]->[J] Skill-Link Art');
  assert.ok(computeSynergyCooldownRefund('kagura', 1).healAmount > 0, 'Kagura detonation heals HP');

  const baseUlt = computeOverdriveUltimateDamage(200, false, 0);
  const markedUlt = computeOverdriveUltimateDamage(200, false, 3);
  const overdriveUlt = computeOverdriveUltimateDamage(200, true, 3);
  assert.equal(baseUlt, 200);
  assert.ok(markedUlt > baseUlt, 'Consuming elemental marks boosts Ultimate Boss damage');
  assert.ok(overdriveUlt > markedUlt, 'Awakened Overdrive Ultimate deals massive bonus Boss damage');
});
