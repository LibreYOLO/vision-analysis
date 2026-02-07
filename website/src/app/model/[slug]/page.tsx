import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Github, FileText } from "lucide-react";
import {
  getModels,
  getModelById,
  getModelBenchmarks,
  getModelsByFamily,
  getHardwareById,
  getRuntimeById,
} from "@/lib/data";
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
  const models = getModels();
  return models.map((model) => ({
    slug: model.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = getModelById(slug);
  if (!model) {
    return {
      title: "Model Not Found",
    };
  }

  return {
    title: `${model.displayName} Benchmark Results`,
    description: `${model.displayName} achieves ${model.specs.paramsM}M parameters. See detailed benchmarks across hardware configurations.`,
    openGraph: {
      title: `${model.displayName} Benchmark Results | ${siteConfig.name}`,
      description: `Benchmark results for ${model.displayName} on COCO val2017`,
      type: "article",
    },
  };
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = getModelById(slug);

  if (!model) {
    notFound();
  }

  const benchmarks = getModelBenchmarks(slug);
  const relatedModels = getModelsByFamily(model.family).filter(
    (m) => m.id !== model.id
  );

  // Find a benchmark with timing data for speed breakdown
  const benchmarkWithTiming = benchmarks.find(
    (b) => b.result && b.result.preprocessMs > 0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Leaderboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{model.displayName}</h1>
            <Badge
              style={{
                backgroundColor: getFamilyColor(model.family),
                color: "white",
              }}
            >
              {model.family}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {model.architecture.type} detector with {model.architecture.backbone}{" "}
            backbone
          </p>
        </div>

        <div className="flex gap-2">
          {model.source.paperUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={model.source.paperUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Paper
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a
              href={model.source.codeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="mr-2 h-4 w-4" />
              Code
            </a>
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(model.specs.paramsM, 1)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>FLOPs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(model.specs.flopsG, 1)}G</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Input Size</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{model.specs.inputSizeDefault}px</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>License</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{model.license}</p>
          </CardContent>
        </Card>
      </div>

      {/* Architecture Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{model.architecture.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Backbone</p>
              <p className="font-medium">{model.architecture.backbone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Neck</p>
              <p className="font-medium">{model.architecture.neck}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Head</p>
              <p className="font-medium">{model.architecture.head}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Results by Hardware */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Benchmark Results</CardTitle>
          <CardDescription>
            Performance on COCO val2017 across different hardware configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hardware</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead className="text-right">mAP@50-95</TableHead>
                <TableHead className="text-right">FPS</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead className="text-right">VRAM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map(({ hardware, runtime, result }) => {
                if (!result) return null;
                const hwMeta = getHardwareById(hardware);
                const rtMeta = getRuntimeById(runtime);
                return (
                  <TableRow key={`${hardware}__${runtime}`}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/hardware/${hardware}`}
                        className="hover:underline"
                      >
                        {hwMeta?.displayName || hardware}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {rtMeta?.displayName || runtime}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercent(result.mAP_50_95)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(result.throughputFps, 1)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMs(result.totalMs)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {result.peakVramMb > 0
                        ? `${formatNumber(result.peakVramMb, 0)} MB`
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Speed Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            Speed Breakdown
            {benchmarkWithTiming && (
              <span className="text-base font-normal text-muted-foreground ml-2">
                ({getHardwareById(benchmarkWithTiming.hardware)?.displayName || benchmarkWithTiming.hardware})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            End-to-end latency breakdown showing preprocessing, inference, and
            postprocessing times
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            if (!benchmarkWithTiming?.result) {
              return <p className="text-muted-foreground">No detailed timing data available</p>;
            }

            const result = benchmarkWithTiming.result;
            const total = result.totalMs;
            const preWidth = (result.preprocessMs / total) * 100;
            const infWidth = (result.inferenceMs / total) * 100;
            const postWidth = (result.postprocessMs / total) * 100;

            return (
              <div className="space-y-4">
                <div className="h-8 flex rounded overflow-hidden">
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs"
                    style={{ width: `${preWidth}%` }}
                  >
                    {result.preprocessMs.toFixed(1)}ms
                  </div>
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs"
                    style={{ width: `${infWidth}%` }}
                  >
                    {result.inferenceMs.toFixed(1)}ms
                  </div>
                  <div
                    className="bg-orange-500 flex items-center justify-center text-white text-xs"
                    style={{ width: `${postWidth}%` }}
                  >
                    {result.postprocessMs.toFixed(1)}ms
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>Preprocess</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Inference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span>Postprocess (NMS)</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage with LibreYOLO</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`from libreyolo import LIBREYOLO

# Load model (auto-downloads from HuggingFace if not found locally)
model = LIBREYOLO("${model.family === "yolox" ? `libreyoloX${model.variant}.pt` : model.family === "yolov9" ? `libreyolo9${model.variant}.pt` : `libre${model.family}${model.variant}.pth`}")

# Run inference
result = model("image.jpg", conf=0.25, iou=0.45)

# Process results
print(f"Found {len(result)} objects")
print(result.boxes.xyxy)   # bounding boxes (N, 4)
print(result.boxes.conf)   # confidence scores (N,)
print(result.boxes.cls)    # class IDs (N,)`}</code>
          </pre>
        </CardContent>
      </Card>

      {/* Tags */}
      {model.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {model.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Notes */}
      {model.notes && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{model.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Related Models */}
      {relatedModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Models ({model.family})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {relatedModels.map((related) => (
                <Link key={related.id} href={`/model/${related.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    {related.displayName}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
