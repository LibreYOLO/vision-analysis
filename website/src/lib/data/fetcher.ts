import { BenchmarkResult, ModelMetadata, HardwareMetadata, DatasetMetadata, RuntimeMetadata } from "@/lib/types";

// Import benchmark results (new directory structure: {hardware}/{runtime}.json)
import a100PytorchFp32 from "@/data/results/coco_val2017/detection/a100/pytorch_fp32.json";
import rpi5PytorchFp32 from "@/data/results/coco_val2017/detection/rpi5/pytorch_fp32.json";

// Import metadata
import modelsData from "@/data/metadata/models.json";
import hardwareData from "@/data/metadata/hardware.json";
import datasetsData from "@/data/metadata/datasets.json";
import runtimesData from "@/data/metadata/runtimes.json";

// Benchmark data keyed by composite key: "hardware__runtime"
const benchmarkData: Record<string, BenchmarkResult[]> = {
  a100__pytorch_fp32: a100PytorchFp32 as BenchmarkResult[],
  rpi5__pytorch_fp32: rpi5PytorchFp32 as BenchmarkResult[],
};

function compositeKey(hardware: string, runtime: string): string {
  return `${hardware}__${runtime}`;
}

/**
 * Get benchmark results for a specific hardware + runtime combination
 */
export function getBenchmarkResults(
  hardware: string = "a100",
  runtime: string = "pytorch_fp32"
): BenchmarkResult[] {
  const key = compositeKey(hardware, runtime);
  return benchmarkData[key] || [];
}

/**
 * Get all benchmark results across all hardware/runtime combinations
 */
export function getAllBenchmarkResults(): Record<string, BenchmarkResult[]> {
  return benchmarkData;
}

/**
 * Get benchmark results for a specific model across all hardware/runtime combos
 */
export function getModelBenchmarks(modelId: string): Array<{
  hardware: string;
  runtime: string;
  result: BenchmarkResult | undefined;
}> {
  return Object.entries(benchmarkData).map(([key, results]) => {
    const [hardware, runtime] = key.split("__");
    return {
      hardware,
      runtime,
      result: results.find((r) => r.model === modelId),
    };
  });
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
  const availableRuntimeIds = Object.keys(benchmarkData)
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
  // Collect families across all hardware/runtime combos
  Object.values(benchmarkData).forEach((results) => {
    results.forEach((r) => families.add(r.family));
  });
  return Array.from(families).sort();
}

/**
 * Get hardware options for selectors (only hardware with benchmark data)
 */
export function getHardwareOptions(): Array<{ value: string; label: string }> {
  const hardwareWithData = new Set(
    Object.keys(benchmarkData).map((key) => key.split("__")[0])
  );
  return getHardware()
    .filter((h) => hardwareWithData.has(h.id))
    .map((h) => ({
      value: h.id,
      label: h.displayName,
    }));
}

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
  // Sort by FPS (higher is better)
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
