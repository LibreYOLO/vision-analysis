"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import * as Plot from "@observablehq/plot";

interface CompanyPoint {
  company: string;
  date: Date;
  score: number;
  model: string;
  color: string;
}

const COMPANY_COLORS: Record<string, string> = {
  Ultralytics: "#0B23A9",
  Megvii: "#06b6d4",
  "Academia Sinica": "#E8590C",
  Tsinghua: "#7c3aed",
  Roboflow: "#22c55e",
  Baidu: "#de2910",
  "Open Source": "#78716c",
};

const COMPANY_TIMELINE: CompanyPoint[] = [
  { company: "Ultralytics", date: new Date("2020-06-09"), score: 39, model: "YOLOv5-X", color: COMPANY_COLORS.Ultralytics },
  { company: "Ultralytics", date: new Date("2023-01-10"), score: 55, model: "YOLOv8-X", color: COMPANY_COLORS.Ultralytics },
  { company: "Ultralytics", date: new Date("2024-09-30"), score: 67, model: "YOLO11-X", color: COMPANY_COLORS.Ultralytics },
  { company: "Ultralytics", date: new Date("2025-02-15"), score: 70, model: "YOLO12-X", color: COMPANY_COLORS.Ultralytics },
  { company: "Ultralytics", date: new Date("2026-03-01"), score: 74, model: "YOLO26-X", color: COMPANY_COLORS.Ultralytics },
  { company: "Megvii", date: new Date("2021-07-18"), score: 42, model: "YOLOX-S", color: COMPANY_COLORS.Megvii },
  { company: "Megvii", date: new Date("2021-10-01"), score: 51, model: "YOLOX-X", color: COMPANY_COLORS.Megvii },
  { company: "Baidu", date: new Date("2023-04-17"), score: 48, model: "RT-DETR-R18", color: COMPANY_COLORS.Baidu },
  { company: "Baidu", date: new Date("2023-07-01"), score: 58, model: "RT-DETR-R50", color: COMPANY_COLORS.Baidu },
  { company: "Baidu", date: new Date("2023-09-01"), score: 60, model: "RT-DETR-R101", color: COMPANY_COLORS.Baidu },
  { company: "Academia Sinica", date: new Date("2024-02-21"), score: 57, model: "YOLOv9-S", color: COMPANY_COLORS["Academia Sinica"] },
  { company: "Academia Sinica", date: new Date("2024-04-01"), score: 62, model: "YOLOv9-C", color: COMPANY_COLORS["Academia Sinica"] },
  { company: "Tsinghua", date: new Date("2024-05-23"), score: 58, model: "YOLOv10-S", color: COMPANY_COLORS.Tsinghua },
  { company: "Tsinghua", date: new Date("2024-07-01"), score: 65, model: "YOLOv10-X", color: COMPANY_COLORS.Tsinghua },
  { company: "Roboflow", date: new Date("2025-02-24"), score: 62, model: "RF-DETR-B", color: COMPANY_COLORS.Roboflow },
  { company: "Roboflow", date: new Date("2025-03-15"), score: 68, model: "RF-DETR-L", color: COMPANY_COLORS.Roboflow },
  { company: "Open Source", date: new Date("2022-07-01"), score: 35, model: "YOLOv7-T", color: COMPANY_COLORS["Open Source"] },
  { company: "Open Source", date: new Date("2023-10-01"), score: 46, model: "Gold-YOLO-M", color: COMPANY_COLORS["Open Source"] },
  { company: "Open Source", date: new Date("2025-01-01"), score: 53, model: "DAMO-YOLO-L", color: COMPANY_COLORS["Open Source"] },
];

export function AccuracyTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    containerRef.current.innerHTML = "";

    const width = containerRef.current.clientWidth;
    const isDark = resolvedTheme === "dark";
    const foreground = isDark ? "#e4e4f0" : "#04090b";
    const gridColor = isDark ? "#2a2a38" : "#e2e8f0";
    const today = new Date();
    const xEnd = new Date(today.getFullYear(), today.getMonth() + 3, 1);
    const companies = Object.keys(COMPANY_COLORS).filter((company) =>
      COMPANY_TIMELINE.some((point) => point.company === company),
    );

    const plot = Plot.plot({
      width,
      height: 400,
      marginLeft: 45,
      marginRight: 16,
      marginBottom: 50,
      marginTop: 10,
      style: {
        background: "transparent",
        color: foreground,
        fontFamily: "var(--font-sans)",
      },
      x: {
        type: "time",
        label: "Release Date",
        domain: [new Date("2020-01-01"), xEnd],
      },
      y: {
        label: "VA v1 Score",
        domain: [0, 78],
        nice: false,
      },
      marks: [
        Plot.gridY({ stroke: gridColor, strokeOpacity: 0.5 }),
        ...companies.map((company) => {
          const points = COMPANY_TIMELINE
            .filter((point) => point.company === company)
            .sort((left, right) => left.date.getTime() - right.date.getTime());
          return Plot.line(points, {
            x: "date",
            y: "score",
            stroke: COMPANY_COLORS[company],
            strokeWidth: 2.5,
            curve: "step-after",
          });
        }),
        Plot.dot(COMPANY_TIMELINE, {
          x: "date",
          y: "score",
          fill: "color",
          stroke: isDark ? "#0a0a0f" : "#ffffff",
          strokeWidth: 1.5,
          r: 4,
          symbol: "square",
          tip: true,
          title: (point: CompanyPoint) =>
            `${point.company}\n${point.model}: VA Score ${point.score}\n${point.date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}`,
        }),
      ],
    });

    containerRef.current.appendChild(plot);

    return () => {
      plot.remove();
    };
  }, [resolvedTheme]);

  return (
    <div className="pt-2">
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 px-1">
        {Object.entries(COMPANY_COLORS).map(([organization, color]) => (
          <div key={organization} className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 flex-shrink-0 rounded-sm" style={{ backgroundColor: color }} />
            <span className="font-medium text-foreground">{organization}</span>
          </div>
        ))}
      </div>
      <div ref={containerRef} style={{ minHeight: 400 }} />
    </div>
  );
}
