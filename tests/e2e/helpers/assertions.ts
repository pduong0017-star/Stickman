import assert from 'node:assert/strict';
import type { TraceMetrics } from './mockCanvas';

const CSS_HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const CSS_RGBA_RE = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0?\.\d+|1(?:\.0+)?|0))?\s*\)$/;

export function assertValidCssHexColor(color: unknown, label: string): void {
  assert.equal(typeof color, 'string', `${label}: expected string color`);
  const s = color as string;
  assert.ok(
    CSS_HEX_RE.test(s) || CSS_RGBA_RE.test(s),
    `${label}: "${String(color)}" must be #RRGGBB, #RRGGBBAA, rgb(...), or rgba(...)`
  );
}

export function assertDrawTraceValid(metrics: TraceMetrics, label: string): void {
  assert.equal(
    metrics.nanDetected,
    false,
    `${label}: NaN/non-finite Canvas2D coordinate detected: ${metrics.nanEvents.join('; ')}`
  );
  assert.equal(
    metrics.saveCount,
    metrics.restoreCount,
    `${label}: unbalanced save/restore (save=${metrics.saveCount}, restore=${metrics.restoreCount})`
  );
  assert.equal(
    metrics.shadowBlurUsed,
    false,
    `${label}: ctx.shadowBlur must remain 0 (observed maxShadowBlur=${metrics.maxShadowBlur})`
  );
}

export function assertDistinctSignatures(
  entries: Array<{ id: string; signature: string }>,
  label: string
): void {
  const bySig = new Map<string, string[]>();
  for (const { id, signature } of entries) {
    if (!bySig.has(signature)) bySig.set(signature, []);
    bySig.get(signature)!.push(id);
  }
  const collisions = Array.from(bySig.values()).filter((group) => group.length > 1);
  assert.equal(
    collisions.length,
    0,
    `${label}: found duplicate visual signatures: ${collisions.map((g) => g.join(' == ')).join('; ')}`
  );
}

export function assertUniqueTuples(
  entries: Array<{ id: string; tupleKey: string }>,
  label: string
): void {
  assertDistinctSignatures(
    entries.map((e) => ({ id: e.id, signature: e.tupleKey })),
    label
  );
}
