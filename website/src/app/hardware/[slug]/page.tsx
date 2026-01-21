import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getHardware, getHardwareById, getBenchmarkResults } from "@/lib/data";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent, formatMs } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { siteConfig } from "@/config/site";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const hardware = getHardware();
  return hardware.map((hw) => ({
    slug: hw.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hw = getHardwareById(slug);
  if (!hw) {
    return { title: "Hardware Not Found" };
  }

  return {
    title: `${hw.displayName} Benchmarks`,
    description: `Object detection model benchmarks on ${hw.displayName}. Compare YOLO, RT-DETR, and more.`,
  };
}

export default async function HardwarePage({ params }: Props) {
  const { slug } = await params;
  const hw = getHardwareById(slug);

  if (!hw) {
    notFound();
  }

  const results = getBenchmarkResults(slug);
  const sortedByMaP = [...results].sort((a, b) => b.mAP_50_95 - a.mAP_50_95);
  const sortedByFps = [...results].sort((a, b) => b.throughputFps - a.throughputFps);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/hardware"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        All Hardware
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{hw.displayName}</h1>
        {hw.specs.gpuName && (
          <p className="text-muted-foreground">{hw.specs.gpuName}</p>
        )}
      </div>

      {/* Specs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {hw.specs.vramGb && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>VRAM</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hw.specs.vramGb} GB</p>
            </CardContent>
          </Card>
        )}
        {hw.specs.fp16Tflops && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>FP16 Performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hw.specs.fp16Tflops} TFLOPS</p>
            </CardContent>
          </Card>
        )}
        {hw.specs.tdpWatts && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Power (TDP)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hw.specs.tdpWatts}W</p>
            </CardContent>
          </Card>
        )}
        {hw.providers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Starting Price</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ${Math.min(...hw.providers.map((p) => p.costPerHour)).toFixed(2)}/hr
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Providers */}
      {hw.providers.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cloud Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {hw.providers.map((provider) => (
                <a
                  key={provider.name}
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{provider.name}</span>
                  <span className="text-green-600 font-mono">
                    ${provider.costPerHour.toFixed(2)}/hr
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
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
                <div key={model.model} className="flex items-center justify-between">
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
                  <span className="font-mono text-green-600">
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
                <div key={model.model} className="flex items-center justify-between">
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
            {results.length} models benchmarked on {hw.displayName}
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
                <TableRow key={model.model}>
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
    </div>
  );
}
