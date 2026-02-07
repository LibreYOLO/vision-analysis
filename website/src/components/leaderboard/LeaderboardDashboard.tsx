"use client";

import { useState, useMemo } from "react";
import { BenchmarkResult } from "@/lib/types";
import { filterByFamilies } from "@/lib/data/utils";
import { LeaderboardTable } from "./LeaderboardTable";
import { FilterBar } from "./FilterBar";
import { ScatterPlot, SpeedBreakdown } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    // Reset runtime to first available for the new hardware
    const availableRuntimes = Object.keys(benchmarkData)
      .filter((key) => key.startsWith(`${newHardware}__`))
      .map((key) => key.split("__")[1]);
    if (availableRuntimes.length > 0 && !availableRuntimes.includes(runtime)) {
      setRuntime(availableRuntimes[0]);
    }
  };

  return (
    <>
      {/* Main Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Accuracy vs Size</CardTitle>
          <CardDescription>
            mAP@50-95 on COCO val2017 vs model parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScatterPlot data={filteredResults} showPareto={false} height={450} />
        </CardContent>
      </Card>

      {/* Filters */}
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

      {/* Tabs for Table/Speed Breakdown */}
      <Tabs defaultValue="leaderboard" className="mt-6">
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="speed">Speed Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4">
          <LeaderboardTable
            data={filteredResults}
            familyFilter={selectedFamilies}
          />
        </TabsContent>

        <TabsContent value="speed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>End-to-End Speed Breakdown</CardTitle>
              <CardDescription>
                We measure the complete pipeline: preprocessing, inference, and
                postprocessing (NMS) for accurate real-world performance comparison.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpeedBreakdown data={filteredResults} limit={20} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
