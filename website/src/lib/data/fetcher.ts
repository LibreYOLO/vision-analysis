import "server-only";
import { BenchmarkResult, ModelMetadata, FamilyMetadata, HardwareMetadata, DatasetMetadata, RuntimeMetadata } from "@/lib/types";
import { loadAllBenchmarks, loadVerifiedRunCount } from "./loader";
import { benchmarkCoordinateKey, compareBenchmarkCoordinates } from "./utils";

// Import metadata (manually maintained)
import modelsData from "@/data/metadata/models.json";
import familiesData from "@/data/metadata/families.json";
import hardwareData from "@/data/metadata/hardware.json";
import datasetsData from "@/data/metadata/datasets.json";
import runtimesData from "@/data/metadata/runtimes.json";

// Benchmark data loaded from the canonical verified-results snapshot.
function getBenchmarkData(): Record<string, BenchmarkResult[]> {
  return loadAllBenchmarks();
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
 * Total verified benchmark runs (validated submission records) in the dataset.
 */
export function getVerifiedRunCount(): number {
  return loadVerifiedRunCount();
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
export function getHardwareOptions(): Array<{ value: string; label: string }> {
  const hardwareWithData = new Set(
    Object.keys(getBenchmarkData()).map((key) => key.split("__")[0])
  );
  return getHardware()
    .filter((h) => hardwareWithData.has(h.id))
    .map((h) => ({
      value: h.id,
      label: h.displayName,
    }));
}
