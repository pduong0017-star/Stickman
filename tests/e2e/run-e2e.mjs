#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const TIER_FILES = {
  '1': { label: 'Tier 1 — Features', file: 'tests/e2e/tier1_features.e2e.test.ts' },
  '2': { label: 'Tier 2 — Boundaries', file: 'tests/e2e/tier2_boundaries.e2e.test.ts' },
  '3': { label: 'Tier 3 — Pairwise', file: 'tests/e2e/tier3_pairwise.e2e.test.ts' },
  '4': { label: 'Tier 4 — Workloads', file: 'tests/e2e/tier4_workloads.e2e.test.ts' },
};

const POSE_SUITE = {
  label: 'Pose — 5×7 Kinematics & Visuals',
  file: 'tests/e2e/poses.e2e.test.ts',
};

const R3_SUITE = {
  label: 'R3 — Ink-Wash & Visuals',
  file: 'tests/e2e/r3_inkwash.e2e.test.ts',
};

const R4_SUITE = {
  label: 'R4 — Mirage Overhaul',
  file: 'tests/e2e/r4_mirage.e2e.test.ts',
};

const R5_SUITE = {
  label: 'R5 — Chrono Overhaul',
  file: 'tests/e2e/r5_chrono.e2e.test.ts',
};

function printUsage(exitCode = 0) {
  const msg = `Usage: node tests/e2e/run-e2e.mjs [options]
Options:
  --tier=1|2|3|4|all     Run specific E2E tier or all sequentially (default: all, includes --pose, --r3, --r4 & --r5)
  --with-unit            Also run src/game/rules.test.ts before E2E tiers
  --pose                 Run programmatic 5x7 pose & joint suite (tests/e2e/poses.e2e.test.ts)
  --r3                   Run R3 Ink-Wash headless & visual suite (tests/e2e/r3_inkwash.e2e.test.ts)
  --r4                   Run R4 Mirage overhaul E2E suite (tests/e2e/r4_mirage.e2e.test.ts)
  --r5                   Run R5 Chrono overhaul E2E suite (tests/e2e/r5_chrono.e2e.test.ts)
  --render-visuals       Force Tier 4 visual PNG generation via render-skins.py
  --render-poses         Force 5x7 pose sheet PNG generation via render-poses.py
  --render-r3            Force R3 4-sheet PNG generation via render-r3-sheet.py
  --out-dir=<path>       Output directory for visual renders (default: .agents/teamwork/e2e_renders)
  --verbose              Stream full test runner output
  --help                 Show this help message`;
  if (exitCode !== 0) {
    console.error(msg);
  } else {
    console.log(msg);
  }
  process.exit(exitCode);
}

function parseArgs(argv) {
  let tier = 'all';
  let tierExplicit = false;
  let withUnit = false;
  let pose = false;
  let r3 = false;
  let r4 = false;
  let r5 = false;
  let renderVisuals = false;
  let renderPoses = false;
  let renderR3 = false;
  let outDir = path.join(PROJECT_ROOT, '.agents', 'teamwork', 'e2e_renders');
  let verbose = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      printUsage(0);
    } else if (arg === '--with-unit') {
      withUnit = true;
    } else if (arg === '--pose') {
      pose = true;
    } else if (arg === '--r3') {
      r3 = true;
    } else if (arg === '--r4') {
      r4 = true;
    } else if (arg === '--r5') {
      r5 = true;
    } else if (arg === '--render-visuals') {
      renderVisuals = true;
    } else if (arg === '--render-poses') {
      renderPoses = true;
    } else if (arg === '--render-r3') {
      renderR3 = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg.startsWith('--tier=')) {
      const val = arg.slice('--tier='.length).trim();
      if (!['1', '2', '3', '4', 'all'].includes(val)) {
        console.error(`Error: Invalid --tier value "${val}". Expected 1, 2, 3, 4, or all.`);
        printUsage(1);
      }
      tier = val;
      tierExplicit = true;
    } else if (arg.startsWith('--out-dir=')) {
      const val = arg.slice('--out-dir='.length).trim();
      if (!val) {
        console.error('Error: --out-dir requires a non-empty path.');
        printUsage(1);
      }
      outDir = path.resolve(PROJECT_ROOT, val);
    } else {
      console.error(`Error: Unknown flag "${arg}".`);
      printUsage(1);
    }
  }

  return { tier, tierExplicit, withUnit, pose, r3, r4, r5, renderVisuals, renderPoses, renderR3, outDir, verbose };
}

