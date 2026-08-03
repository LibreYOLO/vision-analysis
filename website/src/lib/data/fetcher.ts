import "server-only";
import { BenchmarkResult, ModelMetadata, FamilyMetadata, HardwareMetadata, DatasetMetadata, RuntimeMetadata } from "@/lib/types";
import { loadAllBenchmarks } from "./loader";
import { RF100VL_DATASET_ID } from "./transform";
import { benchmarkCoordinateKey, compareBenchmarkCoordinates } from "./utils";

// Import metadata (manually maintained)
import modelsData from "@/data/metadata/models.json";
import familiesData from "@/data/metadata/families.json";
import hardwareData from "@/data/metadata/hardware.json";
import datasetsData from "@/data/metadata/datasets.json";
import runtimesData from "@/data/metadata/runtimes.json";

// Benchmark data loaded from the canonical verified-results snapshot.
//
// RF100-VL rows are withheld here on purpose. They are a fine-tuned regime
// (one checkpoint per dataset, unweighted mean over 100 datasets), so their
// accuracy is not comparable to a COCO row and their latency is measured
// across 100 different checkpoints. Ranking them in the same table would
// invite exactly the comparison the numbers do not support. Everything that
// reads this function therefore sees COCO-style rows only; RF100-VL is served
// separately by getRf100vlResults().
let _cocoCache: Record<string, BenchmarkResult[]> | null = null;

function getBenchmarkData(): Record<string, BenchmarkResult[]> {
  if (_cocoCache) return _cocoCache;

  const filtered: Record<string, BenchmarkResult[]> = {};
  for (const [key, results] of Object.entries(loadAllBenchmarks())) {
    const rows = results.filter((r) => r.dataset !== RF100VL_DATASET_ID);
    if (rows.length > 0) filtered[key] = rows;
  }
  _cocoCache = filtered;
  return _cocoCache;
}

/**
 * Every RF100-VL row, flattened and ranked by score. Separate from the COCO
 * boards by design; see getBenchmarkData above.
 */
export function getRf100vlResults(): BenchmarkResult[] {
  return Object.values(loadAllBenchmarks())
    .flat()
    .filter((r) => r.dataset === RF100VL_DATASET_ID)
    .sort((a, b) => b.mAP_50_95 - a.mAP_50_95);
}

function compositeKey(hardware: string, runtime: string): string {
  return `${hardware}__${runtime}`;
}

export interface ModelBenchmarkEntry {
  hardware: string;
  runtime: string;
  coordinateKey: string;
  result: BenchmarkResult;
}

/**
 * Get benchmark results for a specific hardware + runtime combination
 */
export function getBenchmarkResults(
  hardware: string = "a100",
  runtime: string = "pytorch_fp32"
): BenchmarkResult[] {
  const key = compositeKey(hardware, runtime);
  return getBenchmarkData()[key] || [];
}

/**
 * Get all benchmark results across all hardware/runtime combinations
 */
export function getAllBenchmarkResults(): Record<string, BenchmarkResult[]> {
  return getBenchmarkData();
}

/**
 * Get all benchmark results for one task, keeping the hardware__runtime
 * grouping. Detection and segmentation report different headline metrics
 * (box vs mask mAP), so every leaderboard view is task-scoped.
 */
export function getAllBenchmarkResultsByTask(
  task: BenchmarkResult["task"]
): Record<string, BenchmarkResult[]> {
  const filtered: Record<string, BenchmarkResult[]> = {};
  for (const [key, results] of Object.entries(getBenchmarkData())) {
    const rows = results.filter((r) => r.task === task);
    if (rows.length > 0) filtered[key] = rows;
  }
  return filtered;
}

/**
 * Get benchmark results for a specific model across all hardware/runtime combos
 */
export function getModelBenchmarks(modelId: string): ModelBenchmarkEntry[] {
  return Object.entries(getBenchmarkData()).flatMap(([key, results]) => {
    const [hardware, runtime] = key.split("__");
    return results
      .filter((result) => result.model === modelId)
      .map((result) => ({
        hardware,
        runtime,
        coordinateKey: benchmarkCoordinateKey(result),
        result,
      }));
  }).sort((a, b) => compareBenchmarkCoordinates(a.result, b.result));
}

/**
 * Get all model metadata
 */
export function getModels(): ModelMetadata[] {
  return modelsData.models as ModelMetadata[];
}

/**
 * Get a single model by ID
 */
export function getModelById(modelId: string): ModelMetadata | undefined {
  return getModels().find((m) => m.id === modelId);
}

/**
 * Get models by family
 */
export function getModelsByFamily(family: string): ModelMetadata[] {
  return getModels().filter((m) => m.family === family);
}

/**
 * Get all family metadata
 */
export function getAllFamilies(): FamilyMetadata[] {
  return familiesData.families as FamilyMetadata[];
}

/**
 * Get a single family by ID
 */
export function getFamilyById(familyId: string): FamilyMetadata | undefined {
  return getAllFamilies().find((f) => f.id === familyId);
}

/**
 * Get all hardware metadata
 */
export function getHardware(): HardwareMetadata[] {
  return hardwareData.hardware as HardwareMetadata[];
}

/**
 * Get a single hardware config by ID
 */
export function getHardwareById(hardwareId: string): HardwareMetadata | undefined {
  return getHardware().find((h) => h.id === hardwareId);
}

/**
 * Get all dataset metadata
 */
export function getDatasets(): DatasetMetadata[] {
  return datasetsData.datasets as DatasetMetadata[];
}

/**
 * Get all runtime metadata
 */
export function getRuntimes(): RuntimeMetadata[] {
  return runtimesData.runtimes as RuntimeMetadata[];
}

/**
 * Get a single runtime by ID
 */
export function getRuntimeById(runtimeId: string): RuntimeMetadata | undefined {
  return getRuntimes().find((r) => r.id === runtimeId);
}

/**
 * Get available runtimes for a specific hardware (only those with data)
 */
export function getRuntimesForHardware(hardware: string): RuntimeMetadata[] {
  const data = getBenchmarkData();
  const availableRuntimeIds = Object.keys(data)
    .filter((key) => key.startsWith(`${hardware}__`))
    .map((key) => key.split("__")[1]);

  return getRuntimes().filter((r) => availableRuntimeIds.includes(r.id));
}

/**
 * Get runtime options for selectors (optionally filtered by hardware)
 */
export function getRuntimeOptions(hardware?: string): Array<{ value: string; label: string }> {
  const runtimes = hardware ? getRuntimesForHardware(hardware) : getRuntimes();
  return runtimes.map((r) => ({
    value: r.id,
    label: r.displayName,
  }));
}

/**
 * Get unique model families from benchmark data
 */
export function getFamilies(): string[] {
  const families = new Set<string>();
  Object.values(getBenchmarkData()).forEach((results) => {
    results.forEach((r) => families.add(r.family));
  });
  return Array.from(families).sort();
}

/**
 * Get hardware options for selectors (only hardware with benchmark data)
 */
export function getHardwareOptions(
  data?: Record<string, BenchmarkResult[]>
): Array<{ value: string; label: string }> {
  const hardwareWithData = new Set(
    Object.keys(data ?? getBenchmarkData()).map((key) => key.split("__")[0])
  );
  return getHardware()
    .filter((h) => hardwareWithData.has(h.id))
    .map((h) => ({
      value: h.id,
      label: h.displayName,
    }));
}
