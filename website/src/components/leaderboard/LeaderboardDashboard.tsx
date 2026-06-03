"use client";

import { useState, useMemo } from "react";
import { BenchmarkResult } from "@/lib/types";
import { filterByFamilies } from "@/lib/data/utils";
import { LeaderboardTable } from "./LeaderboardTable";
import { FilterBar } from "./FilterBar";
import { ScatterPlot } from "@/components/charts";

interface LeaderboardDashboardProps {
  benchmarkData: Record<string, BenchmarkResult[]>;
  hardwareOptions: Array<{ value: string; label: string }>;
}

function getDefaultSelection(
  benchmarkData: Record<string, BenchmarkResult[]>,
  hardwareOptions: Array<{ value: string; label: string }>
): { hardware: string; runtime: string } {
  const fallbackHardware = hardwareOptions[0]?.value ?? "a100";
  const fallbackRuntime =
    Object.keys(benchmarkData)
      .find((key) => key.startsWith(`${fallbackHardware}__`))
      ?.split("__")[1] ?? "pytorch_fp32";

  const hardwareOrder = new Map(
    hardwareOptions.map((option, index) => [option.value, index])
  );
  const byHardware = new Map<
    string,
    {
      models: Set<string>;
      resultCount: number;
      runtimes: Map<string, { models: Set<string>; resultCount: number }>;
    }
  >();

  for (const [key, results] of Object.entries(benchmarkData)) {
    const [hardware, runtime] = key.split("__");
    if (!hardware || !runtime) continue;

    const hardwareStats =
      byHardware.get(hardware) ??
      { models: new Set<string>(), resultCount: 0, runtimes: new Map() };
    const runtimeStats =
      hardwareStats.runtimes.get(runtime) ??
      { models: new Set<string>(), resultCount: 0 };

    for (const result of results) {
      hardwareStats.models.add(result.model);
      runtimeStats.models.add(result.model);
    }
    hardwareStats.resultCount += results.length;
    runtimeStats.resultCount += results.length;

    hardwareStats.runtimes.set(runtime, runtimeStats);
    byHardware.set(hardware, hardwareStats);
  }

  let bestHardware = fallbackHardware;
  let bestModelCount = -1;
  let bestResultCount = -1;
  let bestOrder = Number.MAX_SAFE_INTEGER;

  for (const [hardware, stats] of byHardware) {
    const order = hardwareOrder.get(hardware) ?? Number.MAX_SAFE_INTEGER;
    const modelCount = stats.models.size;
    if (
      modelCount > bestModelCount ||
      (modelCount === bestModelCount && stats.resultCount > bestResultCount) ||
      (modelCount === bestModelCount &&
        stats.resultCount === bestResultCount &&
        order < bestOrder)
    ) {
      bestHardware = hardware;
      bestModelCount = modelCount;
      bestResultCount = stats.resultCount;
      bestOrder = order;
    }
  }

  const runtimes = byHardware.get(bestHardware)?.runtimes;
  if (!runtimes) {
    return { hardware: fallbackHardware, runtime: fallbackRuntime };
  }

  let bestRuntime = fallbackRuntime;
  let bestRuntimeModelCount = -1;
  let bestRuntimeResultCount = -1;
  for (const [runtime, stats] of runtimes) {
    const modelCount = stats.models.size;
    if (
      modelCount > bestRuntimeModelCount ||
      (modelCount === bestRuntimeModelCount &&
        stats.resultCount > bestRuntimeResultCount)
    ) {
      bestRuntime = runtime;
      bestRuntimeModelCount = modelCount;
      bestRuntimeResultCount = stats.resultCount;
    }
  }

  return { hardware: bestHardware, runtime: bestRuntime };
}

