export const siteConfig = {
  name: "Vision Analysis",
  description:
    "Benchmarks for computer vision models. Compare YOLO models across hardware.",
  url: "https://visionanalysis.ai",
  ogImage: "https://visionanalysis.ai/og-default.png",
  links: {
    github: "https://github.com/Libre-YOLO/libreyolo",
  },
  creator: "LibreYOLO",
};

export const navLinks = [
  { href: "/", label: "Leaderboard" },
  { href: "/compare", label: "Compare" },
  { href: "/hardware", label: "Hardware" },
];

export const defaultFilters = {
  hardware: "a100",
  dataset: "coco_val2017",
  families: [] as string[],
  runtime: "pytorch_fp32",
};

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
