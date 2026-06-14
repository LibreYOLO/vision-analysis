import { BenchmarkResult } from "@/lib/types";

/**
 * Client-safe utility functions for benchmark data.
 * These do NOT import fs or any server-only modules.
 */

/**
 * Filter benchmark results by families
 */
export function filterByFamilies(
  results: BenchmarkResult[],
  families: string[]
): BenchmarkResult[] {
  if (families.length === 0) return results;
  return results.filter((r) => families.includes(r.family));
}

/**
 * Full coordinate for one measured result. This is the dedupe identity for
 * re-runs: identical coordinates collapse to the latest timestamp, while batch
 * sweeps, input-size sweeps, and subset/full-val runs remain distinct.
 */
export function benchmarkCoordinateKey(result: BenchmarkResult): string {
  return [
    result.model,
    result.hardware,
    result.runtime,
    result.precision,
    result.dataset,
    result.datasetVariant,
    result.numImages,
    result.inputSize,
    result.batchSize,
  ].join("|");
}

export function compareBenchmarkCoordinates(
  a: BenchmarkResult,
  b: BenchmarkResult
): number {
  return (
    a.model.localeCompare(b.model) ||
    a.hardware.localeCompare(b.hardware) ||
    a.runtime.localeCompare(b.runtime) ||
    a.precision.localeCompare(b.precision) ||
    a.dataset.localeCompare(b.dataset) ||
    a.datasetVariant.localeCompare(b.datasetVariant) ||
    a.numImages - b.numImages ||
    a.inputSize - b.inputSize ||
    a.batchSize - b.batchSize ||
    a.timestamp.localeCompare(b.timestamp)
  );
}

/**
 * Sort benchmark results by a key
 */
export function sortResults(
  results: BenchmarkResult[],
  sortKey: keyof BenchmarkResult,
  sortOrder: "asc" | "desc" = "desc"
): BenchmarkResult[] {
  return [...results].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    const diff = (aVal as number) - (bVal as number);
    return sortOrder === "asc" ? diff : -diff;
  });
}

/**
 * Compute Pareto frontier for mAP vs FPS
 */
export function computeParetoFrontier(
  results: BenchmarkResult[]
): BenchmarkResult[] {
  const sorted = [...results].sort((a, b) => b.throughputFps - a.throughputFps);

  const frontier: BenchmarkResult[] = [];
  let maxMaP = -Infinity;

  for (const point of sorted) {
    if (point.mAP_50_95 > maxMaP) {
      frontier.push(point);
      maxMaP = point.mAP_50_95;
    }
  }

  return frontier;
}

/**
 * Get top models by a metric
 */
export function getTopModels(
  results: BenchmarkResult[],
  metric: keyof BenchmarkResult,
  limit: number = 10
): BenchmarkResult[] {
  return sortResults(results, metric, "desc").slice(0, limit);
}
