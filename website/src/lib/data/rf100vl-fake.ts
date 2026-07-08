// PLACEHOLDER DATA ONLY.
//
// Deterministic semi-random RF100-VL numbers so the landing-page table layout
// can be reviewed before real `va-bench rf100vl` submissions exist. The
// numbers are seeded from the model id (stable across builds and across
// server/client renders) and are plausible-looking but entirely made up.
// Every row is tagged `fake: true` and the UI must keep labeling it as such.
// Delete this module when real RF100-VL results land in generated/.

import type { BenchmarkResult, Rf100VlModelScore } from "@/lib/types";

/** FNV-1a hash: cheap, stable, good-enough spread for placeholder values. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One fake RF100-VL score per model (percent scale). AP@50 lands in ~[62, 90],
 * AP@50-95 at a plausible ~[0.62, 0.74] ratio of it: the shape of the real
 * published RF100-VL tables, with none of the substance.
 */
export function buildFakeRf100VlRows(canonicalRows: BenchmarkResult[]): Rf100VlModelScore[] {
  const seen = new Set<string>();
  const rows: Rf100VlModelScore[] = [];
  for (const r of canonicalRows) {
    if (seen.has(r.model)) continue;
    seen.add(r.model);
    const h = hash(`rf100vl:${r.model}`);
    const ap50 = 62 + (h % 2800) / 100; // 62.00 .. 89.99
    const ratio = 0.62 + ((h >>> 11) % 1200) / 10000; // 0.62 .. 0.74
    rows.push({
      model: r.model,
      ap50: Math.round(ap50 * 10) / 10,
      ap5095: Math.round(ap50 * ratio * 10) / 10,
      fake: true,
    });
  }
  return rows;
}
