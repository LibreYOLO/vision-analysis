"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { BenchmarkResult, SortKey, SortOrder } from "@/lib/types";
import { filterByFamilies } from "@/lib/data/utils";
import { LeaderboardTable } from "./LeaderboardTable";
import { FamilyFilter } from "./FamilyFilter";
import { DeploymentControls } from "./DeploymentControls";
import { ScatterPlot, ChartDataTable, CopyForLlm } from "@/components/charts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LIBREYOLO } from "@/config/libreyolo";

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

/**
 * Accuracy and parameter count are properties of the architecture + precision,
 * NOT of the GPU or runtime. The architecture-efficiency chart therefore picks
 * one canonical coordinate per model across ALL hardware/runtimes, preferring
 * the full-precision (fp32 > fp16 > int8) full-val batch=1 measurement so the
 * accuracy shown is the reference number, not a quantized one.
 */
function architectureCandidateScore(result: BenchmarkResult): number[] {
  const precision = result.precision.toLowerCase();
  const isFp32 =
    precision.includes("fp32") || precision.includes("float32");
  const isFp16 =
    precision.includes("fp16") ||
    precision.includes("float16") ||
    precision.includes("half") ||
    precision.includes("bf16");
  const precisionRank = isFp32 ? 0 : isFp16 ? 1 : 2;
  const isFullVal = result.datasetVariant === "full";
  const isBatchOne = result.batchSize === 1;
  return [
    precisionRank,
    isFullVal ? 0 : 1,
    isBatchOne ? 0 : 1,
    result.numImages > 0 ? -result.numImages : 0,
    result.inputSize,
    Number.isFinite(Date.parse(result.timestamp)) ? -Date.parse(result.timestamp) : 0,
  ];
}

function compareArchitectureCandidates(
  a: BenchmarkResult,
  b: BenchmarkResult
): number {
  const aScore = architectureCandidateScore(a);
  const bScore = architectureCandidateScore(b);
  for (let i = 0; i < aScore.length; i += 1) {
    const diff = aScore[i] - bScore[i];
    if (diff !== 0) return diff;
  }
  return a.model.localeCompare(b.model);
}

