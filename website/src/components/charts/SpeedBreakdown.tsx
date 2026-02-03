"use client";

import { useMemo } from "react";
import { BenchmarkResult } from "@/lib/types";
import { CHART_COLORS } from "@/lib/utils/colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SpeedBreakdownProps {
  data: BenchmarkResult[];
  limit?: number;
}

export function SpeedBreakdown({ data, limit = 15 }: SpeedBreakdownProps) {
  // Sort by total time (fastest first), take top N
  const topModels = useMemo(() => {
    return [...data].sort((a, b) => a.totalMs - b.totalMs).slice(0, limit);
  }, [data, limit]);

  const maxTime = useMemo(() => {
    return Math.max(...topModels.map((d) => d.totalMs));
  }, [topModels]);

  return (
    <div className="space-y-3">
      {topModels.map((model) => {
        const prePercent = (model.preprocessMs / model.totalMs) * 100;
        const infPercent = (model.inferenceMs / model.totalMs) * 100;
        const postPercent = (model.postprocessMs / model.totalMs) * 100;
        const widthPercent = (model.totalMs / maxTime) * 100;

        // Check if this model has minimal postprocessing (NMS-free or optimized)
        const isNmsFree = model.postprocessMs < 0.5;

        return (
          <div key={model.model} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate mr-2">{model.model}</span>
              <span className="text-muted-foreground font-mono whitespace-nowrap">
                {model.totalMs.toFixed(1)}ms
                <span className="text-xs ml-1">
                  ({model.throughputFps.toFixed(0)} FPS)
                </span>
              </span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="h-6 flex rounded overflow-hidden cursor-help"
                  style={{ width: `${widthPercent}%`, minWidth: "60px" }}
                >
                  <div
                    className="transition-all"
                    style={{
                      width: `${prePercent}%`,
                      backgroundColor: CHART_COLORS.preprocess,
                    }}
                  />
                  <div
                    className="transition-all"
                    style={{
                      width: `${infPercent}%`,
                      backgroundColor: CHART_COLORS.inference,
                    }}
                  />
                  <div
                    className="transition-all"
                    style={{
                      width: `${postPercent}%`,
                      backgroundColor: isNmsFree
                        ? "#22c55e" // Green for NMS-free
                        : CHART_COLORS.postprocess,
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span>Preprocess:</span>
                    <span>{model.preprocessMs.toFixed(1)}ms</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Inference:</span>
                    <span>{model.inferenceMs.toFixed(1)}ms</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Postprocess:</span>
                    <span>
                      {model.postprocessMs.toFixed(1)}ms
                      {isNmsFree && (
                        <span className="text-green-500 ml-1">(NMS-free)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold">{model.totalMs.toFixed(1)}ms</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm pt-4 border-t mt-4">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: CHART_COLORS.preprocess }}
          />
          <span>Preprocess</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: CHART_COLORS.inference }}
          />
          <span>Inference</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: CHART_COLORS.postprocess }}
          />
          <span>Postprocess (NMS)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-green-600 dark:text-green-400">NMS-free</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Some models use NMS-free detection or optimized postprocessing, resulting
        in faster end-to-end latency. Green bars indicate minimal postprocess time.
      </p>
    </div>
  );
}
