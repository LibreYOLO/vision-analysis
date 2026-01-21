"use client";

import { useState, useMemo } from "react";
import { getBenchmarkResults, filterByFamilies } from "@/lib/data";
import { LeaderboardTable, FilterBar } from "@/components/leaderboard";
import { ScatterPlot, SpeedBreakdown } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const [hardware, setHardware] = useState("a100_tensorrt_fp16");
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
          Object Detection Benchmarks
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Independent, reproducible benchmarks for YOLO, RT-DETR, and other
          computer vision models. Compare accuracy, speed, and efficiency across
          hardware — with complete end-to-end timing.
        </p>
      </section>

      {/* Main Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Accuracy vs Speed</CardTitle>
          <CardDescription>
            mAP@50-95 on COCO val2017 vs throughput. Pareto-optimal models
            highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScatterPlot data={filteredResults} showPareto height={450} />
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
                Unlike other benchmarks, we measure the complete pipeline:
                preprocessing, inference, and postprocessing (NMS). This reveals
                YOLOv10&apos;s NMS-free advantage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpeedBreakdown data={filteredResults} limit={20} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key Insights */}
      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why End-to-End?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Most benchmarks only report inference time, hiding the cost of
              preprocessing and NMS. Real-world applications pay the full price.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">YOLOv10: NMS-Free</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              YOLOv10 eliminates Non-Maximum Suppression during inference,
              providing consistent latency and often faster end-to-end
              performance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">RT-DETR Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Transformer-based RT-DETR often achieves higher mAP than YOLO
              models at similar speeds. It&apos;s worth considering for accuracy-critical
              applications.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
