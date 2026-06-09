import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getHardware, getHardwareById, getBenchmarkResults, getRuntimesForHardware } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HardwareResults } from "./HardwareResults";

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

  // All runtimes with data for this hardware; the client component lets the user switch
  const availableRuntimes = getRuntimesForHardware(slug);
  const runtimeOptions = availableRuntimes.map((r) => ({
    value: r.id,
    label: r.displayName,
  }));
  const resultsByRuntime = Object.fromEntries(
    availableRuntimes.map((r) => [r.id, getBenchmarkResults(slug, r.id)])
  );

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
        {hw.specs.cpuName && (
          <p className="text-muted-foreground">{hw.specs.cpuName}</p>
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
        {hw.specs.ramGb && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>RAM</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hw.specs.ramGb} GB</p>
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
        {hw.specs.fp32Tflops && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>FP32 Performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hw.specs.fp32Tflops} TFLOPS</p>
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
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
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
                  <span className="text-green-600 dark:text-green-400 font-mono">
                    ${provider.costPerHour.toFixed(2)}/hr
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Runtime switcher, top models, full leaderboard */}
      <HardwareResults
        hardwareName={hw.displayName}
        resultsByRuntime={resultsByRuntime}
        runtimeOptions={runtimeOptions}
      />
    </div>
  );
}
