import { Metadata } from "next";
import Link from "next/link";
import { getHardware } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Hardware Benchmarks",
  description:
    "Compare object detection model performance across different hardware configurations including A100, T4, Jetson, and more.",
};

export default function HardwarePage() {
  const hardware = getHardware();

  const categoryLabels: Record<string, string> = {
    cloud_gpu: "Cloud GPU",
    edge: "Edge Device",
    browser: "Browser",
    apple_silicon: "Apple Silicon",
    cpu: "CPU",
  };

  const categoryColors: Record<string, string> = {
    cloud_gpu: "bg-blue-500",
    edge: "bg-green-500",
    browser: "bg-purple-500",
    apple_silicon: "bg-gray-500",
    cpu: "bg-orange-500",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Hardware Benchmarks</h1>
      <p className="text-muted-foreground mb-8">
        Explore model performance across different hardware configurations
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hardware.map((hw) => (
          <Link key={hw.id} href={`/hardware/${hw.id}`}>
            <Card className="h-full hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant="secondary"
                    className={`${categoryColors[hw.category]} text-white`}
                  >
                    {categoryLabels[hw.category]}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{hw.displayName}</CardTitle>
                {hw.specs.gpuName && (
                  <CardDescription>{hw.specs.gpuName}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {hw.specs.vramGb && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VRAM</span>
                      <span className="font-mono">{hw.specs.vramGb} GB</span>
                    </div>
                  )}
                  {hw.specs.fp32Tflops && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FP32</span>
                      <span className="font-mono">{hw.specs.fp32Tflops} TFLOPS</span>
                    </div>
                  )}
                  {hw.specs.tdpWatts && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TDP</span>
                      <span className="font-mono">{hw.specs.tdpWatts}W</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            More hardware configurations will be added in future updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "Jetson AGX Orin",
              "Jetson Orin NX",
              "Hailo-8",
              "Apple M3",
              "WebGPU (Browser)",
            ].map((hw) => (
              <Badge key={hw} variant="outline">
                {hw}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