export function LeaderboardDashboard({
  benchmarkData,
  hardwareOptions,
}: LeaderboardDashboardProps) {
  const defaultSelection = getDefaultSelection(benchmarkData, hardwareOptions);
  const [hardware, setHardware] = useState(defaultSelection.hardware);
  const [runtime, setRuntime] = useState(defaultSelection.runtime);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [paretoLine, setParetoLine] = useState(true);

  // Get available runtimes for the selected hardware
  const runtimeOptions = useMemo(() => {
    return Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${hardware}__`))
      .map((key) => {
        const rt = key.split("__")[1];
        return { value: rt, label: rt.replace("_", " ").toUpperCase() };
      });
  }, [benchmarkData, hardware]);

  const hardwareLabel = useMemo(
    () => hardwareOptions.find((o) => o.value === hardware)?.label ?? hardware,
    [hardwareOptions, hardware]
  );
  const runtimeLabel = useMemo(
    () => runtimeOptions.find((o) => o.value === runtime)?.label ?? runtime,
    [runtimeOptions, runtime]
  );

  // Get data for selected hardware + runtime
  const allResults = useMemo(() => {
    const key = `${hardware}__${runtime}`;
    return benchmarkData[key] || [];
  }, [benchmarkData, hardware, runtime]);

  const availableFamilies = useMemo(() => {
    return Array.from(new Set(allResults.map((result) => result.family))).sort();
  }, [allResults]);

  const visibleSelectedFamilies = useMemo(() => {
    const available = new Set(availableFamilies);
    return selectedFamilies.filter((family) => available.has(family));
  }, [availableFamilies, selectedFamilies]);

  const hasHiddenFamilySelections = selectedFamilies.length !== visibleSelectedFamilies.length;

  // Filter by selected families
  const filteredResults = useMemo(() => {
    return filterByFamilies(allResults, visibleSelectedFamilies);
  }, [allResults, visibleSelectedFamilies]);

  const handleFamilyToggle = (family: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(family)
        ? prev.filter((f) => f !== family)
        : [...prev, family]
    );
  };

  const handleHardwareChange = (newHardware: string) => {
    setHardware(newHardware);
    const availableRuntimes = Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${newHardware}__`))
      .map((key) => key.split("__")[1]);
    if (availableRuntimes.length > 0 && !availableRuntimes.includes(runtime)) {
      setRuntime(availableRuntimes[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section: Accuracy */}
      <div className="section-group">
        <div className="section-group-header">
          <h2>Accuracy</h2>
          <p className="text-base text-foreground">
            mAP@50-95 scores on COCO val2017 - the standard benchmark for object detection accuracy.
          </p>
        </div>
        <div className="section-group-content">
          {/* Filters inside this section */}
          <FilterBar
            hardware={hardware}
            onHardwareChange={handleHardwareChange}
            runtime={runtime}
            onRuntimeChange={setRuntime}
            selectedFamilies={visibleSelectedFamilies}
            onFamilyToggle={handleFamilyToggle}
            resultCount={filteredResults.length}
            hardwareOptions={hardwareOptions}
            runtimeOptions={runtimeOptions}
            families={availableFamilies}
            paretoLine={paretoLine}
            onParetoLineChange={setParetoLine}
          />

          {/* Scatter Chart Card */}
          <div className="chart-card mt-4">
            <div className="chart-card-header">
              <h3>Accuracy vs Model Size</h3>
              <p className="chart-card-subtitle">
                mAP@50-95 on COCO val2017 plotted against parameter count. Higher and left is better.
              </p>
            </div>
            <div className="p-4">
              <ScatterPlot
                data={filteredResults}
                showPareto={false}
                height={420}
                connectFamilies={paretoLine}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Full Leaderboard */}
      <div className="section-group">
        <div className="section-group-header">
          <h2>Leaderboard</h2>
          <p className="text-base text-foreground">
            Full ranking of all benchmarked models on{" "}
            <span className="font-medium text-foreground">{hardwareLabel}</span>{" "}
            ({runtimeLabel}). Speed numbers reflect this hardware — switch hardware in the filter above to compare. Click column headers to sort.
          </p>
        </div>
        <div className="section-group-content">
          <LeaderboardTable
            data={filteredResults}
            familyFilter={hasHiddenFamilySelections ? visibleSelectedFamilies : selectedFamilies}
          />
        </div>
      </div>
    </div>
  );
}
