"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeploymentControlsProps {
  hardware: string;
  onHardwareChange: (value: string) => void;
  runtime: string;
  onRuntimeChange: (value: string) => void;
  hardwareOptions: Array<{ value: string; label: string }>;
  runtimeOptions: Array<{ value: string; label: string }>;
  hardwareLabel: string;
  runtimeLabel: string;
  paretoLine: boolean;
  onParetoLineChange: (value: boolean) => void;
  logScale: boolean;
  onLogScaleChange: (value: boolean) => void;
}

/**
 * Controls scoped to the hardware-SPECIFIC view (latency chart + leaderboard
 * table). Latency, FPS and the Pareto frontier all depend on the chosen
 * hardware + runtime, so these selectors live next to that chart, not next to
 * the architecture (params) chart, whose numbers never change with hardware.
 */
export function DeploymentControls({
  hardware,
  onHardwareChange,
  runtime,
  onRuntimeChange,
  hardwareOptions,
  runtimeOptions,
  hardwareLabel,
  runtimeLabel,
  paretoLine,
  onParetoLineChange,
  logScale,
  onLogScaleChange,
}: DeploymentControlsProps) {
  return (
    <div className="bg-card rounded-md p-3 border border-border">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Hardware Selector */}
          <label className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hardware</span>
            <Select value={hardware} onValueChange={onHardwareChange}>
              <SelectTrigger className="w-[180px] h-9 text-sm border-border bg-card">
                <SelectValue placeholder="Hardware" />
              </SelectTrigger>
              <SelectContent>
                {hardwareOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {/* Runtime / format Selector */}
          <label className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Format</span>
            <Select value={runtime} onValueChange={onRuntimeChange}>
              <SelectTrigger className="w-[170px] h-9 text-sm border-border bg-card">
                <SelectValue placeholder="Runtime" />
              </SelectTrigger>
              <SelectContent>
                {runtimeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {/* Pareto frontier toggle */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none h-9 px-2">
            <input
              type="checkbox"
              checked={paretoLine}
              onChange={(e) => onParetoLineChange(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-foreground cursor-pointer"
            />
            Pareto frontier
          </label>

          {/* Log x-scale toggle (off by default) */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none h-9 px-2">
            <input
              type="checkbox"
              checked={logScale}
              onChange={(e) => onLogScaleChange(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-foreground cursor-pointer"
            />
            Log scale
          </label>
        </div>

        {/* Active deployment summary: makes the hardware-specific scope explicit */}
        <div className="text-xs text-muted-foreground whitespace-nowrap rounded-full border border-border px-3 py-1">
          showing{" "}
          <span className="font-medium text-foreground">{hardwareLabel}</span>
          {" · "}
          <span className="font-medium text-foreground">{runtimeLabel}</span>
        </div>
      </div>
    </div>
  );
}
