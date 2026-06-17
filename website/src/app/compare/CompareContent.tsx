"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { X, Plus, GripVertical } from "lucide-react";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent, formatMs } from "@/lib/utils/format";
import { BenchmarkResult, ModelMetadata } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MAX_MODELS = 4;
const DEFAULT_MODELS = ["dfine-m", "rtdetr-r50"];

const COMPARISON_METRICS = [
  { key: "mAP_50_95", label: "mAP@50-95", format: "percent", higherBetter: true },
  { key: "mAP_50", label: "mAP@50", format: "percent", higherBetter: true },
  { key: "throughputFps", label: "Throughput (FPS)", format: "number", higherBetter: true },
  { key: "totalMs", label: "Latency (ms)", format: "ms", higherBetter: false },
  { key: "preprocessMs", label: "Preprocess (ms)", format: "ms", higherBetter: false },
  { key: "inferenceMs", label: "Inference (ms)", format: "ms", higherBetter: false },
  { key: "postprocessMs", label: "Postprocess (ms)", format: "ms", higherBetter: false },
  { key: "paramsM", label: "Parameters (M)", format: "millions", higherBetter: false },
  { key: "flopsG", label: "FLOPs (G)", format: "number", higherBetter: false },
  { key: "peakVramMb", label: "VRAM (MB)", format: "number", higherBetter: false },
  { key: "mAPPerGflop", label: "mAP/GFLOP", format: "number", higherBetter: true },
] as const;

function formatValue(value: number | undefined | null, format: string): string {
  if (value == null || !Number.isFinite(value)) return "-";
  switch (format) {
    case "percent":
      return formatPercent(value);
    case "ms":
      return value === 0 ? "-" : formatMs(value);
    case "millions":
      return `${formatNumber(value, 1)}M`;
    default:
      return formatNumber(value, 1);
  }
}

interface CompareContentProps {
  benchmarkData: Record<string, BenchmarkResult[]>;
  allModels: ModelMetadata[];
  hardwareOptions: Array<{ value: string; label: string }>;
  allRuntimeOptions: Array<{ value: string; label: string }>;
}

