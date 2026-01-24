import { ModelFamily } from "@/lib/types";

// Color palette for model families
export const FAMILY_COLORS: Record<ModelFamily | string, string> = {
  yolov8: "#3b82f6", // blue
  yolov9: "#22c55e", // green
  yolov11: "#a855f7", // purple
  yolox: "#f97316", // orange
  other: "#6b7280", // gray
};

// Get color for a model family
export function getFamilyColor(family: string): string {
  return FAMILY_COLORS[family.toLowerCase()] || FAMILY_COLORS.other;
}

// Get all families for legend
export function getAllFamilies(): string[] {
  return Object.keys(FAMILY_COLORS).filter((key) => key !== "other");
}

// Chart theme colors
export const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#22c55e",
  accent: "#eab308",
  muted: "#6b7280",
  grid: "#e5e7eb",
  gridDark: "#374151",
  pareto: "#22c55e",
  preprocess: "#3b82f6", // blue
  inference: "#22c55e", // green
  postprocess: "#f97316", // orange
};
