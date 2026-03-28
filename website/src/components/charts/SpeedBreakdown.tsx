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
  const topModels = useMemo(() => {
    return [...data].sort((a, b) => b.throughputFps - a.throughputFps).slice(0, limit);
  }, [data, limit]);

  const maxFps = useMemo(() => {
    return Math.max(...topModels.map((d) => d.throughputFps));
  }, [topModels]);

  return (
    <div className="space-y-3">
      {topModels.map((model) => {
        const hasBreakdown = model.preprocessMs > 0 || model.inferenceMs > 0 || model.postprocessMs > 0;
        const prePercent = hasBreakdown ? (model.preprocessMs / model.totalMs) * 100 : 0;
        const infPercent = hasBreakdown ? (model.inferenceMs / model.totalMs) * 100 : 100;
        const postPercent = hasBreakdown ? (model.postprocessMs / model.totalMs) * 100 : 0;
        const widthPercent = (model.throughputFps / maxFps) * 100;
        const isNmsFree = model.postprocessMs < 0.5;

        return (
          <div key={model.model} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-semibold truncate mr-2 text-foreground">{model.model}</span>
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
                  className="h-7 flex rounded-sm overflow-hidden cursor-help"
                  style={{ width: `${widthPercent}%`, minWidth: "60px" }}
                >
                  {hasBreakdown ? (
                    <>
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
                          backgroundColor: isNmsFree ? "#22c55e" : CHART_COLORS.postprocess,
                        }}
                      />
                    </>
                  ) : (
                    <div
                      className="w-full"
                      style={{ backgroundColor: CHART_COLORS.inference }}
                    />
                  )}
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
                      {isNmsFree && <span className="text-green-500 ml-1">(NMS-free)</span>}
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
      <div className="flex flex-wrap gap-4 text-sm pt-4 border-t border-border mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: CHART_COLORS.preprocess }} />
          <span className="text-muted-foreground">Preprocess</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: CHART_COLORS.inference }} />
          <span className="text-muted-foreground">Inference</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: CHART_COLORS.postprocess }} />
          <span className="text-muted-foreground">Postprocess (NMS)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-green-500" />
          <span className="text-green-600">NMS-free</span>
        </div>
      </div>
    </div>
  );
}
