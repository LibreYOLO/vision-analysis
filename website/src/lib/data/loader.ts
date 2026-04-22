import fs from "fs";
import path from "path";
import { BenchmarkResult } from "@/lib/types";
import { transformRawBenchmark, isRawBenchmark } from "./transform";
import modelsData from "@/data/metadata/models.json";

const APP_ROOT = process.cwd();
const REPO_ROOT = path.basename(APP_ROOT) === "website" ? path.resolve(APP_ROOT, "..") : APP_ROOT;
const GENERATED_RESULTS_PATH = path.join(REPO_ROOT, "generated", "verified-results.v1.json");

// Module-level cache: computed once per build/process
let _cache: Record<string, BenchmarkResult[]> | null = null;

/**
 * Loads the canonical verified benchmark dataset generated from reviewed submissions.
 */
export function loadAllBenchmarks(): Record<string, BenchmarkResult[]> {
  if (_cache) return _cache;

  _cache = loadGeneratedBenchmarks();
  return _cache;
}

function loadGeneratedBenchmarks(): Record<string, BenchmarkResult[]> {
  const grouped: Record<string, BenchmarkResult[]> = {};

  if (!fs.existsSync(GENERATED_RESULTS_PATH)) {
    return grouped;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(GENERATED_RESULTS_PATH, "utf-8"));
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    const modelSpecs = (modelsData.models as Array<{ id: string; specs: { flopsG: number; paramsM: number } }>);

    for (const entry of results) {
      if (isRawBenchmark(entry)) {
        const result = transformRawBenchmark(entry, modelSpecs);
        if (result) {
          addResult(grouped, result);
        }
        continue;
      }

      if (typeof entry === "object" && entry !== null && typeof entry.model === "string") {
        addResult(grouped, entry as BenchmarkResult);
      }
    }

    dedupeGrouped(grouped);
    return grouped;
  } catch (err) {
    console.error(`[loader] Error processing generated results ${GENERATED_RESULTS_PATH}:`, err);
    return grouped;
  }
}

function dedupeGrouped(grouped: Record<string, BenchmarkResult[]>): void {
  for (const key of Object.keys(grouped)) {
    const byModel = new Map<string, BenchmarkResult>();
    for (const result of grouped[key]) {
      const existing = byModel.get(result.model);
      if (!existing || result.timestamp > existing.timestamp) {
        byModel.set(result.model, result);
      }
    }
    grouped[key] = Array.from(byModel.values()).sort((a, b) =>
      a.model.localeCompare(b.model)
    );
  }
}

function addResult(
  grouped: Record<string, BenchmarkResult[]>,
  result: BenchmarkResult
): void {
  const key = `${result.hardware}__${result.runtime}`;
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(result);
}
