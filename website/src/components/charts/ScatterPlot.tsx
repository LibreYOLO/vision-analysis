"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
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
  paramsM: "Parameters (M)",
  flopsG: "GFLOPs",
  latencyMs: "Latency (ms)",
};

interface ScatterPlotProps {
  data: BenchmarkResult[];
  /** Which metric the x-axis encodes. Fixed per chart (no in-chart toggle). */
  xAxis?: XMode;
  /** Draw the green dashed speed/accuracy Pareto frontier. */
  showPareto?: boolean;
  /** Encode parameter count as bubble radius (used on the latency chart). */
  sizeByParams?: boolean;
  height?: number;
  connectFamilies?: boolean;
  /** Caption baked into PNG exports (e.g. "NVIDIA A100 · PyTorch FP32 · COCO val2017") */
  exportCaption?: string;
  /** Shown centered when there is no data for the current selection. */
  emptyMessage?: string;
  /** Use a log x-scale (only meaningful for the latency axis). */
  logScale?: boolean;
  /** Render the built-in PNG button. When false, expose the download via onDownloadReady. */
  showToolbar?: boolean;
  /** Hands the PNG download function to a parent so it can trigger it from elsewhere. */
  onDownloadReady?: (download: () => void) => void;
}

export function ScatterPlot({
  data,
  xAxis = "paramsM",
  showPareto = false,
  sizeByParams = false,
  height = 400,
  connectFamilies = false,
  exportCaption,
  emptyMessage = "No results for this hardware + runtime yet.",
  logScale = false,
  showToolbar = true,
  onDownloadReady,
}: ScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const xMode = xAxis;
  const xKey = X_FIELD[xMode];
  const isLatency = xMode === "latencyMs";
  const useLog = isLatency && logScale;
  const xLabel = isLatency
    ? logScale
      ? "Latency (ms, log)"
      : "Latency (ms)"
    : X_LABEL[xMode];
  const showFrontier = showPareto;

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

  // Expose the PNG download to a parent (used when showToolbar is false).
  useEffect(() => {
    onDownloadReady?.(downloadPng);
  }, [onDownloadReady, downloadPng]);

  const paretoPoints = useMemo(() => computeParetoFrontier(data), [data]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    // Empty / no-data state: some hardware+runtime combos have no results yet.
    if (data.length === 0) {
      const isDark = resolvedTheme === "dark";
      const el = document.createElement("div");
      el.textContent = emptyMessage;
      el.style.cssText = `display:flex;align-items:center;justify-content:center;height:${height}px;color:${
        isDark ? "#7a7a92" : "#64748b"
      };font-size:14px;text-align:center;padding:0 24px;`;
      containerRef.current.appendChild(el);
      return;
    }

    const width = containerRef.current.clientWidth;
    const fgColor = getCssVar("--foreground") || "#04090b";
    const gridColor = getCssVar("--border") || "#e2e8f0";
    const isDark = resolvedTheme === "dark";
    const dotStroke = isDark ? "#0a0a0f" : "#ffffff";

    // In log (latency) mode, drop any non-positive x so the scale stays valid.
    const plotData = data
      .filter((d) => !useLog || (d[xKey] as number) > 0)
      .map((d) => ({ ...d, color: getFamilyColor(d.family) }));

    const sortedPareto = [...paretoPoints]
      .filter((d) => !useLog || (d[xKey] as number) > 0)
      .sort((a, b) => (a[xKey] as number) - (b[xKey] as number));

    const marks: Plot.Markish[] = [];

    // Per-family connecting lines (on the params chart this traces each
    // family's size ladder, from the smallest variant to the largest).
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
        r: sizeByParams ? "paramsM" : 7,
        ...(sizeByParams ? { stroke: dotStroke, strokeWidth: 1 } : {}),
        opacity: sizeByParams ? 0.78 : 0.85,
        tip: true,
        title: (d: BenchmarkResult & { color: string }) =>
          isLatency
            ? `${d.model}\nmAP: ${d.mAP_50_95.toFixed(1)}%\nLatency: ${d.totalMs.toFixed(1)} ms\nFPS: ${d.throughputFps.toFixed(1)}\nParams: ${d.paramsM.toFixed(1)}M`
            : `${d.model}\nmAP: ${d.mAP_50_95.toFixed(1)}%\nParams: ${d.paramsM.toFixed(1)}M\nGFLOPs: ${d.flopsG.toFixed(1)}`,
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

      ...(sizeByParams ? { r: { range: [4, 16] as [number, number] } } : {}),

      marks: [
        Plot.gridX({ stroke: gridColor, strokeOpacity: 0.7 }),
        Plot.gridY({ stroke: gridColor, strokeOpacity: 0.7 }),
        ...marks,
      ],

      x: {
        label: xLabel,
        nice: true,
        ...(useLog ? { type: "log" as const } : {}),
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
    sizeByParams,
    height,
    xKey,
    xMode,
    isLatency,
    emptyMessage,
    router,
    resolvedTheme,
    connectFamilies,
    useLog,
    xLabel,
  ]);

  return (
    <div className="w-full">
      {showToolbar && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={downloadPng}
            className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Download chart as PNG"
          >
            <Download className="h-3 w-3" />
            PNG
          </button>
        </div>
      )}
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
        {sizeByParams && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50" />
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-muted-foreground/50" />
            <span>bubble size = params</span>
          </div>
        )}
      </div>
    </div>
  );
}
