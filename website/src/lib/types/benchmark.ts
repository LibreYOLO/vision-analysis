// Runtime information from benchmark runner
export interface RuntimeInfo {
  format: string;
  precision: string;
  device: string;
}

// Runtime metadata for selectors and display
export interface RuntimeMetadata {
  id: string;
  displayName: string;
  format: string;
  precision: string;
  device: string;
}

// Core benchmark result interface
export interface BenchmarkResult {
  // Identifiers
  model: string;
  family: string;
  variant: string;
  dataset: string;
  hardware: string;  // Pure hardware ID (e.g., "a100", "rpi5")
  runtime: string;   // Runtime ID (e.g., "pytorch_fp32")
  batchSize: number;
  inputSize: number;

  // Accuracy metrics
  mAP_50_95: number;
  mAP_50: number;
  mAP_75: number;
  mAP_small: number;
  mAP_medium: number;
  mAP_large: number;

  // Speed metrics (milliseconds)
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
  totalMs: number;
  throughputFps: number;

  // Memory metrics
  peakVramMb: number;
  peakRamMb: number;

  // Efficiency metrics
  mAPPerGflop: number;
  mAPPerMParams: number;

  // Model specs (denormalized for easy access)
  paramsM: number;
  flopsG: number;

  // Metadata
  timestamp: string;
}

// Model metadata for model pages and comparison
export interface ModelMetadata {
  id: string;
  displayName: string;
  family: string;
  variant: string;
  task: "detection" | "segmentation";

  architecture: {
    type: "one-stage" | "two-stage" | "transformer";
    backbone: string;
    neck: string;
    head: string;
  };

  detectionApproach: "anchor-free" | "anchor-based" | "detr";
  postprocessing: "nms" | "nms-free";

  specs: {
    paramsM: number;
    flopsG: number;
    inputSizeDefault: number;
    numClasses: number;       // number of classes the pretrained weights detect
  };

  paperReportedMap?: number;  // mAP@50-95 claimed by the paper (COCO val2017)

  source: {
    originalWeightsUrl?: string;
    libreyoloWeightsUrl?: string;
  };

  license: string;
  releaseDate: string;
  inLibreYOLO: boolean;
  notes?: string;
}

// Family metadata - per-family info (paper, authors, org, repo)
export interface FamilyMetadata {
  id: string;
  displayName: string;
  organization: string;

  paper: {
    title: string;
    authors: string[];
    venue: string;
    url: string;
  };

  originalRepo: string;
  trainingDataset: string;
}

// Hardware metadata for hardware pages
export interface HardwareMetadata {
  id: string;
  displayName: string;
  category: "cloud_gpu" | "edge" | "browser" | "apple_silicon" | "cpu";

  specs: {
    gpuName?: string;
    cpuName?: string;
    vramGb?: number;
    ramGb?: number;
    fp16Tflops?: number;
    fp32Tflops?: number;
    int8Tops?: number;
    tdpWatts?: number;
  };

  providers: Array<{
    name: string;
    costPerHour: number;
    url: string;
  }>;
}

// Dataset metadata
export interface DatasetMetadata {
  id: string;
  displayName: string;
  task: string;
  stats: {
    numImages: number;
    numClasses: number;
    numInstances: number;
  };
  license: string;
}

// Sort options for leaderboard
export type SortKey = keyof Pick<
  BenchmarkResult,
  | "mAP_50_95"
  | "mAP_50"
  | "throughputFps"
  | "totalMs"
  | "paramsM"
  | "flopsG"
  | "mAPPerGflop"
  | "mAPPerMParams"
>;

export type SortOrder = "asc" | "desc";

// Filter state
export interface FilterState {
  hardware: string;
  dataset: string;
  families: string[];
  runtime: string;
}

// Model family type
export type ModelFamily =
  | "yolov9"
  | "yolox"
  | "other";

// Hardware category type
export type HardwareCategory =
  | "cloud_gpu"
  | "edge"
  | "browser"
  | "apple_silicon"
  | "cpu";
