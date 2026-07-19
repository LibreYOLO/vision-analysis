export const siteConfig = {
  name: "Vision Analysis",
  description:
    "Credible and deep analysis of computer vision models. Compare accuracy, speed, and efficiency across YOLO families and hardware.",
  url: "https://www.visionanalysis.org",
  links: {
    github: "https://github.com/Libre-YOLO/libreyolo",
  },
  creator: "LibreYOLO",
};

export const navLinks = [
  { href: "/", label: "Leaderboard" },
  { href: "/models", label: "Models" },
  { href: "/compare", label: "Compare" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About" },
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
  { key: "mAP_50_95", label: "mAP@50-95", sortable: true, format: "percent" },
  { key: "mAP_50", label: "mAP@50", sortable: true, format: "percent" },
  { key: "throughputFps", label: "FPS", sortable: true, format: "number" },
  { key: "totalMs", label: "Latency", sortable: true, format: "ms" },
  { key: "paramsM", label: "Params (M)", sortable: true, format: "millions" },
  { key: "flopsG", label: "GFLOPs", sortable: true, format: "number" },
  { key: "mAPPerGflop", label: "mAP/GFLOP", sortable: true, format: "number" },
] as const;
