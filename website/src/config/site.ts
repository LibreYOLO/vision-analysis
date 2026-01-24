export const siteConfig = {
  name: "Vision Analysis",
  description:
    "Independent, reproducible benchmarks for computer vision models. Compare YOLO, RT-DETR, and more across hardware.",
  url: "https://visionanalysis.ai",
  ogImage: "https://visionanalysis.ai/og-default.png",
  links: {
    github: "https://github.com/vision-analysis/benchmarks",
    twitter: "https://twitter.com/visionanalysis",
  },
  creator: "LibreYOLO",
};

export const navLinks = [
  { href: "/", label: "Leaderboard" },
  { href: "/compare", label: "Compare" },
  { href: "/hardware", label: "Hardware" },
];

export const defaultFilters = {
  hardware: "a100_pytorch_fp32",
  dataset: "coco_val2017",
  families: [] as string[],
  exportFormat: "tensorrt_fp16",
};

// Available hardware options
export const hardwareOptions = [
  { value: "a100_pytorch_fp32", label: "A100 (TensorRT FP16)" },
  { value: "t4_tensorrt_fp16", label: "T4 (TensorRT FP16)" },
  { value: "cpu_onnx", label: "CPU (ONNX)" },
];

// Available dataset options
export const datasetOptions = [
  { value: "coco_val2017", label: "COCO val2017" },
];

// Leaderboard column definitions
export const leaderboardColumns = [
  { key: "model", label: "Model", sortable: true },
  { key: "mAP_50_95", label: "mAP", sortable: true, format: "percent" },
  { key: "throughputFps", label: "FPS", sortable: true, format: "number" },
  { key: "totalMs", label: "Latency", sortable: true, format: "ms" },
  { key: "paramsM", label: "Params", sortable: true, format: "millions" },
  { key: "mAPPerGflop", label: "mAP/GFLOP", sortable: true, format: "number" },
] as const;
