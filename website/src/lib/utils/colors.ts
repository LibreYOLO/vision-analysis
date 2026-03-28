import { ModelFamily } from "@/lib/types";

// Color palette for model families - distinct, AA-inspired
export const FAMILY_COLORS: Record<ModelFamily | string, string> = {
  yolov9: "#E8590C",   // Academia Sinica orange
  yolox: "#06b6d4",    // Megvii cyan
  yolov8: "#0B23A9",   // Ultralytics navy
  yolov10: "#7c3aed",  // Tsinghua violet
  yolo11: "#0B23A9",   // Ultralytics navy
  rtdetr: "#de2910",   // Baidu red
  rfdetr: "#22c55e",   // Roboflow green
  other: "#6b7280",    // gray
};

// Get color for a model family
export function getFamilyColor(family: string): string {
  return FAMILY_COLORS[family.toLowerCase()] || FAMILY_COLORS.other;
}

// Get all families for legend
export function getAllFamilies(): string[] {
  return Object.keys(FAMILY_COLORS).filter((key) => key !== "other");
}

// Chart theme colors - light theme (AA-style)
export const CHART_COLORS = {
  primary: "#0891b2",   // indigo-600
  secondary: "#22c55e", // green-500
  accent: "#f97316",    // orange-500
  muted: "#94a3b8",     // slate-400
  grid: "#e2e8f0",      // slate-200
  gridDark: "#374151",  // gray-700
  pareto: "#22c55e",    // green-500
  preprocess: "#3b82f6", // blue
  inference: "#0891b2",  // indigo (brand)
  postprocess: "#f97316", // orange
};
