import { BenchmarkResult, ModelMetadata, HardwareMetadata, DatasetMetadata } from "@/lib/types";

// Import benchmark results
import a100Results from "@/data/results/coco_val2017/detection/a100_pytorch_fp32.json";
import t4Results from "@/data/results/coco_val2017/detection/t4_tensorrt_fp16.json";
import cpuResults from "@/data/results/coco_val2017/detection/cpu_onnx.json";

// Import metadata
import modelsData from "@/data/metadata/models.json";
import hardwareData from "@/data/metadata/hardware.json";
import datasetsData from "@/data/metadata/datasets.json";

// Type assertion for imported data
const benchmarkData: Record<string, BenchmarkResult[]> = {
  a100_pytorch_fp32: a100Results as BenchmarkResult[],
  t4_tensorrt_fp16: t4Results as BenchmarkResult[],
  cpu_onnx: cpuResults as BenchmarkResult[],
};

/**
 * Get benchmark results for a specific hardware configuration
 */
export function getBenchmarkResults(
  hardware: string = "a100_pytorch_fp32"
): BenchmarkResult[] {
  return benchmarkData[hardware] || benchmarkData.a100_pytorch_fp32;
}

/**
 * Get all benchmark results across all hardware
 */
export function getAllBenchmarkResults(): Record<string, BenchmarkResult[]> {
  return benchmarkData;
}

/**
 * Get benchmark results for a specific model across all hardware
 */
export function getModelBenchmarks(modelId: string): Array<{
  hardware: string;
  result: BenchmarkResult | undefined;
}> {
  return Object.entries(benchmarkData).map(([hardware, results]) => ({
    hardware,
    result: results.find((r) => r.model === modelId),
  }));
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
 * Get unique model families from benchmark data
 */
export function getFamilies(): string[] {
  const families = new Set<string>();
  getBenchmarkResults().forEach((r) => families.add(r.family));
  return Array.from(families).sort();
}

/**
 * Get hardware options for selectors
 */
export function getHardwareOptions(): Array<{ value: string; label: string }> {
  return getHardware().map((h) => ({
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
