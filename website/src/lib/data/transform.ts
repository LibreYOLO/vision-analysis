import { BenchmarkResult } from "@/lib/types";

/**
 * Raw benchmark JSON schema - produced by the LibreYOLO benchmark runner.
 */
export interface RawBenchmark {
  model: {
    id?: string;
    name: string;
    family: string;
    variant: string;
    source?: string;
    weights?: string;
    input_size: number;
  };
  runtime?: {
    format: string;
    precision: string;
    provider?: string;
    device: string;
  };
  hardware: {
    id?: string;
    gpu: string;
    gpu_memory_gb: number;
    driver_version?: string;
    cuda_version?: string;
    cpu?: string;
    cpu_cores?: number;
    ram_gb?: number;
  };
  dataset?: {
    id?: string;
    split?: string;
    num_images?: number;
  };
  config?: {
    batch_size?: number;
    input_size?: number;
    conf?: number;
    iou?: number;
    max_det?: number;
  };
  software: {
    python: string;
    torch: string;
    libreyolo?: string;
  };
  accuracy: {
    mAP_50: number;
    mAP_50_95: number;
    mAP_75?: number;
    precision?: number;
    recall?: number;
    mAP_small?: number;
    mAP_medium?: number;
    mAP_large?: number;
  };
  memory?: {
    peak_vram_mb?: number;
    peak_ram_mb?: number;
  };
  timing: {
    batch_size?: number;
    num_images?: number;
    ms_per_image?: number;
    preprocess_ms?: number;
    inference_ms?: number;
    postprocess_ms?: number;
    total_ms?: {
      mean: number;
      std?: number;
      p50?: number;
      p95?: number;
      p99?: number;
      preprocess_ms?: number;
      inference_ms?: number;
      postprocess_ms?: number;
    };
  };
  throughput: {
    fps?: number;
    fps_mean?: number;
    fps_p50?: number;
  };
  model_stats: {
    params_millions: number;
    gflops: number;
  };
  metadata: {
    benchmark_date: string;
    benchmark_version: string;
  };
  eval?: {
    dataset?: string;
    split?: string;
    numImages?: number;
  };
}

// --- Hardware ID mapping ---

const HARDWARE_MAP: Array<{ pattern: string; id: string }> = [
  { pattern: "a100", id: "a100" },
  { pattern: "raspberry pi 5", id: "rpi5" },
  { pattern: "t4", id: "t4" },
  { pattern: "rtx 3090", id: "rtx3090" },
  { pattern: "rtx 4090", id: "rtx4090" },
  { pattern: "5080", id: "rtx5080" },
  { pattern: "dgx spark", id: "dgx_spark" },
  { pattern: "gb10", id: "dgx_spark" },
  { pattern: "jetson", id: "jetson_orin" },
  { pattern: "orin", id: "jetson_orin" },
];

