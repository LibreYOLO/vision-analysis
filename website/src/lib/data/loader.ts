import fs from "fs";
import path from "path";
import { BenchmarkResult } from "@/lib/types";
import { transformRawBenchmark, isRawBenchmark } from "./transform";
import { benchmarkCoordinateKey, compareBenchmarkCoordinates } from "./utils";
import modelsData from "@/data/metadata/models.json";

const APP_ROOT = process.cwd();
const REPO_ROOT = path.basename(APP_ROOT) === "website" ? path.resolve(APP_ROOT, "..") : APP_ROOT;
const GENERATED_RESULTS_PATH = path.join(REPO_ROOT, "generated", "verified-results.v1.json");

// Module-level cache: computed once per build/process
let _cache: Record<string, BenchmarkResult[]> | null = null;

type ModelSpec = {
  id: string;
  specs: {
    flopsG: number;
    paramsM: number;
    inputSizeDefault?: number;
  };
};

/**
 * Loads the canonical verified benchmark dataset generated from reviewed submissions.
 */
export function loadAllBenchmarks(): Record<string, BenchmarkResult[]> {
  if (_cache) return _cache;

  _cache = loadGeneratedBenchmarks();
  return _cache;
}

/**
 * Total number of verified benchmark runs in the canonical dataset. This is the
 * raw count of validated submission records (one JSON per run), NOT the deduped
 * row count the leaderboard shows. Every record passed schema + support-matrix
 * validation, so the number stays honest to the site's "verified only" rule.
 */
export function loadVerifiedRunCount(): number {
  if (!fs.existsSync(GENERATED_RESULTS_PATH)) return 0;
  try {
    const parsed = JSON.parse(fs.readFileSync(GENERATED_RESULTS_PATH, "utf-8"));
    return Array.isArray(parsed?.results) ? parsed.results.length : 0;
  } catch {
    return 0;
  }
}

function loadGeneratedBenchmarks(): Record<string, BenchmarkResult[]> {
  const grouped: Record<string, BenchmarkResult[]> = {};

  if (!fs.existsSync(GENERATED_RESULTS_PATH)) {
    return grouped;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(GENERATED_RESULTS_PATH, "utf-8"));
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    const modelSpecs = modelsData.models as ModelSpec[];

    for (const entry of results) {
      if (isRawBenchmark(entry)) {
        const result = transformRawBenchmark(entry, modelSpecs);
        if (result) {
          addResult(grouped, result);
        }
        continue;
      }

      if (typeof entry === "object" && entry !== null && typeof entry.model === "string") {
        addResult(grouped, completeBenchmarkResult(entry as Partial<BenchmarkResult>, modelSpecs));
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
    const byCoordinate = new Map<string, BenchmarkResult>();
    for (const result of grouped[key]) {
      const coordinateKey = benchmarkCoordinateKey(result);
      const existing = byCoordinate.get(coordinateKey);
      if (!existing || result.timestamp > existing.timestamp) {
        byCoordinate.set(coordinateKey, result);
      }
    }
    grouped[key] = Array.from(byCoordinate.values()).sort(compareBenchmarkCoordinates);
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

function precisionFromRuntime(runtime: string | undefined): string {
  const parts = runtime?.split("_") ?? [];
  return parts[parts.length - 1] || "fp32";
}

const COCO_VAL2017_FULL_IMAGES = 5000;
const FULL_VAL_IMAGE_TOLERANCE = 5;

function datasetVariantFromCount(numImages: number): string {
  if (Math.abs(numImages - COCO_VAL2017_FULL_IMAGES) <= FULL_VAL_IMAGE_TOLERANCE) {
    return "full";
  }
  if (numImages === 500) return "mini500";
  return numImages > 0 ? `subset${numImages}` : "unknown";
}

function completeBenchmarkResult(
  entry: Partial<BenchmarkResult>,
  modelSpecs: ModelSpec[]
): BenchmarkResult {
  const modelSpec = modelSpecs.find((m) => m.id === entry.model);
  const numImages = entry.numImages ?? 5000;

  return {
    ...entry,
    dataset: entry.dataset ?? "coco_val2017",
    datasetVariant: entry.datasetVariant ?? datasetVariantFromCount(numImages),
    numImages,
    precision: entry.precision ?? precisionFromRuntime(entry.runtime),
    batchSize: entry.batchSize ?? 1,
    inputSize: entry.inputSize ?? modelSpec?.specs.inputSizeDefault ?? 0,
  } as BenchmarkResult;
}