function bootstrapEsbuildBinary() {
  const candidates = [
    path.join(PROJECT_ROOT, 'node_modules', 'tsx', 'node_modules', '@esbuild', 'android-arm64', 'bin', 'esbuild'),
    path.join(PROJECT_ROOT, 'node_modules', '@esbuild', 'android-arm64', 'bin', 'esbuild'),
    path.join(PROJECT_ROOT, 'node_modules', 'tsx', 'node_modules', '@esbuild', 'linux-x64', 'bin', 'esbuild'),
    path.join(PROJECT_ROOT, 'node_modules', '@esbuild', 'linux-x64', 'bin', 'esbuild'),
  ];

  const srcBin = candidates.find((p) => fs.existsSync(p));
  if (!srcBin) {
    console.error('Error: Could not locate esbuild native binary under node_modules.');
    process.exit(1);
  }

  const tmpDir = process.env.TMPDIR || '/data/user/0/com.agy/cache' || os.tmpdir();
  fs.mkdirSync(tmpDir, { recursive: true });
  const destBin = path.join(tmpDir, 'esbuild_bin');

  const srcStat = fs.statSync(srcBin);
  let needsCopy = true;
  if (fs.existsSync(destBin)) {
    const destStat = fs.statSync(destBin);
    if (destStat.size === srcStat.size) {
      needsCopy = false;
    }
  }

  if (needsCopy) {
    fs.copyFileSync(srcBin, destBin);
  }
  fs.chmodSync(destBin, 0o755);
  return destBin;
}

