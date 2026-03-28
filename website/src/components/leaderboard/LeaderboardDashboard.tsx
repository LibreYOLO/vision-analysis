"use client";

import { useState, useMemo } from "react";
import { BenchmarkResult } from "@/lib/types";
import { filterByFamilies } from "@/lib/data/utils";
import { LeaderboardTable } from "./LeaderboardTable";
import { FilterBar } from "./FilterBar";
import { ScatterPlot, SpeedBreakdown } from "@/components/charts";

interface LeaderboardDashboardProps {
  benchmarkData: Record<string, BenchmarkResult[]>;
  hardwareOptions: Array<{ value: string; label: string }>;
  families: string[];
}

export function LeaderboardDashboard({
  benchmarkData,
  hardwareOptions,
  families,
}: LeaderboardDashboardProps) {
  const [hardware, setHardware] = useState("a100");
  const [runtime, setRuntime] = useState("pytorch_fp32");
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);

  // Get available runtimes for the selected hardware
  const runtimeOptions = useMemo(() => {
    return Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${hardware}__`))
      .map((key) => {
        const rt = key.split("__")[1];
        return { value: rt, label: rt.replace("_", " ").toUpperCase() };
      });
  }, [benchmarkData, hardware]);

  // Get data for selected hardware + runtime
  const allResults = useMemo(() => {
    const key = `${hardware}__${runtime}`;
    return benchmarkData[key] || [];
  }, [benchmarkData, hardware, runtime]);

  // Filter by selected families
  const filteredResults = useMemo(() => {
    return filterByFamilies(allResults, selectedFamilies);
  }, [allResults, selectedFamilies]);

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
            selectedFamilies={selectedFamilies}
            onFamilyToggle={handleFamilyToggle}
            resultCount={filteredResults.length}
            hardwareOptions={hardwareOptions}
            runtimeOptions={runtimeOptions}
            families={families}
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
              <ScatterPlot data={filteredResults} showPareto={false} height={420} />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Speed & Latency */}
      <div className="section-group">
        <div className="section-group-header">
          <h2>Speed &amp; Latency</h2>
          <p className="text-base text-foreground">
            End-to-end inference speed including preprocessing, model inference, and postprocessing (NMS).
          </p>
        </div>
        <div className="section-group-content">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>End-to-End Speed Breakdown</h3>
              <p className="chart-card-subtitle">
                Complete pipeline timing: preprocessing, inference, and postprocessing per image.
              </p>
            </div>
            <div className="p-4">
              <SpeedBreakdown data={filteredResults} limit={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Efficiency */}
      <div className="section-group">
        <div className="section-group-header">
          <h2>Efficiency</h2>
          <p className="text-base text-foreground">
            Accuracy per unit of compute - how much mAP you get per GFLOP. Critical for edge deployment.
          </p>
        </div>
        <div className="section-group-content">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Accuracy vs Speed</h3>
              <p className="chart-card-subtitle">
                mAP@50-95 plotted against throughput (FPS). Upper-right is the ideal sweet spot.
              </p>
            </div>
            <div className="p-4">
              <ScatterPlot
                data={filteredResults}
                showPareto={false}
                height={420}
                xAxis="flopsG"
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
            Full ranking of all benchmarked models. Click column headers to sort.
          </p>
        </div>
        <div className="section-group-content">
          <LeaderboardTable
            data={filteredResults}
            familyFilter={selectedFamilies}
          />
        </div>
      </div>
    </div>
  );
}