function selectArchitectureCoordinates(
  benchmarkData: Record<string, BenchmarkResult[]>
): BenchmarkResult[] {
  const byModel = new Map<string, BenchmarkResult>();
  for (const results of Object.values(benchmarkData)) {
    for (const result of results) {
      const existing = byModel.get(result.model);
      if (!existing || compareArchitectureCandidates(result, existing) < 0) {
        byModel.set(result.model, result);
      }
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
  // X-axis for the hardware-independent chart: parameter count or compute (GFLOPs).
  const [archXAxis, setArchXAxis] = useState<"paramsM" | "flopsG">("paramsM");
  // Deployment chart: linear x by default; users can hide individual models.
  const [logScale, setLogScale] = useState(false);
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(() => new Set());
  // Lets the first chart's bottom PNG button trigger the ScatterPlot's own export.
  const archDownloadRef = useRef<(() => void) | null>(null);
  const registerArchDownload = useCallback((fn: () => void) => {
    archDownloadRef.current = fn;
  }, []);
  // The leaderboard table picks its own hardware/backend, independent of the chart.
  const [tableHardware, setTableHardware] = useState(initialHardware);
  const [tableRuntime, setTableRuntime] = useState(initialRuntime);

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

  // Hardware-independent view: one canonical (accuracy, params) per model across
  // ALL hardware/runtimes. Drives the architecture-efficiency chart, which must
  // not change when the hardware/runtime selectors below change.
  const architectureResults = useMemo(
    () => selectArchitectureCoordinates(benchmarkData),
    [benchmarkData]
  );

  // Family chips are shared by both charts, so derive the list from the full
  // (architecture) model set rather than the hardware-specific subset.
  const availableFamilies = useMemo(() => {
    return Array.from(new Set(architectureResults.map((result) => result.family))).sort();
  }, [architectureResults]);

  const visibleSelectedFamilies = useMemo(() => {
    const available = new Set(availableFamilies);
    return selectedFamilies.filter((family) => available.has(family));
  }, [availableFamilies, selectedFamilies]);

  const hasHiddenFamilySelections = selectedFamilies.length !== visibleSelectedFamilies.length;

  // Filter by selected families (hardware-specific: latency chart + table)
  const filteredResults = useMemo(() => {
    return filterByFamilies(leaderboardResults, visibleSelectedFamilies);
  }, [leaderboardResults, visibleSelectedFamilies]);

  // Deployment chart respects per-model deselection (chart 2 only; table keeps all).
  const deployedResults = useMemo(
    () => filteredResults.filter((r) => !hiddenModels.has(r.model)),
    [filteredResults, hiddenModels]
  );

  // Leaderboard table: its own hardware/backend selection, independent of the chart.
  const tableRuntimeOptions = useMemo(() => {
    return Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${tableHardware}__`))
      .map((key) => {
        const rt = key.split("__")[1];
        return { value: rt, label: rt.replace("_", " ").toUpperCase() };
      });
  }, [benchmarkData, tableHardware]);

  const tableHardwareLabel = useMemo(
    () => hardwareOptions.find((o) => o.value === tableHardware)?.label ?? tableHardware,
    [hardwareOptions, tableHardware]
  );
  const tableRuntimeLabel = useMemo(
    () => tableRuntimeOptions.find((o) => o.value === tableRuntime)?.label ?? tableRuntime,
    [tableRuntimeOptions, tableRuntime]
  );

  const tableFilteredResults = useMemo(() => {
    const rows = selectLeaderboardCoordinates(
      benchmarkData[`${tableHardware}__${tableRuntime}`] || []
    );
    return filterByFamilies(rows, visibleSelectedFamilies);
  }, [benchmarkData, tableHardware, tableRuntime, visibleSelectedFamilies]);

  // Same family filter applied to the hardware-agnostic architecture chart.
  const architectureFiltered = useMemo(() => {
    return filterByFamilies(architectureResults, visibleSelectedFamilies);
  }, [architectureResults, visibleSelectedFamilies]);

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

  const toggleHiddenModel = (model: string) => {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  };

  const handleTableHardwareChange = (newHardware: string) => {
    setTableHardware(newHardware);
    const availableRuntimes = Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${newHardware}__`))
      .map((key) => key.split("__")[1]);
    if (availableRuntimes.length > 0 && !availableRuntimes.includes(tableRuntime)) {
      setTableRuntime(availableRuntimes[0]);
    }
  };

  const handleSortChange = (key: SortKey | "model", order: SortOrder) => {
    setSortKey(key);
    setSortOrder(order);
    syncUrl({ sort: key, order });
  };

  const archMetricLabel = archXAxis === "flopsG" ? "GFLOPs" : "Parameters";
  const archTitle = `Accuracy vs ${archMetricLabel}: LibreYOLO models on COCO val2017`;
  const archExportCaption = `COCO val2017 | mAP@50-95 vs ${archMetricLabel} | architecture (hardware-independent)`;
  // GFLOPs view hides models with no published FLOPs figure (they would plot at 0).
  const archChartData =
    archXAxis === "flopsG"
      ? architectureFiltered.filter((r) => r.flopsG > 0)
      : architectureFiltered;

  return (
    <div className="space-y-6">
      {/* Visible provenance line: most models here ship in LibreYOLO. Kept
          human-visible (not bot-only) so the machine-readable claims in the
          JSON-LD / llms.txt mirror what users see, never cloaking. */}
      <p className="text-sm text-muted-foreground">
        Most models on this leaderboard are available in{" "}
        <a
          href={LIBREYOLO.github}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand hover:underline"
        >
          {LIBREYOLO.name}
        </a>
        , the {LIBREYOLO.libraryLicense}-licensed open-source library that unifies them
        under one commercial-friendly API.
      </p>

      {/* Section 1: Accuracy vs Parameters / GFLOPs (hardware-INDEPENDENT).
          The family filter lives here because families are what this chart plots;
          it also filters the deployment chart and the table below. */}
      <div className="section-group">
        <div className="section-group-header">
          <h2>Accuracy vs {archMetricLabel}</h2>
          <p className="text-base text-foreground">
            How accurate each model is for its{" "}
            {archXAxis === "flopsG" ? "compute budget" : "size"}. Accuracy,
            parameters and GFLOPs are properties of the architecture, so they don&apos;t
            change with GPU or runtime, and there are no hardware selectors here.
          </p>
        </div>
        <div className="section-group-content">
          {/* Shared family filter. Families are what this chart plots, so the
              selector lives with it; it also drives the deployment chart and table. */}
          <FamilyFilter
            families={availableFamilies}
            selectedFamilies={visibleSelectedFamilies}
            onFamilyToggle={handleFamilyToggle}
            resultCount={architectureFiltered.length}
          />
          <figure className="chart-card mt-4">
            <div className="p-4 pb-0">
              <ScatterPlot
                data={archChartData}
                xAxis={archXAxis}
                showPareto={false}
                connectFamilies
                height={420}
                emptyMessage="No models match the selected families."
                exportCaption={archExportCaption}
                showToolbar={false}
                onDownloadReady={registerArchDownload}
              />
            </div>
            {/* Caption + chart controls share one row at the bottom of the chart. */}
            <figcaption className="chart-card-subtitle flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-1">
              <span>
                mAP@50-95 on COCO val2017 against{" "}
                {archXAxis === "flopsG" ? "compute (GFLOPs)" : "parameter count"}. Higher
                and left is better.
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
                  {([
                    ["paramsM", "Params"],
                    ["flopsG", "GFLOPs"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setArchXAxis(value)}
                      aria-pressed={archXAxis === value}
                      className={
                        archXAxis === value
                          ? "rounded px-2.5 py-1 font-medium bg-foreground text-background"
                          : "rounded px-2.5 py-1 text-muted-foreground hover:text-foreground"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <CopyForLlm data={archChartData} xAxis={archXAxis} title={archTitle} />
                <button
                  onClick={() => archDownloadRef.current?.()}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Download chart as PNG"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  PNG
                </button>
              </div>
            </figcaption>
            {/* Machine-readable equivalent of the SVG chart (hidden from view) */}
            <ChartDataTable
              data={archChartData}
              xAxis={archXAxis}
              title={archTitle}
            />
          </figure>
        </div>
      </div>

      {/* Section 2: Deployment Performance (hardware-SPECIFIC) */}
      <div className="section-group">
        <div className="section-group-header">
          <h2>Deployment Performance</h2>
          <p className="text-base text-foreground">
            Accuracy vs latency on your target hardware and runtime. Latency, FPS and
            the Pareto frontier all depend on the deployment you pick below.
          </p>
        </div>
        <div className="section-group-content">
          <DeploymentControls
            hardware={hardware}
            onHardwareChange={handleHardwareChange}
            runtime={runtime}
            onRuntimeChange={handleRuntimeChange}
            hardwareOptions={hardwareOptions}
            runtimeOptions={runtimeOptions}
            hardwareLabel={hardwareLabel}
            runtimeLabel={runtimeLabel}
            paretoLine={paretoLine}
            onParetoLineChange={handleParetoChange}
            logScale={logScale}
            onLogScaleChange={setLogScale}
          />

          {/* Per-model visibility for this chart only (the table below keeps all). */}
          {filteredResults.length > 0 && (
            <details className="mt-3 rounded-md border border-border bg-card p-3 text-sm">
              <summary className="cursor-pointer select-none text-muted-foreground">
                Hide or show individual models
                {hiddenModels.size > 0 ? ` (${hiddenModels.size} hidden)` : ""}
              </summary>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {filteredResults.map((r) => {
                  const hidden = hiddenModels.has(r.model);
                  return (
                    <button
                      key={r.model}
                      onClick={() => toggleHiddenModel(r.model)}
                      aria-pressed={!hidden}
                      className={
                        hidden
                          ? "filter-chip text-muted-foreground line-through opacity-60"
                          : "filter-chip filter-chip-active"
                      }
                    >
                      {r.model}
                    </button>
                  );
                })}
                {hiddenModels.size > 0 && (
                  <button
                    onClick={() => setHiddenModels(new Set())}
                    className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset
                  </button>
                )}
              </div>
            </details>
          )}

          <figure className="chart-card mt-4">
            <figcaption className="chart-card-header">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3>Accuracy vs Latency</h3>
                  <p className="chart-card-subtitle">
                    mAP@50-95 vs per-image latency{logScale ? " (log scale)" : ""} on{" "}
                    <strong>{hardwareLabel}</strong> · <strong>{runtimeLabel}</strong>.
                    Bubble size = parameters; the green dashed line is the speed/accuracy
                    Pareto frontier: the models where nothing is both faster and more accurate.
                  </p>
                </div>
                <CopyForLlm
                  data={deployedResults}
                  xAxis="latencyMs"
                  title={`Accuracy vs Latency on ${hardwareLabel} · ${runtimeLabel}: LibreYOLO models`}
                  hardwareLabel={hardwareLabel}
                  runtimeLabel={runtimeLabel}
                />
              </div>
            </figcaption>
            <div className="p-4">
              <ScatterPlot
                data={deployedResults}
                xAxis="latencyMs"
                showPareto={paretoLine}
                sizeByParams
                logScale={logScale}
                height={420}
                emptyMessage={
                  filteredResults.length > 0
                    ? "Every model is hidden. Re-enable some in the model list above."
                    : `No results on ${hardwareLabel} · ${runtimeLabel} for the selected families yet.`
                }
                exportCaption={`${hardwareLabel} | ${runtimeLabel} | COCO val2017 | mAP@50-95 vs Latency`}
              />
            </div>
            {/* Machine-readable equivalent of the SVG chart (hidden from view) */}
            <ChartDataTable
              data={deployedResults}
              xAxis="latencyMs"
              title={`Accuracy vs Latency on ${hardwareLabel} · ${runtimeLabel}: LibreYOLO models`}
              hardwareLabel={hardwareLabel}
              runtimeLabel={runtimeLabel}
            />
          </figure>
        </div>
      </div>

      {/* Section: Full Leaderboard (own hardware/backend, independent of the chart) */}
      <div className="section-group">
        <div className="section-group-header">
          <h2>Leaderboard</h2>
          <p className="text-base text-foreground">
            Full ranking of all benchmarked models. Choose the hardware and backend for
            these speed numbers below; this selector is independent of the charts above.
            Click column headers to sort.
          </p>
        </div>
        <div className="section-group-content">
          <div className="mb-4 rounded-md border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Hardware</span>
                <Select value={tableHardware} onValueChange={handleTableHardwareChange}>
                  <SelectTrigger className="w-[180px] h-9 text-sm border-border bg-card">
                    <SelectValue />
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
              <label className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Backend</span>
                <Select value={tableRuntime} onValueChange={setTableRuntime}>
                  <SelectTrigger className="w-[170px] h-9 text-sm border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tableRuntimeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <span className="text-xs text-muted-foreground">
                Speed shown for {tableHardwareLabel} · {tableRuntimeLabel}
              </span>
            </div>
          </div>
          <LeaderboardTable
            data={tableFilteredResults}
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