function parseTapCounts(output) {
  const testsMatch = output.match(/^(?:ℹ|#)\s*tests\s+(\d+)/m);
  const passMatch = output.match(/^(?:ℹ|#)\s*pass\s+(\d+)/m);
  const failMatch = output.match(/^(?:ℹ|#)\s*fail\s+(\d+)/m);
  return {
    tests: testsMatch ? Number(testsMatch[1]) : 0,
    pass: passMatch ? Number(passMatch[1]) : 0,
    fail: failMatch ? Number(failMatch[1]) : 0,
  };
}

function runSuite(label, relFile, esbuildBin, extraEnv, verbose) {
  const tsxCli = path.join(PROJECT_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!fs.existsSync(tsxCli)) {
    console.error(`Error: tsx CLI not found at ${tsxCli}`);
    process.exit(1);
  }
  const absTestFile = path.join(PROJECT_ROOT, relFile);
  if (!fs.existsSync(absTestFile)) {
    console.error(`Error: Test file not found: ${absTestFile}`);
    process.exit(1);
  }

  const existingNodeOpts = process.env.NODE_OPTIONS || '';
  const nodeOptions = existingNodeOpts.includes('--max-old-space-size')
    ? existingNodeOpts
    : `${existingNodeOpts} --max-old-space-size=2048`.trim();

  const startMs = Date.now();
  const res = spawnSync(
    process.execPath,
    [tsxCli, '--test', absTestFile],
    {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
        ESBUILD_BINARY_PATH: esbuildBin,
        ...extraEnv,
      },
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    }
  );
  const durationMs = Date.now() - startMs;
  const combined = `${res.stdout || ''}\n${res.stderr || ''}`;
  const counts = parseTapCounts(combined);
  const passed = res.status === 0;

  if (verbose || !passed) {
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
  }

  return {
    label,
    file: relFile,
    passed,
    exitCode: res.status ?? 1,
    durationMs,
    ...counts,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const esbuildBin = bootstrapEsbuildBinary();

  // Ensure render output dir & .nomedia isolation if visuals will be written
  fs.mkdirSync(opts.outDir, { recursive: true });
  const nomediaPath = path.join(opts.outDir, '.nomedia');
  if (!fs.existsSync(nomediaPath)) {
    fs.writeFileSync(nomediaPath, '');
  }
  const posesDir = path.join(opts.outDir, 'poses');
  fs.mkdirSync(posesDir, { recursive: true });
  const posesNomedia = path.join(posesDir, '.nomedia');
  if (!fs.existsSync(posesNomedia)) {
    fs.writeFileSync(posesNomedia, '');
  }
  const r3Dir = path.join(opts.outDir, 'r3');
  fs.mkdirSync(r3Dir, { recursive: true });
  const r3Nomedia = path.join(r3Dir, '.nomedia');
  if (!fs.existsSync(r3Nomedia)) {
    fs.writeFileSync(r3Nomedia, '');
  }

  const extraEnv = {
    STICKMAN_RENDER_DIR: opts.outDir,
    STICKMAN_RENDER_VISUALS: opts.renderVisuals ? '1' : process.env.STICKMAN_RENDER_VISUALS || '0',
    STICKMAN_RENDER_POSES: opts.renderPoses ? '1' : process.env.STICKMAN_RENDER_POSES || '0',
    R3_RENDER_DIR: opts.renderR3 ? r3Dir : process.env.R3_RENDER_DIR || '',
  };

  const queue = [];
  if (opts.withUnit) {
    queue.push({ label: 'Unit — rules.test.ts', file: 'src/game/rules.test.ts' });
  }

  if (
    opts.tier === 'all' &&
    (opts.tierExplicit || (!opts.pose && !opts.renderPoses && !opts.r3 && !opts.renderR3 && !opts.r4 && !opts.r5))
  ) {
    queue.push(TIER_FILES['1'], TIER_FILES['2'], TIER_FILES['3'], TIER_FILES['4'], POSE_SUITE, R3_SUITE, R4_SUITE, R5_SUITE);
  } else if (opts.tierExplicit) {
    queue.push(TIER_FILES[opts.tier]);
    if (opts.renderVisuals && opts.tier !== '4') {
      queue.push(TIER_FILES['4']);
    }
    if (opts.pose || opts.renderPoses) {
      queue.push(POSE_SUITE);
    }
    if (opts.r3 || opts.renderR3) {
      queue.push(R3_SUITE);
    }
    if (opts.r4) {
      queue.push(R4_SUITE);
    }
    if (opts.r5) {
      queue.push(R5_SUITE);
    }
  } else {
    if (opts.pose || opts.renderPoses) {
      queue.push(POSE_SUITE);
    }
    if (opts.r3 || opts.renderR3) {
      queue.push(R3_SUITE);
    }
    if (opts.r4) {
      queue.push(R4_SUITE);
    }
    if (opts.r5) {
      queue.push(R5_SUITE);
    }
    if (opts.renderVisuals) {
      queue.push(TIER_FILES['4']);
    }
  }

  console.log(`\n[Stickman E2E Runner] Executing ${queue.length} suite(s) sequentially...`);
  console.log(`[Stickman E2E Runner] esbuild: ${esbuildBin}`);
  if (opts.renderVisuals || opts.renderPoses || opts.pose || opts.r3 || opts.renderR3) {
    console.log(`[Stickman E2E Runner] visual output: ${opts.outDir}`);
  }

  const results = [];
  for (const item of queue) {
    console.log(`\n==> Running ${item.label} (${item.file})`);
    const r = runSuite(item.label, item.file, esbuildBin, extraEnv, opts.verbose);
    results.push(r);
    const statusTag = r.passed ? 'PASS' : 'FAIL';
    console.log(
      `[${statusTag}] ${r.label}: ${r.pass}/${r.tests || '?'} passed (${r.fail} failed) in ${r.durationMs}ms`
    );
  }

  const totalTests = results.reduce((s, r) => s + r.tests, 0);
  const totalPass = results.reduce((s, r) => s + r.pass, 0);
  const totalFail = results.reduce((s, r) => s + r.fail, 0);
  const allPassed = results.every((r) => r.passed);

  console.log('\n==================== E2E SUMMARY ====================');
  for (const r of results) {
    console.log(
      `  ${r.passed ? 'PASS' : 'FAIL'} | ${r.label.padEnd(32)} | ${String(r.pass).padStart(3)}/${String(r.tests).padStart(3)} | ${r.durationMs}ms`
    );
  }
  console.log('-----------------------------------------------------');
  console.log(`  TOTAL: ${totalPass}/${totalTests} passed, ${totalFail} failed`);
  console.log('=====================================================\n');

  process.exit(allPassed ? 0 : 1);
}

main();
