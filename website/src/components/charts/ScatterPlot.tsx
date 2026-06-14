"use client";

import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Download } from "lucide-react";
import * as Plot from "@observablehq/plot";
import { BenchmarkResult } from "@/lib/types";
import { getFamilyColor } from "@/lib/utils/colors";
import { computeParetoFrontier } from "@/lib/data/utils";

/** Read a CSS variable from :root / .dark context */
function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

type XMode = "paramsM" | "flopsG" | "latencyMs";

/** Data field backing each x mode */
const X_FIELD: Record<XMode, "paramsM" | "flopsG" | "totalMs"> = {
  paramsM: "paramsM",
  flopsG: "flopsG",
  latencyMs: "totalMs",
};

const X_LABEL: Record<XMode, string> = {
  paramsM: "Parameters (M) →",
  flopsG: "GFLOPs →",
  latencyMs: "Latency (ms, log) →",
};

interface ScatterPlotProps {
  data: BenchmarkResult[];
  showPareto?: boolean;
  height?: number;
  xAxis?: XMode;
  connectFamilies?: boolean;
  /** Caption baked into PNG exports (e.g. "NVIDIA A100 · PyTorch FP32 · COCO val2017") */
  exportCaption?: string;
}

export function ScatterPlot({
  data,
  showPareto = false,
  height = 400,
  xAxis = "paramsM",
  connectFamilies = false,
  exportCaption,
}: ScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [xMode, setXMode] = useState<XMode>(xAxis);
  const xKey = X_FIELD[xMode];
  const isLatency = xMode === "latencyMs";
  // The Pareto frontier is speed/accuracy based — most meaningful on the latency view,
  // so surface it automatically there even if the caller didn't ask for it.
  const showFrontier = showPareto || isLatency;

  const families = useMemo(
    () => Array.from(new Set(data.map((d) => d.family))).sort(),
    [data]
  );

  // Render the current chart + legend + caption + watermark to a PNG download
  const downloadPng = useCallback(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    const isDark = resolvedTheme === "dark";
    const bg = isDark ? "#0a0a0f" : "#ffffff";
    const fg = isDark ? "#e4e4f0" : "#04090b";
    const muted = isDark ? "#7a7a92" : "#64748b";

    const svgWidth = svg.clientWidth || svg.viewBox.baseVal.width;
    const svgHeight = svg.clientHeight || svg.viewBox.baseVal.height;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(svgWidth));
    clone.setAttribute("height", String(svgHeight));
    // CSS variables don't resolve outside the document
    clone.style.fontFamily = "system-ui, sans-serif";

    const scale = 2;
    const footerH = 56; // legend row + caption row
    const canvas = document.createElement("canvas");
    canvas.width = svgWidth * scale;
    canvas.height = (svgHeight + footerH) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, svgWidth, svgHeight + footerH);
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      URL.revokeObjectURL(url);

      // Legend row
      ctx.font = "12px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      let x = 16;
      const legendY = svgHeight + 16;
      for (const family of families) {
        ctx.fillStyle = getFamilyColor(family);
        ctx.beginPath();
        ctx.arc(x + 5, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.fillText(family, x + 15, legendY);
        x += 15 + ctx.measureText(family).width + 18;
      }

      // Caption (left) + watermark (right)
      const captionY = svgHeight + 40;
      ctx.fillStyle = muted;
      if (exportCaption) ctx.fillText(exportCaption, 16, captionY);
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = fg;
      const mark = "visionanalysis.org";
      ctx.fillText(mark, svgWidth - ctx.measureText(mark).width - 16, captionY);

      canvas.toBlob((png) => {
        if (!png) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(png);
        a.download = `vision-analysis-map-vs-${
          xMode === "paramsM" ? "params" : xMode === "flopsG" ? "gflops" : "latency"
        }.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    };
    img.src = url;
  }, [families, resolvedTheme, exportCaption, xMode]);

  const paretoPoints = useMemo(() => computeParetoFrontier(data), [data]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    containerRef.current.innerHTML = "";
    const width = containerRef.current.clientWidth;
    const fgColor = getCssVar("--foreground") || "#04090b";
    const gridColor = getCssVar("--border") || "#e2e8f0";

    // In log (latency) mode, drop any non-positive x so the scale stays valid.
    const plotData = data
      .filter((d) => !isLatency || (d[xKey] as number) > 0)
      .map((d) => ({ ...d, color: getFamilyColor(d.family) }));

    const sortedPareto = [...paretoPoints]
      .filter((d) => !isLatency || (d[xKey] as number) > 0)
      .sort((a, b) => (a[xKey] as number) - (b[xKey] as number));

    const marks: Plot.Markish[] = [];

    // Per-family connecting lines
    if (connectFamilies) {
      const byFamily = new Map<string, typeof plotData>();
      for (const d of plotData) {
        if (!byFamily.has(d.family)) byFamily.set(d.family, []);
        byFamily.get(d.family)!.push(d);
      }
      for (const [family, points] of byFamily) {
        if (points.length < 2) continue;
        const sorted = [...points].sort(
          (a, b) => (a[xKey] as number) - (b[xKey] as number)
        );
        marks.push(
          Plot.line(sorted, {
            x: xKey,
            y: "mAP_50_95",
            stroke: getFamilyColor(family),
            strokeWidth: 2,
            strokeOpacity: 0.6,
            curve: "linear",
          })
        );
      }
    }

    // Pareto frontier line (speed/accuracy)
    if (showFrontier && sortedPareto.length > 1) {
      marks.push(
        Plot.line(sortedPareto, {
          x: xKey,
          y: "mAP_50_95",
          stroke: "#22c55e",
          strokeWidth: 2,
          strokeDasharray: "6,4",
          curve: "linear",
        })
      );
    }

    // Data points
    marks.push(
      Plot.dot(plotData, {
        x: xKey,
        y: "mAP_50_95",
        fill: "color",
        r: 7,
        opacity: 0.85,
        tip: true,
        title: (d: BenchmarkResult & { color: string }) =>
          `${d.model}\nmAP: ${d.mAP_50_95.toFixed(1)}%\nFPS: ${d.throughputFps.toFixed(1)}\nLatency: ${d.totalMs.toFixed(1)}ms\nParams: ${d.paramsM.toFixed(1)}M`,
        href: (d: BenchmarkResult & { color: string }) => `/model/${d.model}`,
      })
    );

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 60,
      marginRight: 20,
      marginBottom: 50,
      marginTop: 20,
      style: {
        background: "transparent",
        color: fgColor,
        fontFamily: "var(--font-sans)",
      },

      marks: [
        Plot.gridX({ stroke: gridColor, strokeOpacity: 0.7 }),
        Plot.gridY({ stroke: gridColor, strokeOpacity: 0.7 }),
        ...marks,
      ],

      x: {
        label: X_LABEL[xMode],
        nice: true,
        ...(isLatency ? { type: "log" as const } : {}),
      },
      y: {
        label: "mAP@50-95 (%)",
        nice: true,
        domain: [
          Math.floor(Math.min(...data.map((d) => d.mAP_50_95)) - 5),
          Math.ceil(Math.max(...data.map((d) => d.mAP_50_95)) + 2),
        ],
      },
    });

    containerRef.current.appendChild(plot);

    // Client-side navigation on clicks
    const links = plot.querySelectorAll("a[href^='/model/']");
    links.forEach((link) => {
      const el = link as HTMLElement;
      el.style.cursor = "pointer";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const href = link.getAttribute("href");
        if (href) router.push(href);
      });
    });

    return () => {
      plot.remove();
    };
  }, [
    data,
    paretoPoints,
    showFrontier,
    height,
    xKey,
    xMode,
    isLatency,
    router,
    resolvedTheme,
    connectFamilies,
  ]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {/* X-axis toggle: Model size ↔ Latency */}
        <div className="inline-flex rounded border border-border overflow-hidden text-xs">
          {(["paramsM", "latencyMs"] as XMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setXMode(mode)}
              className={`px-2.5 py-1 transition-colors ${
                xMode === mode
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={xMode === mode}
            >
              {mode === "paramsM" ? "Model size" : "Latency"}
            </button>
          ))}
        </div>
        <button
          onClick={downloadPng}
          className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Download chart as PNG"
        >
          <Download className="h-3 w-3" />
          PNG
        </button>
      </div>
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
        {families.map((family) => (
            <div key={family} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getFamilyColor(family) }}
              />
              <span className="text-muted-foreground">{family}</span>
            </div>
          ))}
        {showFrontier && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
            <div className="w-6 h-0 border-t-2 border-dashed border-green-500" />
            <span className="text-green-600">Pareto Frontier</span>
          </div>
        )}
      </div>
    </div>
  );
}
