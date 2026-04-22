import fs from "fs";
import path from "path";
import { BenchmarkResult } from "@/lib/types";
import { transformRawBenchmark, isRawBenchmark } from "./transform";
import modelsData from "@/data/metadata/models.json";

const APP_ROOT = process.cwd();
const REPO_ROOT = path.basename(APP_ROOT) === "website" ? path.resolve(APP_ROOT, "..") : APP_ROOT;
const BENCHMARKS_DIR = path.join(APP_ROOT, "benchmarks");
const GENERATED_RESULTS_PATH = path.join(REPO_ROOT, "generated", "verified-results.v1.json");

// Module-level cache: computed once per build/process
let _cache: Record<string, BenchmarkResult[]> | null = null;

/**
 * Loads all benchmark JSON files from website/benchmarks/,
 * transforms raw files, and groups by hardware__runtime.
 *
 * Supports both raw benchmark format (from benchmark runner)
 * and pre-transformed BenchmarkResult format (legacy data).
 */
export function loadAllBenchmarks(): Record<string, BenchmarkResult[]> {
  if (_cache) return _cache;

  const generated = loadGeneratedBenchmarks();
  if (generated) {
    _cache = generated;
    return generated;
  }

  const grouped: Record<string, BenchmarkResult[]> = {};

  if (!fs.existsSync(BENCHMARKS_DIR)) {
    console.warn(`[loader] Benchmarks directory not found: ${BENCHMARKS_DIR}`);
    _cache = grouped;
    return grouped;
  }

  const files = fs.readdirSync(BENCHMARKS_DIR).filter((f) => f.endsWith(".json"));
  const modelSpecs = (modelsData.models as Array<{ id: string; specs: { flopsG: number; paramsM: number } }>);

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(BENCHMARKS_DIR, file), "utf-8");
      const parsed = JSON.parse(content);

      // Handle array of pre-transformed results (legacy format)
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          addResult(grouped, entry as BenchmarkResult);
        }
        continue;
      }

      // Raw benchmark format - transform it
      if (isRawBenchmark(parsed)) {
        const result = transformRawBenchmark(parsed, modelSpecs);
        if (result) {
          addResult(grouped, result);
        } else {
          console.warn(`[loader] Skipping ${file}: transform returned null`);
        }
        continue;
      }

      // Single pre-transformed result
      if (typeof parsed === "object" && typeof parsed.model === "string") {
        addResult(grouped, parsed as BenchmarkResult);
        continue;
      }

      console.warn(`[loader] Skipping ${file}: unrecognized format`);
    } catch (err) {
      console.error(`[loader] Error processing ${file}:`, err);
    }
  }

  dedupeGrouped(grouped);

  _cache = grouped;
  return grouped;
}

function loadGeneratedBenchmarks(): Record<string, BenchmarkResult[]> | null {
  if (!fs.existsSync(GENERATED_RESULTS_PATH)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(GENERATED_RESULTS_PATH, "utf-8"));
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    if (results.length === 0) {
      return null;
    }

    const grouped: Record<string, BenchmarkResult[]> = {};
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
    return null;
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
