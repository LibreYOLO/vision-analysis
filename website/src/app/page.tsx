"use client";

import { useState, useMemo } from "react";
import { getBenchmarkResults, filterByFamilies } from "@/lib/data";
import { LeaderboardTable, FilterBar } from "@/components/leaderboard";
import { ScatterPlot, SpeedBreakdown } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const [hardware, setHardware] = useState("a100_pytorch_fp32");
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);

  // Get data for selected hardware
  const allResults = useMemo(() => {
    return getBenchmarkResults(hardware);
  }, [hardware]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          LibreYOLO Benchmarks
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Comprehensive benchmarks for LibreYOLO models. Compare accuracy and efficiency across
          YOLOv9 and YOLOX model families.
        </p>
      </section>

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
        onHardwareChange={setHardware}
        selectedFamilies={selectedFamilies}
        onFamilyToggle={handleFamilyToggle}
        resultCount={filteredResults.length}
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

    </div>
  );
}
