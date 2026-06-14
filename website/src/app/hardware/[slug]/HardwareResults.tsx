"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent, formatMs } from "@/lib/utils/format";
import { benchmarkCoordinateKey } from "@/lib/data/utils";
import { BenchmarkResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HardwareResultsProps {
  hardwareName: string;
  resultsByRuntime: Record<string, BenchmarkResult[]>;
  runtimeOptions: Array<{ value: string; label: string }>;
}

export function HardwareResults({
  hardwareName,
  resultsByRuntime,
  runtimeOptions,
}: HardwareResultsProps) {
  const [runtime, setRuntime] = useState(runtimeOptions[0]?.value ?? "");

  const results = useMemo(
    () => resultsByRuntime[runtime] ?? [],
    [resultsByRuntime, runtime]
  );
  const sortedByMaP = useMemo(
    () => [...results].sort((a, b) => b.mAP_50_95 - a.mAP_50_95),
    [results]
  );
  const sortedByFps = useMemo(
    () => [...results].sort((a, b) => b.throughputFps - a.throughputFps),
    [results]
  );

  return (
    <>
      {/* Runtime switcher */}
      {runtimeOptions.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">Runtime:</span>
          {runtimeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setRuntime(option.value)}
              className={cn(
                "filter-chip",
                runtime === option.value ? "filter-chip-active" : "text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Top Models */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Highest Accuracy</CardTitle>
            <CardDescription>Top 5 models by mAP@50-95</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedByMaP.slice(0, 5).map((model, i) => (
                <div key={benchmarkCoordinateKey(model)} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getFamilyColor(model.family) }}
                    />
                    <Link
                      href={`/model/${model.model}`}
                      className="font-medium hover:underline"
                    >
                      {model.model}
                    </Link>
                  </div>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    {formatPercent(model.mAP_50_95)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fastest</CardTitle>
            <CardDescription>Top 5 models by throughput</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedByFps.slice(0, 5).map((model, i) => (
                <div key={benchmarkCoordinateKey(model)} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getFamilyColor(model.family) }}
                    />
                    <Link
                      href={`/model/${model.model}`}
                      className="font-medium hover:underline"
                    >
                      {model.model}
                    </Link>
                  </div>
                  <span className="font-mono">
                    {formatNumber(model.throughputFps, 0)} FPS
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>All Models</CardTitle>
          <CardDescription>
            {results.length} models benchmarked on {hardwareName}
            {runtimeOptions.length > 0 &&
              ` (${runtimeOptions.find((o) => o.value === runtime)?.label ?? runtime})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">mAP</TableHead>
                <TableHead className="text-right">FPS</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead className="text-right">Params</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByMaP.map((model, i) => (
                <TableRow key={benchmarkCoordinateKey(model)}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/model/${model.model}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getFamilyColor(model.family) }}
                      />
                      {model.model}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercent(model.mAP_50_95)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(model.throughputFps, 1)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMs(model.totalMs)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(model.paramsM, 1)}M
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
