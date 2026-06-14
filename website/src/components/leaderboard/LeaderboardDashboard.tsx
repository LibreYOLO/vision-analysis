"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { BenchmarkResult, SortKey, SortOrder } from "@/lib/types";
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

const DEFAULT_SORT_KEY: SortKey | "model" = "mAP_50_95";
const VALID_SORT_KEYS = new Set<string>([
  "model",
  "mAP_50_95",
  "mAP_50",
  "throughputFps",
  "totalMs",
  "paramsM",
  "flopsG",
  "mAPPerGflop",
  "mAPPerMParams",
]);

function leaderboardCandidateScore(result: BenchmarkResult): number[] {
  const isFullVal = result.datasetVariant === "full";
  const isBatchOne = result.batchSize === 1;
  return [
    isFullVal && isBatchOne ? 0 : 1,
    isFullVal ? 0 : 1,
    isBatchOne ? 0 : 1,
    result.numImages > 0 ? -result.numImages : 0,
    result.inputSize,
    Number.isFinite(Date.parse(result.timestamp)) ? -Date.parse(result.timestamp) : 0,
  ];
}

function compareLeaderboardCandidates(
  a: BenchmarkResult,
  b: BenchmarkResult
): number {
  const aScore = leaderboardCandidateScore(a);
  const bScore = leaderboardCandidateScore(b);
  for (let i = 0; i < aScore.length; i += 1) {
    const diff = aScore[i] - bScore[i];
    if (diff !== 0) return diff;
  }
  return a.model.localeCompare(b.model);
}

function selectLeaderboardCoordinates(results: BenchmarkResult[]): BenchmarkResult[] {
  const byModel = new Map<string, BenchmarkResult>();
  for (const result of results) {
    const existing = byModel.get(result.model);
    if (!existing || compareLeaderboardCandidates(result, existing) < 0) {
      byModel.set(result.model, result);
    }
  }
  return Array.from(byModel.values());
}

