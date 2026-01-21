"use client";

import { useRef, useEffect, useMemo } from "react";
import * as Plot from "@observablehq/plot";
import { BenchmarkResult } from "@/lib/types";
import { getFamilyColor } from "@/lib/utils/colors";
import { computeParetoFrontier } from "@/lib/data";

interface ScatterPlotProps {
  data: BenchmarkResult[];
  showPareto?: boolean;
  height?: number;
  xAxis?: "throughputFps" | "totalMs";
}

export function ScatterPlot({
  data,
  showPareto = true,
  height = 400,
  xAxis = "throughputFps",
}: ScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const paretoPoints = useMemo(() => {
    if (!showPareto) return [];
    return computeParetoFrontier(data);
  }, [data, showPareto]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Clear previous plot
    containerRef.current.innerHTML = "";

    // Get container width
    const width = containerRef.current.clientWidth;

    // Prepare data for plotting
    const plotData = data.map((d) => ({
      ...d,
      color: getFamilyColor(d.family),
    }));

    // Sort pareto points for proper line connection
    const sortedPareto = [...paretoPoints].sort(
      (a, b) => b.throughputFps - a.throughputFps
    );

    // Build marks array
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
        r: 6,
        opacity: 0.85,
        tip: true,
        title: (d: BenchmarkResult & { color: string }) =>
          `${d.model}\nmAP: ${d.mAP_50_95.toFixed(1)}%\nFPS: ${d.throughputFps.toFixed(1)}\nLatency: ${d.totalMs.toFixed(1)}ms\nParams: ${d.paramsM.toFixed(1)}M`,
      })
    );

    // Labels for Pareto-optimal models
    if (showPareto) {
      marks.push(
        Plot.text(paretoPoints, {
          x: xAxis,
          y: "mAP_50_95",
          text: "model",
          dy: -12,
          fontSize: 10,
          fill: "currentColor",
        })
      );
    }

    const plot = Plot.plot({
      width,
      height,
      marginLeft: 60,
      marginRight: 20,
      marginBottom: 50,
      marginTop: 20,

      x: {
        label: xAxis === "throughputFps" ? "Throughput (FPS) →" : "← Latency (ms)",
        grid: true,
        nice: true,
      },
      y: {
        label: "↑ mAP@50-95 (%)",
        grid: true,
        nice: true,
        domain: [
          Math.floor(Math.min(...data.map((d) => d.mAP_50_95)) - 5),
          Math.ceil(Math.max(...data.map((d) => d.mAP_50_95)) + 2),
        ],
      },

      marks,
    });

    containerRef.current.appendChild(plot);

    // Cleanup
    return () => {
      plot.remove();
    };
  }, [data, paretoPoints, showPareto, height, xAxis]);

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
              <span>{family}</span>
            </div>
          ))}
        {showPareto && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l">
            <div className="w-6 h-0 border-t-2 border-dashed border-green-500" />
            <span className="text-green-600 dark:text-green-400">
              Pareto Frontier
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
