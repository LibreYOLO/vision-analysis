"use client";

import { useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as Plot from "@observablehq/plot";
import { BenchmarkResult } from "@/lib/types";
import { getFamilyColor } from "@/lib/utils/colors";
import { computeParetoFrontier } from "@/lib/data/utils";

/** Read a CSS variable from :root / .dark context */
function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface ScatterPlotProps {
  data: BenchmarkResult[];
  showPareto?: boolean;
  height?: number;
  xAxis?: "paramsM" | "flopsG";
}

export function ScatterPlot({
  data,
  showPareto = true,
  height = 400,
  xAxis = "paramsM",
}: ScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const paretoPoints = useMemo(() => {
    if (!showPareto) return [];
    return computeParetoFrontier(data);
  }, [data, showPareto]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    containerRef.current.innerHTML = "";
    const width = containerRef.current.clientWidth;
    const fgColor = getCssVar("--foreground") || "#04090b";
    const gridColor = getCssVar("--border") || "#e2e8f0";

    const plotData = data.map((d) => ({
      ...d,
      color: getFamilyColor(d.family),
    }));

    const sortedPareto = [...paretoPoints].sort(
      (a, b) => a.paramsM - b.paramsM
    );

    const marks: Plot.Markish[] = [];

    // Pareto frontier line
    if (showPareto && sortedPareto.length > 1) {
      marks.push(
        Plot.line(sortedPareto, {
          x: xAxis,
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
        x: xAxis,
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

    // Labels
    marks.push(
      Plot.text(plotData, {
        x: xAxis,
        y: "mAP_50_95",
        text: "model",
        dy: -14,
        fontSize: 11,
        fill: fgColor,
        fontWeight: 500,
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
        label: xAxis === "paramsM" ? "Parameters (M) →" : "GFLOPs →",
        nice: true,
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
  }, [data, paretoPoints, showPareto, height, xAxis, router, resolvedTheme]);

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
        {Array.from(new Set(data.map((d) => d.family)))
          .sort()
          .map((family) => (
            <div key={family} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getFamilyColor(family) }}
              />
              <span className="text-muted-foreground">{family}</span>
            </div>
          ))}
        {showPareto && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
            <div className="w-6 h-0 border-t-2 border-dashed border-green-500" />
            <span className="text-green-600">Pareto Frontier</span>
          </div>
        )}
      </div>
    </div>
  );
}
