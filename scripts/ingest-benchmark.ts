#!/usr/bin/env npx tsx
/**
 * Ingest a raw benchmark JSON file from the LibreYOLO benchmark runner
 * and output it in the website's format.
 *
 * Usage: npx tsx scripts/ingest-benchmark.ts <input.json>
 *
 * Supports both old format (no runtime block, nested timing) and
 * new format (runtime block, flat timing).
 */

import * as fs from "fs";
import * as path from "path";

// Known hardware mappings (fuzzy match from hardware.gpu field)
const HARDWARE_MAP: Record<string, string> = {
  "raspberry pi 5": "rpi5",
  "a100": "a100",
  "t4": "t4",
  "rtx 3090": "rtx3090",
  "rtx 4090": "rtx4090",
  "jetson": "jetson",
};

// Known model name normalizations
const MODEL_NAME_MAP: Record<string, string> = {
  yoloxnano: "yolox-nano",
  yoloxtiny: "yolox-tiny",
  yoloxs: "yolox-s",
  yoloxm: "yolox-m",
  yoloxl: "yolox-l",
  yoloxx: "yolox-x",
};

interface RawBenchmark {
  model: {
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
    device: string;
  };
  hardware: {
    gpu: string;
    gpu_memory_gb: number;
    driver_version?: string;
    cuda_version?: string;
    cpu?: string;
    cpu_cores?: number;
    ram_gb?: number;
  };
  software: {
    python: string;
    torch: string;
    libreyolo?: string;
  };
  accuracy: {
    mAP_50: number;
    mAP_50_95: number;
    precision?: number;
    recall?: number;
    mAP_small?: number;
    mAP_medium?: number;
    mAP_large?: number;
  };
  timing: {
    batch_size: number;
    num_images: number;
    // New format (flat)
    ms_per_image?: number;
    preprocess_ms?: number;
    inference_ms?: number;
    postprocess_ms?: number;
    // Old format (nested)
    total_ms?: {
      mean: number;
      preprocess_ms: number;
      inference_ms: number;
      postprocess_ms: number;
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
}

interface WebsiteResult {
  model: string;
  family: string;
  variant: string;
  dataset: string;
  hardware: string;
  runtime: string;
  batchSize: number;
  inputSize: number;
  mAP_50_95: number;
  mAP_50: number;
  mAP_75: number;
  mAP_small: number;
  mAP_medium: number;
  mAP_large: number;
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
  totalMs: number;
  throughputFps: number;
  peakVramMb: number;
  peakRamMb: number;
  mAPPerGflop: number;
  mAPPerMParams: number;
  paramsM: number;
  flopsG: number;
  timestamp: string;
}

function detectHardwareId(gpuName: string): string {
  const lower = gpuName.toLowerCase();
  for (const [pattern, id] of Object.entries(HARDWARE_MAP)) {
    if (lower.includes(pattern)) return id;
  }
  // Fallback: slugify the GPU name
  return lower.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function detectRuntimeId(raw: RawBenchmark): string {
  if (raw.runtime) {
    return `${raw.runtime.format}_${raw.runtime.precision}`;
  }
  // Infer from software
  const torch = raw.software.torch || "";
  const format = torch ? "pytorch" : "unknown";
  const precision = "fp32"; // default
  return `${format}_${precision}`;
}

function normalizeModelName(name: string): string {
  return MODEL_NAME_MAP[name] || name;
}

function toPercentage(value: number): number {
  // If value is < 1, it's a decimal (0.2554 → 25.54)
  // If value is >= 1, it's already a percentage
  return value < 1 ? Math.round(value * 10000) / 100 : Math.round(value * 100) / 100;
}

function extractTiming(raw: RawBenchmark): {
  totalMs: number;
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
} {
  // New format (flat)
  if (raw.timing.ms_per_image !== undefined) {
    return {
      totalMs: Math.round(raw.timing.ms_per_image * 1000) / 1000,
      preprocessMs: Math.round((raw.timing.preprocess_ms || 0) * 1000) / 1000,
      inferenceMs: Math.round((raw.timing.inference_ms || 0) * 1000) / 1000,
      postprocessMs: Math.round((raw.timing.postprocess_ms || 0) * 1000) / 1000,
    };
  }
  // Old format (nested under total_ms)
  if (raw.timing.total_ms) {
    return {
      totalMs: Math.round(raw.timing.total_ms.mean * 1000) / 1000,
      preprocessMs: Math.round(raw.timing.total_ms.preprocess_ms * 1000) / 1000,
      inferenceMs: Math.round(raw.timing.total_ms.inference_ms * 1000) / 1000,
      postprocessMs: Math.round(raw.timing.total_ms.postprocess_ms * 1000) / 1000,
    };
  }
  return { totalMs: 0, preprocessMs: 0, inferenceMs: 0, postprocessMs: 0 };
}

function transform(raw: RawBenchmark): WebsiteResult {
  const hardwareId = detectHardwareId(raw.hardware.gpu);
  const runtimeId = detectRuntimeId(raw);
  const modelName = normalizeModelName(raw.model.name);
  const timing = extractTiming(raw);
  const fps = raw.throughput.fps || raw.throughput.fps_mean || 0;
  const paramsM = raw.model_stats.params_millions;
  const flopsG = raw.model_stats.gflops;
  const mAP = toPercentage(raw.accuracy.mAP_50_95);

  return {
    model: modelName,
    family: raw.model.family,
    variant: raw.model.variant,
    dataset: "coco_val2017",
    hardware: hardwareId,
    runtime: runtimeId,
    batchSize: raw.timing.batch_size,
    inputSize: raw.model.input_size,
    mAP_50_95: mAP,
    mAP_50: toPercentage(raw.accuracy.mAP_50),
    mAP_75: 0,
    mAP_small: toPercentage(raw.accuracy.mAP_small || 0),
    mAP_medium: toPercentage(raw.accuracy.mAP_medium || 0),
    mAP_large: toPercentage(raw.accuracy.mAP_large || 0),
    ...timing,
    throughputFps: Math.round(fps * 100) / 100,
    peakVramMb: 0,
    peakRamMb: 0,
    mAPPerGflop: flopsG > 0 ? Math.round((mAP / flopsG) * 1000) / 1000 : 0,
    mAPPerMParams: paramsM > 0 ? Math.round((mAP / paramsM) * 1000) / 1000 : 0,
    paramsM,
    flopsG,
    timestamp: new Date(raw.metadata.benchmark_date).toISOString(),
  };
}

// Main
const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: npx tsx scripts/ingest-benchmark.ts <input.json>");
  process.exit(1);
}

const rawPath = path.resolve(inputFile);
if (!fs.existsSync(rawPath)) {
  console.error(`File not found: ${rawPath}`);
  process.exit(1);
}

const raw: RawBenchmark = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
const result = transform(raw);

// Output path: website/src/data/results/coco_val2017/detection/{hardware}/{runtime}.json
const outputDir = path.resolve(
  __dirname,
  "../website/src/data/results/coco_val2017/detection",
  result.hardware
);
const outputFile = path.join(outputDir, `${result.runtime}.json`);

// Read existing results or start fresh
let existing: WebsiteResult[] = [];
if (fs.existsSync(outputFile)) {
  existing = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
}

// Replace or append by model ID
const idx = existing.findIndex((e) => e.model === result.model);
if (idx >= 0) {
  existing[idx] = result;
  console.log(`Updated ${result.model} in ${result.hardware}/${result.runtime}`);
} else {
  existing.push(result);
  console.log(`Added ${result.model} to ${result.hardware}/${result.runtime}`);
}

// Write output
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(existing, null, 2) + "\n");

console.log(`\nSummary:`);
console.log(`  Model:    ${result.model} (${result.family} ${result.variant})`);
console.log(`  Hardware: ${result.hardware}`);
console.log(`  Runtime:  ${result.runtime}`);
console.log(`  mAP@50-95: ${result.mAP_50_95}%`);
console.log(`  FPS:       ${result.throughputFps}`);
console.log(`  Latency:   ${result.totalMs}ms`);
console.log(`  Output:    ${outputFile}`);
console.log(`  Entries:   ${existing.length} model(s) in file`);
