"use client";

import { useState, useMemo } from "react";
import { getHardware, getBenchmarkResults, getModels } from "@/lib/data";
import { formatNumber } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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

const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;

export default function CostCalculatorPage() {
  const [imagesPerDay, setImagesPerDay] = useState(10000);
  const [selectedModel, setSelectedModel] = useState("yolov8m");

  const hardware = useMemo(() => getHardware(), []);
  const models = useMemo(() => getModels(), []);

  // Calculate costs for each hardware option
  const costAnalysis = useMemo(() => {
    return hardware.map((hw) => {
      const results = getBenchmarkResults(hw.id);
      const modelResult = results.find((r) => r.model === selectedModel);

      if (!modelResult) {
        return {
          hardware: hw,
          fps: 0,
          hoursNeeded: 0,
          dailyCost: 0,
          monthlyCost: 0,
          costPerMillionImages: 0,
          cheapestProvider: hw.providers[0],
        };
      }

      const fps = modelResult.throughputFps;
      const secondsPerImage = 1 / fps;
      const secondsNeeded = imagesPerDay * secondsPerImage;
      const hoursNeeded = secondsNeeded / 3600;

      // Find cheapest provider
      const cheapestProvider = hw.providers.reduce((min, p) =>
        p.costPerHour < min.costPerHour ? p : min
      );

      const dailyCost = hoursNeeded * cheapestProvider.costPerHour;
      const monthlyCost = dailyCost * DAYS_PER_MONTH;
      const costPerMillionImages = (dailyCost / imagesPerDay) * 1_000_000;

      return {
        hardware: hw,
        fps,
        hoursNeeded,
        dailyCost,
        monthlyCost,
        costPerMillionImages,
        cheapestProvider,
      };
    });
  }, [hardware, selectedModel, imagesPerDay]);

  // Find the most cost-effective option
  const bestOption = useMemo(() => {
    return costAnalysis.reduce((best, current) =>
      current.costPerMillionImages > 0 &&
      (best.costPerMillionImages === 0 ||
        current.costPerMillionImages < best.costPerMillionImages)
        ? current
        : best
    );
  }, [costAnalysis]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Cost Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Estimate cloud GPU costs for your object detection workload
      </p>

      {/* Input Controls */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Adjust your workload parameters to see cost estimates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Images Per Day Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Images per Day</label>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {formatNumber(imagesPerDay, 0)}
              </span>
            </div>
            <Slider
              value={[imagesPerDay]}
              onValueChange={([value]) => setImagesPerDay(value)}
              min={1000}
              max={1000000}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1K</span>
              <span>1M</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="mb-8 border-green-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Recommended Option
            <Badge variant="secondary" className="bg-green-500/20 text-green-600">
              Best Value
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Hardware</p>
              <p className="text-lg font-semibold">{bestOption.hardware.displayName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="text-lg font-semibold">
                {bestOption.cheapestProvider?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-lg font-semibold text-green-600">
                ${formatNumber(bestOption.monthlyCost, 2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cost per 1M Images</p>
              <p className="text-lg font-semibold font-mono">
                ${formatNumber(bestOption.costPerMillionImages, 2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hardware Comparison</CardTitle>
          <CardDescription>
            Cost breakdown for {selectedModel} processing {formatNumber(imagesPerDay, 0)} images/day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hardware</TableHead>
                <TableHead className="text-right">FPS</TableHead>
                <TableHead className="text-right">Hours/Day</TableHead>
                <TableHead className="text-right">$/Hour</TableHead>
                <TableHead className="text-right">Daily Cost</TableHead>
                <TableHead className="text-right">Monthly Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costAnalysis.map((analysis) => (
                <TableRow
                  key={analysis.hardware.id}
                  className={
                    analysis === bestOption ? "bg-green-500/10" : ""
                  }
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{analysis.hardware.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        via {analysis.cheapestProvider?.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(analysis.fps, 1)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(analysis.hoursNeeded, 2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${analysis.cheapestProvider?.costPerHour.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${formatNumber(analysis.dailyCost, 2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    ${formatNumber(analysis.monthlyCost, 2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Assumptions & Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Batch size 1:</strong> Costs assume sequential processing.
              Batching can improve throughput but adds latency.
            </li>
            <li>
              <strong>100% utilization:</strong> Real-world utilization varies.
              Consider adding 20-30% buffer for production workloads.
            </li>
            <li>
              <strong>Cheapest provider shown:</strong> Prices are approximate
              and may vary. Check provider websites for current pricing.
            </li>
            <li>
              <strong>Compute only:</strong> Does not include storage, network
              transfer, or other infrastructure costs.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
