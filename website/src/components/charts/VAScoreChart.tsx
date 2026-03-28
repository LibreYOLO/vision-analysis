"use client";

/* eslint-disable @next/next/no-img-element */

import { useTheme } from "next-themes";

interface VAScoreEntry {
  model: string;
  score: number;
  color: string;
  logo: string;
  provider: string;
  family: string;
}

// One color per company - like AA
const COMPANY_COLORS: Record<string, string> = {
  Ultralytics:       "#0B23A9",
  Tsinghua:          "#7c3aed",
  "Academia Sinica": "#E8590C",
  Megvii:            "#06b6d4",
  Roboflow:          "#22c55e",
  Baidu:             "#de2910",
};

const VA_SCORES: VAScoreEntry[] = [
  { model: "RF-DETR-L",   score: 72, color: COMPANY_COLORS.Roboflow,          logo: "/logos/roboflow.png",        provider: "Roboflow",        family: "RF-DETR" },
  { model: "YOLO11-M",    score: 71, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLO11" },
  { model: "YOLOv10-M",   score: 69, color: COMPANY_COLORS.Tsinghua,          logo: "/logos/tsinghua.webp",       provider: "Tsinghua",        family: "YOLOv10" },
  { model: "YOLOv8-M",    score: 67, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLOv8" },
  { model: "RT-DETR-R50",  score: 66, color: COMPANY_COLORS.Baidu,            logo: "/logos/libreyolo.png",       provider: "Baidu",           family: "RT-DETR" },
  { model: "YOLOv9-C",    score: 65, color: COMPANY_COLORS["Academia Sinica"],logo: "/logos/academia-sinica.png", provider: "Academia Sinica", family: "YOLOv9" },
  { model: "RF-DETR-B",   score: 64, color: COMPANY_COLORS.Roboflow,          logo: "/logos/roboflow.png",        provider: "Roboflow",        family: "RF-DETR" },
  { model: "YOLO11-S",    score: 63, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLO11" },
  { model: "YOLOv10-S",   score: 61, color: COMPANY_COLORS.Tsinghua,          logo: "/logos/tsinghua.webp",       provider: "Tsinghua",        family: "YOLOv10" },
  { model: "YOLOv8-S",    score: 59, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLOv8" },
  { model: "RT-DETR-R18",  score: 58, color: COMPANY_COLORS.Baidu,            logo: "/logos/libreyolo.png",       provider: "Baidu",           family: "RT-DETR" },
  { model: "YOLOv9-S",    score: 57, color: COMPANY_COLORS["Academia Sinica"],logo: "/logos/academia-sinica.png", provider: "Academia Sinica", family: "YOLOv9" },
  { model: "YOLOX-L",     score: 55, color: COMPANY_COLORS.Megvii,            logo: "/logos/megvii.png",          provider: "Megvii",          family: "YOLOX" },
  { model: "YOLO11-L",    score: 53, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLO11" },
  { model: "YOLOv8-L",    score: 51, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLOv8" },
  { model: "YOLOv10-L",   score: 50, color: COMPANY_COLORS.Tsinghua,          logo: "/logos/tsinghua.webp",       provider: "Tsinghua",        family: "YOLOv10" },
  { model: "YOLOv9-M",    score: 48, color: COMPANY_COLORS["Academia Sinica"],logo: "/logos/academia-sinica.png", provider: "Academia Sinica", family: "YOLOv9" },
  { model: "YOLOX-M",     score: 46, color: COMPANY_COLORS.Megvii,            logo: "/logos/megvii.png",          provider: "Megvii",          family: "YOLOX" },
  { model: "RT-DETR-R101", score: 44, color: COMPANY_COLORS.Baidu,            logo: "/logos/libreyolo.png",       provider: "Baidu",           family: "RT-DETR" },
  { model: "YOLOX-S",     score: 43, color: COMPANY_COLORS.Megvii,            logo: "/logos/megvii.png",          provider: "Megvii",          family: "YOLOX" },
  { model: "YOLOv9-T",    score: 40, color: COMPANY_COLORS["Academia Sinica"],logo: "/logos/academia-sinica.png", provider: "Academia Sinica", family: "YOLOv9" },
  { model: "YOLO11-N",    score: 37, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLO11" },
  { model: "YOLOv8-N",    score: 35, color: COMPANY_COLORS.Ultralytics,       logo: "/logos/ultralytics.jpeg",    provider: "Ultralytics",     family: "YOLOv8" },
  { model: "YOLOv10-N",   score: 33, color: COMPANY_COLORS.Tsinghua,          logo: "/logos/tsinghua.webp",       provider: "Tsinghua",        family: "YOLOv10" },
  { model: "YOLOX-Nano",  score: 28, color: COMPANY_COLORS.Megvii,            logo: "/logos/megvii.png",          provider: "Megvii",          family: "YOLOX" },
];

// AA specs: tallest bar ~147px, shortest ~47px, baseline at y=161
// 7 grid lines, bar width 26px, center-to-center ~44px
const BAR_W = 26;
const BAR_SPACING = 44; // center-to-center
const CHART_H = 165; // bar area height
const MAX_SCORE = 100;
const GRID_LINES = 7;

export function VAScoreChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#2a2a38" : "#dddddd";
  const labelColor = isDark ? "#7a7a92" : "#666666";

  const chartW = VA_SCORES.length * BAR_SPACING;
  const gridSpacing = CHART_H / (GRID_LINES + 1);

  return (
    <div className="chart-card">
      {/* Header - minimal, info icon links to methodology */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {VA_SCORES.length} of {VA_SCORES.length} models
          </span>
          <a
            href="/about#va-score"
            title="How the VA v1 Score is calculated"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border text-muted-foreground hover:text-brand hover:border-brand transition-colors text-xs font-medium"
          >
            i
          </a>
        </div>
        <span className="text-xs text-muted-foreground italic">Vision Analysis</span>
      </div>

      {/* SVG Chart - matching AA's exact rendering approach */}
      <div className="px-4 pb-0 overflow-x-auto">
        <svg
          width={chartW + 20}
          height={CHART_H + 130}
          viewBox={`0 0 ${chartW + 20} ${CHART_H + 130}`}
          className="w-full"
          style={{ minWidth: chartW + 20 }}
        >
          <g transform="translate(10, 5)">
            {/* Grid lines */}
            {Array.from({ length: GRID_LINES }).map((_, i) => {
              const y = gridSpacing * (i + 1);
              return (
                <line
                  key={i}
                  x1={0}
                  y1={y}
                  x2={chartW}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth={1}
                />
              );
            })}

            {/* Bars + scores + logos + labels */}
            {VA_SCORES.map((entry, i) => {
              const cx = i * BAR_SPACING + BAR_SPACING / 2;
              const barH = Math.max(24, Math.round((entry.score / MAX_SCORE) * CHART_H));
              const barX = cx - BAR_W / 2;
              const barY = CHART_H - barH;

              return (
                <g key={entry.model}>
                  {/* Bar */}
                  <rect
                    x={barX}
                    y={barY}
                    width={BAR_W}
                    height={barH}
                    rx={3}
                    ry={3}
                    fill={entry.color}
                  />

                  {/* Score number - centered in bar */}
                  <text
                    x={cx}
                    y={barY + barH / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    fontWeight={700}
                    fill="white"
                    style={{ pointerEvents: "none", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                  >
                    {entry.score}
                  </text>

                  {/* Logo - below baseline */}
                  <image
                    href={entry.logo}
                    x={cx - 10}
                    y={CHART_H + 6}
                    width={20}
                    height={15}
                    preserveAspectRatio="xMidYMid meet"
                  />

                  {/* Model name - rotated -62deg like AA */}
                  <text
                    x={cx}
                    y={CHART_H + 30}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={11}
                    fill={labelColor}
                    style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                    transform={`translate(-6, 24) rotate(-62, ${cx}, ${CHART_H + 30})`}
                  >
                    {entry.model}
                  </text>
                </g>
              );
            })}

            {/* Baseline */}
            <line
              x1={0}
              y1={CHART_H}
              x2={chartW}
              y2={CHART_H}
              stroke={gridColor}
              strokeWidth={1}
            />
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 pt-1 flex flex-wrap gap-x-5 gap-y-1 border-t border-border">
        {[
          { label: "Ultralytics", sub: "YOLO11, YOLOv8", color: COMPANY_COLORS.Ultralytics },
          { label: "Roboflow", sub: "RF-DETR", color: COMPANY_COLORS.Roboflow },
          { label: "Tsinghua", sub: "YOLOv10", color: COMPANY_COLORS.Tsinghua },
          { label: "Baidu", sub: "RT-DETR", color: COMPANY_COLORS.Baidu },
          { label: "Academia Sinica", sub: "YOLOv9", color: COMPANY_COLORS["Academia Sinica"] },
          { label: "Megvii", sub: "YOLOX", color: COMPANY_COLORS.Megvii },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-muted-foreground">({item.sub})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