const HARDWARE_ID_ALIASES: Record<string, string> = {
  jetson: "jetson_orin",
  orin: "jetson_orin",
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function detectHardwareId(raw: RawBenchmark): string {
  const explicitId = raw.hardware.id?.trim();
  if (explicitId) {
    const normalizedId = slugify(explicitId);
    return HARDWARE_ID_ALIASES[normalizedId] ?? normalizedId;
  }

  const gpuLower = raw.hardware.gpu.toLowerCase();
  for (const { pattern, id } of HARDWARE_MAP) {
    if (gpuLower.includes(pattern)) return id;
  }
  const cpuLower = (raw.hardware.cpu ?? "").toLowerCase();
  for (const { pattern, id } of HARDWARE_MAP) {
    if (cpuLower.includes(pattern)) return id;
  }
  // Fallback: slugify gpu name
  return slugify(gpuLower);
}

// --- Runtime ID ---

function detectRuntimeId(raw: RawBenchmark): string {
  if (raw.runtime) {
    return `${raw.runtime.format}_${raw.runtime.precision}`;
  }
  // Infer from software
  const format = raw.software.torch ? "pytorch" : "unknown";
  return `${format}_fp32`;
}

// --- Model name normalization ---

const MODEL_NAME_MAP: Record<string, string> = {
  "yolov9-t": "yolov9t",
  "yolov9-s": "yolov9s",
  "yolov9-m": "yolov9m",
  "yolov9-c": "yolov9c",
  "yolov9t": "yolov9t",
  "yolov9s": "yolov9s",
  "yolov9m": "yolov9m",
  "yolov9c": "yolov9c",
  "yoloxnano": "yolox-nano",
  "yolox-nano": "yolox-nano",
  "yoloxtiny": "yolox-tiny",
  "yolox-tiny": "yolox-tiny",
  "yoloxs": "yolox-s",
  "yolox-s": "yolox-s",
  "yoloxm": "yolox-m",
  "yolox-m": "yolox-m",
  "yoloxl": "yolox-l",
  "yolox-l": "yolox-l",
  "yoloxx": "yolox-x",
  "yolox-x": "yolox-x",
  "rfdetr-n": "rfdetr-n",
  "rf-detr-n": "rfdetr-n",
  "rfdetr-s": "rfdetr-s",
  "rf-detr-s": "rfdetr-s",
  "rfdetr-m": "rfdetr-m",
  "rf-detr-m": "rfdetr-m",
  "rfdetr-b": "rfdetr-b",
  "rf-detr-b": "rfdetr-b",
  "rfdetr-l": "rfdetr-l",
  "rf-detr-l": "rfdetr-l",
};

function normalizeModelName(raw: RawBenchmark): string {
  const explicitId = raw.model.id?.trim();
  if (explicitId) return explicitId;

  const name = raw.model.name.toLowerCase();
  if (MODEL_NAME_MAP[name]) return MODEL_NAME_MAP[name];

  // Algorithmic fallback: family + variant
  const family = raw.model.family.toLowerCase();
  const variant = raw.model.variant.toLowerCase();
  if (family.startsWith("yolov9")) return `yolov9${variant}`;
  if (family.startsWith("yolox")) return `yolox-${variant}`;
  return `${family}-${variant}`;
}

// --- mAP conversion ---

function toPercentage(value: number): number {
  // If < 1, it's decimal form (0.37 becomes 37.03). If >= 1, already percentage.
  const pct = value < 1 ? value * 100 : value;
  return Math.round(pct * 100) / 100;
}

// --- Timing extraction ---

function extractTiming(timing: RawBenchmark["timing"]): {
  totalMs: number;
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
} {
  // New flat format
  if (timing.ms_per_image !== undefined) {
    return {
      totalMs: round3(timing.ms_per_image),
      preprocessMs: round3(timing.preprocess_ms ?? 0),
      inferenceMs: round3(timing.inference_ms ?? 0),
      postprocessMs: round3(timing.postprocess_ms ?? 0),
    };
  }
  // Old nested format
  if (timing.total_ms && typeof timing.total_ms === "object") {
    return {
      totalMs: round3(timing.total_ms.mean),
      preprocessMs: round3(timing.total_ms.preprocess_ms ?? 0),
      inferenceMs: round3(timing.total_ms.inference_ms ?? 0),
      postprocessMs: round3(timing.total_ms.postprocess_ms ?? 0),
    };
  }
  return { totalMs: 0, preprocessMs: 0, inferenceMs: 0, postprocessMs: 0 };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

// --- Dataset coordinate extraction ---

const COCO_VAL2017_FULL_IMAGES = 5000;
const FULL_VAL_IMAGE_TOLERANCE = 5;

function normalizeDatasetId(raw: RawBenchmark): string {
  const datasetId = raw.dataset?.id?.toLowerCase();
  const evalDataset = raw.eval?.dataset?.toLowerCase();
  const split = (raw.dataset?.split ?? raw.eval?.split ?? "").toLowerCase();

  if (
    ((datasetId === "coco2017" || datasetId === "coco_val2017") && split === "val2017") ||
    (evalDataset === "coco" && split === "val2017")
  ) {
    return "coco_val2017";
  }

  if (datasetId && split) return slugify(`${datasetId}_${split}`);
  if (datasetId) return slugify(datasetId);
  if (evalDataset && split) return slugify(`${evalDataset}_${split}`);
  return "coco_val2017";
}

function extractNumImages(raw: RawBenchmark): number {
  return raw.eval?.numImages ?? raw.dataset?.num_images ?? raw.timing.num_images ?? 0;
}

function datasetVariantFromCount(numImages: number): string {
  if (Math.abs(numImages - COCO_VAL2017_FULL_IMAGES) <= FULL_VAL_IMAGE_TOLERANCE) {
    return "full";
  }
  if (numImages === 500) return "mini500";
  return numImages > 0 ? `subset${numImages}` : "unknown";
}

function precisionFromRuntime(runtimeId: string): string {
  const parts = runtimeId.split("_");
  return parts[parts.length - 1] || "fp32";
}

// --- Main transform ---

interface ModelSpec {
  id: string;
  specs: { flopsG: number; paramsM: number };
}

/**
 * Transforms a raw benchmark JSON into a BenchmarkResult.
 * `modelSpecs` provides fallback flopsG values from models.json metadata.
 */
export function transformRawBenchmark(
  raw: RawBenchmark,
  modelSpecs: ModelSpec[]
): BenchmarkResult | null {
  try {
    const hardwareId = detectHardwareId(raw);
    const runtimeId = detectRuntimeId(raw);
    const modelId = normalizeModelName(raw);
    const timing = extractTiming(raw.timing);
    const fps = raw.throughput.fps ?? raw.throughput.fps_mean ?? 0;
    const mAP = toPercentage(raw.accuracy.mAP_50_95);
    const dataset = normalizeDatasetId(raw);
    const numImages = extractNumImages(raw);
    const batchSize = raw.config?.batch_size ?? raw.timing.batch_size ?? 1;
    const inputSize = raw.config?.input_size ?? raw.model.input_size;
    const precision = raw.runtime?.precision ?? precisionFromRuntime(runtimeId);

    let paramsM = raw.model_stats.params_millions;
    let flopsG = raw.model_stats.gflops;

    // Fallback to metadata if raw reports 0
    if (flopsG === 0 || paramsM === 0) {
      const meta = modelSpecs.find((m) => m.id === modelId);
      if (meta) {
        if (flopsG === 0) flopsG = meta.specs.flopsG;
        if (paramsM === 0) paramsM = meta.specs.paramsM;
      }
    }

    return {
      model: modelId,
      family: raw.model.family,
      variant: raw.model.variant,
      dataset,
      datasetVariant: datasetVariantFromCount(numImages),
      numImages,
      hardware: hardwareId,
      runtime: runtimeId,
      precision,
      batchSize,
      inputSize,
      mAP_50_95: mAP,
      mAP_50: toPercentage(raw.accuracy.mAP_50),
      mAP_75: toPercentage(raw.accuracy.mAP_75 ?? 0),
      mAP_small: toPercentage(raw.accuracy.mAP_small ?? 0),
      mAP_medium: toPercentage(raw.accuracy.mAP_medium ?? 0),
      mAP_large: toPercentage(raw.accuracy.mAP_large ?? 0),
      ...timing,
      throughputFps: Math.round(fps * 100) / 100,
      peakVramMb: raw.memory?.peak_vram_mb ?? 0,
      peakRamMb: raw.memory?.peak_ram_mb ?? 0,
      mAPPerGflop: flopsG > 0 ? Math.round((mAP / flopsG) * 1000) / 1000 : 0,
      mAPPerMParams: paramsM > 0 ? Math.round((mAP / paramsM) * 1000) / 1000 : 0,
      paramsM,
      flopsG,
      timestamp: new Date(raw.metadata.benchmark_date).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Detects whether a JSON object is a raw benchmark (has model.name object)
 * vs a pre-transformed BenchmarkResult (has model string).
 */
export function isRawBenchmark(obj: unknown): obj is RawBenchmark {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "model" in obj &&
    typeof (obj as Record<string, unknown>).model === "object"
  );
}