export function CompareContent({
  benchmarkData,
  allModels,
  hardwareOptions,
  allRuntimeOptions,
}: CompareContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize hardware/runtime from the URL so compare links are fully shareable
  const hwParam = searchParams.get("hw");
  const initialHardware =
    hwParam && hardwareOptions.some((o) => o.value === hwParam) ? hwParam : "a100";
  const rtParam = searchParams.get("rt");
  const initialRuntime =
    rtParam && benchmarkData[`${initialHardware}__${rtParam}`]
      ? rtParam
      : "pytorch_fp32";

  const [hardware, setHardware] = useState(initialHardware);
  const [runtime, setRuntime] = useState(initialRuntime);
  // Index of the tag currently being dragged (for reordering selected models).
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Mirror hardware/runtime into the URL without triggering navigation
  const syncUrl = (newHardware: string, newRuntime: string) => {
    const params = new URLSearchParams(window.location.search);
    if (newHardware === "a100") params.delete("hw");
    else params.set("hw", newHardware);
    if (newRuntime === "pytorch_fp32") params.delete("rt");
    else params.set("rt", newRuntime);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  // Get selected models from URL, falling back to defaults until the user changes them
  const selectedModelIds = useMemo(() => {
    const modelsParam = searchParams.get("models");
    if (modelsParam === null) {
      const available = new Set(allModels.map((m) => m.id));
      return DEFAULT_MODELS.filter((id) => available.has(id)).slice(0, MAX_MODELS);
    }
    if (modelsParam === "") return [];
    return modelsParam.split(",").slice(0, MAX_MODELS);
  }, [searchParams, allModels]);

  // Get all benchmark data for current hardware+runtime
  const allResults = useMemo(() => {
    const key = `${hardware}__${runtime}`;
    return benchmarkData[key] || [];
  }, [benchmarkData, hardware, runtime]);

  // Runtime options for current hardware
  const runtimeOptions = useMemo(() => {
    return Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${hardware}__`))
      .map((key) => {
        const rt = key.split("__")[1];
        const opt = allRuntimeOptions.find((o) => o.value === rt);
        return opt || { value: rt, label: rt };
      });
  }, [benchmarkData, hardware, allRuntimeOptions]);

  // Get data for selected models
  const selectedModels = useMemo(() => {
    return selectedModelIds
      .map((id) => allResults.find((r) => r.model === id))
      .filter((r): r is BenchmarkResult => r !== undefined);
  }, [selectedModelIds, allResults]);

  // Models that have benchmark data for current hardware+runtime
  const modelsWithData = useMemo(() => {
    const resultIds = new Set(allResults.map((r) => r.model));
    return allModels.filter((m) => resultIds.has(m.id));
  }, [allModels, allResults]);

  // Available models (have data and not already selected)
  const availableModels = useMemo(() => {
    return modelsWithData.filter((m) => !selectedModelIds.includes(m.id));
  }, [modelsWithData, selectedModelIds]);

  // Update URL with selected models. Empty string keeps the param around so we
  // don't fall back to the preselected defaults after the user clears everything.
  const updateSelectedModels = (models: string[]) => {
    const params = new URLSearchParams(searchParams);
    params.set("models", models.join(","));
    router.push(`/compare?${params.toString()}`);
  };

  const addModel = (modelId: string) => {
    if (selectedModelIds.length < MAX_MODELS) {
      updateSelectedModels([...selectedModelIds, modelId]);
    }
  };

  const removeModel = (modelId: string) => {
    updateSelectedModels(selectedModelIds.filter((id) => id !== modelId));
  };

  // Drag-to-reorder: move a selected model from one position to another. The
  // comparison table reads selectedModels in this order, so it updates live.
  const moveModel = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...selectedModelIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateSelectedModels(next);
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
    syncUrl(newHardware, newRuntime);
  };

  const handleRuntimeChange = (newRuntime: string) => {
    setRuntime(newRuntime);
    syncUrl(hardware, newRuntime);
  };

  // Build suggested comparisons from available data
  const suggestions = useMemo(() => {
    const available = new Set(allResults.map((r) => r.model));
    const candidates = [
      { label: "YOLOX vs YOLOv9 (Large)", models: ["yolox-x", "yolov9c", "yolox-l"] },
      { label: "Lightweight Models", models: ["yolox-nano", "yolox-tiny", "yolov9t", "yolov9s"] },
      { label: "Balanced Models", models: ["yolox-s", "yolox-m", "yolov9s", "yolov9m"] },
      { label: "RF-DETR Family", models: ["rfdetr-n", "rfdetr-s", "rfdetr-m", "rfdetr-l"] },
    ];
    return candidates
      .map((c) => ({ ...c, models: c.models.filter((m) => available.has(m)) }))
      .filter((c) => c.models.length >= 2);
  }, [allResults]);

  // Find best value for each metric
  const getBestValue = (key: string, higherBetter: boolean) => {
    if (selectedModels.length === 0) return null;
    const values = selectedModels.map((m) => m[key as keyof BenchmarkResult] as number);
    return higherBetter ? Math.max(...values) : Math.min(...values);
  };

  return (
    <>
      {/* Model Selector */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Selected Models</CardTitle>
          <CardDescription>
            {selectedModels.length} of {MAX_MODELS} models selected
            {selectedModelIds.length > 1 ? " · drag the tags to reorder" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {selectedModelIds.map((modelId, index) => {
              const model = allResults.find((r) => r.model === modelId);
              const meta = allModels.find((m) => m.id === modelId);
              const hasData = !!model;
              return (
                <div
                  key={modelId}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) moveModel(dragIndex, index);
                    setDragIndex(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing ${
                    hasData ? "bg-background" : "bg-muted/50 border-dashed"
                  } ${dragIndex === index ? "opacity-50" : ""}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${!hasData ? "opacity-40" : ""}`}
                    style={{ backgroundColor: getFamilyColor(model?.family ?? meta?.family ?? "") }}
                  />
                  <Link
                    href={`/model/${modelId}`}
                    draggable={false}
                    className={`font-medium hover:underline ${!hasData ? "text-muted-foreground" : ""}`}
                  >
                    {modelId}
                  </Link>
                  {!hasData && (
                    <Badge variant="secondary" className="text-xs">
                      No data
                    </Badge>
                  )}
                  <button
                    onClick={() => removeModel(modelId)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            {selectedModelIds.length < MAX_MODELS && (
              <Select onValueChange={addModel}>
                <SelectTrigger className="w-[200px]">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <SelectValue placeholder="Add model..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getFamilyColor(model.family) }}
                        />
                        {model.displayName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Hardware + Runtime selectors */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hardware:</span>
              <Select value={hardware} onValueChange={handleHardwareChange}>
                <SelectTrigger className="w-[200px]">
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
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Runtime:</span>
              <Select value={runtime} onValueChange={handleRuntimeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {runtimeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {selectedModels.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Comparison</CardTitle>
            <CardDescription>
              Best values for each metric are highlighted in green
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Metric</TableHead>
                    {selectedModels.map((model) => (
                      <TableHead key={model.model} className="text-center min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getFamilyColor(model.family) }}
                          />
                          <span>{model.model}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPARISON_METRICS.map((metric) => {
                    const bestValue = getBestValue(metric.key, metric.higherBetter);
                    return (
                      <TableRow key={metric.key}>
                        <TableCell className="font-medium">{metric.label}</TableCell>
                        {selectedModels.map((model) => {
                          const value = model[metric.key as keyof BenchmarkResult] as number;
                          const isBest = value === bestValue && selectedModels.length > 1;
                          return (
                            <TableCell
                              key={model.model}
                              className={`text-center font-mono ${
                                isBest ? "text-green-600 dark:text-green-400 font-bold" : ""
                              }`}
                            >
                              {formatValue(value, metric.format)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-4">Select models to compare their performance</p>
            <p className="text-sm">
              Tip: Try comparing YOLOX and YOLOv9 models across different sizes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Compare Suggestions */}
      {selectedModels.length === 0 && suggestions.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Suggested Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  variant="outline"
                  onClick={() => updateSelectedModels(suggestion.models)}
                >
                  {suggestion.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