export function LeaderboardDashboard({
  benchmarkData,
  hardwareOptions,
}: LeaderboardDashboardProps) {
  const searchParams = useSearchParams();
  const defaultSelection = getDefaultSelection(benchmarkData, hardwareOptions);

  // Initial state comes from the URL so filtered views are shareable
  const hwParam = searchParams.get("hw");
  const initialHardware =
    hwParam && hardwareOptions.some((o) => o.value === hwParam)
      ? hwParam
      : defaultSelection.hardware;
  const rtParam = searchParams.get("rt");
  const initialRuntime =
    rtParam && benchmarkData[`${initialHardware}__${rtParam}`]
      ? rtParam
      : benchmarkData[`${initialHardware}__${defaultSelection.runtime}`]
        ? defaultSelection.runtime
        : Object.keys(benchmarkData)
            .find((key) => key.startsWith(`${initialHardware}__`))
            ?.split("__")[1] ?? defaultSelection.runtime;
  const sortParam = searchParams.get("sort");
  const initialSortKey = (
    sortParam && VALID_SORT_KEYS.has(sortParam) ? sortParam : DEFAULT_SORT_KEY
  ) as SortKey | "model";
  const initialSortOrder: SortOrder =
    searchParams.get("order") === "asc" ? "asc" : "desc";

  const [hardware, setHardware] = useState(initialHardware);
  const [runtime, setRuntime] = useState(initialRuntime);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>(
    () => searchParams.get("families")?.split(",").filter(Boolean) ?? []
  );
  const [paretoLine, setParetoLine] = useState(searchParams.get("pareto") !== "0");
  const [sortKey, setSortKey] = useState<SortKey | "model">(initialSortKey);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  // Mirror filter state into the URL (shallow, no navigation) so the
  // current view can be shared. Default values are omitted to keep URLs clean.
  const syncUrl = (next: {
    hardware?: string;
    runtime?: string;
    families?: string[];
    pareto?: boolean;
    sort?: SortKey | "model";
    order?: SortOrder;
  }) => {
    const state = {
      hardware,
      runtime,
      families: selectedFamilies,
      pareto: paretoLine,
      sort: sortKey,
      order: sortOrder,
      ...next,
    };
    const params = new URLSearchParams();
    if (state.hardware !== defaultSelection.hardware) {
      params.set("hw", state.hardware);
    }
    if (
      state.hardware !== defaultSelection.hardware ||
      state.runtime !== defaultSelection.runtime
    ) {
      params.set("rt", state.runtime);
    }
    if (state.families.length > 0) params.set("families", state.families.join(","));
    if (!state.pareto) params.set("pareto", "0");
    if (state.sort !== DEFAULT_SORT_KEY) {
      params.set("sort", state.sort);
      params.set("order", state.order);
    } else if (state.order !== "desc") {
      params.set("order", state.order);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

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

  const leaderboardResults = useMemo(() => {
    // Step 1 can load multiple performance coordinates per model. Until Step 3
    // adds explicit batch/subset/input controls, keep this view one row per
    // model and prefer the canonical full-val batch=1 coordinate when present.
    return selectLeaderboardCoordinates(allResults);
  }, [allResults]);

  const availableFamilies = useMemo(() => {
    return Array.from(new Set(leaderboardResults.map((result) => result.family))).sort();
  }, [leaderboardResults]);

  const visibleSelectedFamilies = useMemo(() => {
    const available = new Set(availableFamilies);
    return selectedFamilies.filter((family) => available.has(family));
  }, [availableFamilies, selectedFamilies]);

  const hasHiddenFamilySelections = selectedFamilies.length !== visibleSelectedFamilies.length;

  // Filter by selected families
  const filteredResults = useMemo(() => {
    return filterByFamilies(leaderboardResults, visibleSelectedFamilies);
  }, [leaderboardResults, visibleSelectedFamilies]);

  const handleFamilyToggle = (family: string) => {
    const next = selectedFamilies.includes(family)
      ? selectedFamilies.filter((f) => f !== family)
      : [...selectedFamilies, family];
    setSelectedFamilies(next);
    syncUrl({ families: next });
  };

  const handleHardwareChange = (newHardware: string) => {
    setHardware(newHardware);
    const availableRuntimes = Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${newHardware}__`))
      .map((key) => key.split("__")[1]);
    let newRuntime = runtime;
    if (availableRuntimes.length > 0 && !availableRuntimes.includes(runtime)) {
      newRuntime = availableRuntimes[0];
      setRuntime(newRuntime);
    }
    syncUrl({ hardware: newHardware, runtime: newRuntime });
  };

  const handleRuntimeChange = (newRuntime: string) => {
    setRuntime(newRuntime);
    syncUrl({ runtime: newRuntime });
  };

  const handleParetoChange = (value: boolean) => {
    setParetoLine(value);
    syncUrl({ pareto: value });
  };

  const handleSortChange = (key: SortKey | "model", order: SortOrder) => {
    setSortKey(key);
    setSortOrder(order);
    syncUrl({ sort: key, order });
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
            onRuntimeChange={handleRuntimeChange}
            selectedFamilies={visibleSelectedFamilies}
            onFamilyToggle={handleFamilyToggle}
            resultCount={filteredResults.length}
            hardwareOptions={hardwareOptions}
            runtimeOptions={runtimeOptions}
            families={availableFamilies}
            paretoLine={paretoLine}
            onParetoLineChange={handleParetoChange}
          />

          {/* Scatter Chart Card */}
          <div className="chart-card mt-4">
            <div className="chart-card-header">
              <h3>Accuracy Tradeoffs</h3>
              <p className="chart-card-subtitle">
                mAP@50-95 on COCO val2017 vs <strong>model size</strong> or <strong>latency</strong> — toggle the x-axis. Higher and left is better; the Pareto frontier marks the best speed/accuracy tradeoffs.
              </p>
            </div>
            <div className="p-4">
              <ScatterPlot
                data={filteredResults}
                showPareto={false}
                height={420}
                connectFamilies={paretoLine}
                exportCaption={`${hardwareLabel} | ${runtimeLabel} | COCO val2017 | mAP@50-95 vs Params`}
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
            initialSortKey={sortKey}
            initialSortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        </div>
      </div>
    </div>
  );
}
