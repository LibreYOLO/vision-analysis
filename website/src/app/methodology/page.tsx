import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Vision Analysis benchmarks are conducted. Understand our testing methodology, metrics, and how we ensure fair comparisons.",
};

export default function MethodologyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Methodology</h1>
      <p className="text-muted-foreground mb-8">
        How we benchmark object detection models fairly and reproducibly
      </p>

      {/* Why This Matters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Why End-to-End Benchmarking?</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            Most published benchmarks only report <strong>inference time</strong> — the time
            the neural network takes to process a tensor. This hides two critical costs:
          </p>
          <ul>
            <li>
              <strong>Preprocessing</strong>: Loading images, resizing, normalizing, and
              converting to tensors (typically 1-5ms)
            </li>
            <li>
              <strong>Postprocessing</strong>: Non-Maximum Suppression (NMS), decoding
              boxes, and formatting output (typically 1-5ms for YOLO models)
            </li>
          </ul>
          <p>
            For real-world applications, you pay the full cost. A model that reports
            &quot;8ms inference&quot; might actually take 15ms end-to-end.
          </p>
          <p>
            This matters especially when comparing architectures like YOLOv10
            (NMS-free) vs traditional YOLO models that require NMS postprocessing.
          </p>
        </CardContent>
      </Card>

      {/* What We Measure */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What We Measure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Accuracy Metrics</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">mAP@50-95</Badge>
                  <span>Primary metric, COCO standard (IoU 0.5 to 0.95)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">mAP@50</Badge>
                  <span>VOC-style metric (IoU 0.5)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">mAP@75</Badge>
                  <span>Stricter localization (IoU 0.75)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">mAP S/M/L</Badge>
                  <span>Per-size breakdown (small/medium/large objects)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Speed Metrics</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Preprocess</Badge>
                  <span>Image loading, resize, normalize, to tensor</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Inference</Badge>
                  <span>Neural network forward pass only</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Postprocess</Badge>
                  <span>NMS, decoding, formatting</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">Total</Badge>
                  <span>Full end-to-end latency</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">FPS</Badge>
                  <span>Throughput (1000 / total_ms)</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Protocol */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Testing Protocol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Dataset</h4>
              <p className="text-sm text-muted-foreground">
                COCO val2017 (5,000 images, 80 classes). This is the industry standard
                for object detection evaluation.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Input Processing</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Letterbox resize to 640x640 (maintains aspect ratio with padding)</li>
                <li>ImageNet normalization (mean: 0.485, 0.456, 0.406; std: 0.229, 0.224, 0.225)</li>
                <li>Identical preprocessing for all models</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Inference Settings</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Batch size: 1 (for latency measurements)</li>
                <li>Warm-up: 50 iterations (critical for GPU benchmarks)</li>
                <li>Timing runs: 100 iterations (for statistical significance)</li>
                <li>Confidence threshold: 0.001 (for mAP), 0.25 (for speed)</li>
                <li>NMS IoU threshold: 0.7</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">GPU Synchronization</h4>
              <p className="text-sm text-muted-foreground">
                We use <code className="bg-muted px-1 rounded">torch.cuda.synchronize()</code> between
                timing measurements to ensure accurate GPU timing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How We Differ */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How We Differ from Other Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Aspect</th>
                  <th className="text-left py-2 pr-4">Ultralytics / Others</th>
                  <th className="text-left py-2">Vision Analysis</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Timing</td>
                  <td className="py-2 pr-4">Inference only</td>
                  <td className="py-2 text-green-600">Full end-to-end</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">NMS</td>
                  <td className="py-2 pr-4">Often excluded from timing</td>
                  <td className="py-2 text-green-600">Always included</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Model Coverage</td>
                  <td className="py-2 pr-4">Favors own models</td>
                  <td className="py-2 text-green-600">All major architectures</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium">Hardware</td>
                  <td className="py-2 pr-4">Cherry-picked</td>
                  <td className="py-2 text-green-600">Comprehensive matrix</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Reproducibility</td>
                  <td className="py-2 pr-4">Varies</td>
                  <td className="py-2 text-green-600">Docker commands provided</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reproducibility */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Reproducibility</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Every benchmark can be reproduced with a single Docker command:
          </p>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`docker run --gpus all \\
  -v /data/coco:/data/coco \\
  ghcr.io/vision-analysis/benchmark-runner:latest \\
  benchmark \\
  --model yolov8x \\
  --dataset coco_val2017 \\
  --hardware a100 \\
  --format tensorrt_fp16`}</code>
          </pre>
          <p className="text-sm text-muted-foreground mt-4">
            All benchmark configurations, model weights, and environment specifications
            are version-controlled in our GitHub repository.
          </p>
        </CardContent>
      </Card>

      {/* Known Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Known Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Single GPU only:</strong> Multi-GPU throughput not measured
            </li>
            <li>
              <strong>Batch size 1:</strong> Batch processing can improve throughput but
              adds latency
            </li>
            <li>
              <strong>Fixed input size:</strong> Models may perform differently at other
              resolutions
            </li>
            <li>
              <strong>COCO only:</strong> Performance on domain-specific datasets may vary
            </li>
            <li>
              <strong>Mock data:</strong> Current benchmarks use simulated data — real
              benchmarks coming soon
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
