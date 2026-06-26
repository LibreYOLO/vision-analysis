import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Github, FileText } from "lucide-react";
import {
  getModels,
  getAllFamilies,
  getModelById,
  getModelBenchmarks,
  getModelsByFamily,
  getHardwareById,
  getRuntimeById,
  getFamilyById,
  type ModelBenchmarkEntry,
} from "@/lib/data";
import { type FamilyMetadata, type ModelMetadata } from "@/lib/types";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent, formatMs } from "@/lib/utils/format";
import { libreyoloWeightsFile } from "@/lib/utils/libreyoloWeights";
import { siteConfig } from "@/config/site";
import { ModelStructuredData } from "@/components/seo/ModelStructuredData";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const models = getModels();
  const families = getAllFamilies();
  return [
    ...models.map((model) => ({ slug: model.id })),
    ...families.map((family) => ({ slug: family.id })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = getModelById(slug);
  if (!model) {
    const family = getFamilyById(slug);
    if (family) {
      const familyModels = getModelsByFamily(slug);
      const bestMap = familyModels.reduce((max, m) => Math.max(max, m.paperReportedMap ?? 0), 0);
      return {
        title: `${family.displayName} Benchmark Results`,
        description: `${family.displayName} by ${family.organization}. ${familyModels.length} variants benchmarked on COCO val2017 - up to ${bestMap}% mAP.`,
        openGraph: {
          title: `${family.displayName} | ${siteConfig.name}`,
          description: `Benchmark results for ${family.displayName} variants on COCO val2017`,
          type: "article",
        },
      };
    }
    return { title: "Model Not Found" };
  }

  return {
    title: `${model.displayName} Benchmark Results`,
    description: `${model.displayName} - ${model.specs.paramsM}M parameters, ${model.specs.flopsG} GFLOPs. See detailed benchmarks across hardware.`,
    // Advertise the LLM-ingestible markdown twin (invisible to humans).
    alternates: {
      types: {
        "text/markdown": `/model/${slug}/markdown`,
      },
    },
    openGraph: {
      title: `${model.displayName} | ${siteConfig.name}`,
      description: `Benchmark results for ${model.displayName} on COCO val2017`,
      type: "article",
    },
  };
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = getModelById(slug);

  if (!model) {
    const family = getFamilyById(slug);
    const rawFamilyModels = getModelsByFamily(slug);
    if (!family || rawFamilyModels.length === 0) {
      notFound();
      return null;
    }
    const familyModels = rawFamilyModels.sort((a, b) => a.specs.paramsM - b.specs.paramsM);
    const variantData = familyModels.map((m) => {
      const benches = getModelBenchmarks(m.id);
      const best = [...benches].sort(
        (a, b) => (b.result?.throughputFps ?? 0) - (a.result?.throughputFps ?? 0)
      )[0] ?? null;
      return {
        model: m,
        best,
        hwLabel: best ? (getHardwareById(best.hardware)?.displayName ?? best.hardware) : null,
        rtLabel: best ? (getRuntimeById(best.runtime)?.displayName ?? best.runtime) : null,
      };
    });
    return (
      <FamilyPage
        family={family}
        variantData={variantData}
        familyColor={getFamilyColor(family.id)}
      />
    );
  }

  const benchmarks = getModelBenchmarks(slug);
  const family = getFamilyById(model.family);
  const relatedModels = getModelsByFamily(model.family).filter(
    (m) => m.id !== model.id
  );

  const benchmarkWithTiming = benchmarks.find(
    (b) => b.result && b.result.preprocessMs > 0
  );

  // Best benchmark for stats card
  const bestBenchmark = benchmarks
    .filter((b) => b.result)
    .sort((a, b) => (b.result?.mAP_50_95 || 0) - (a.result?.mAP_50_95 || 0))[0];

  const familyColor = getFamilyColor(model.family);

  return (
    <>
      <ModelStructuredData model={model} family={family} benchmarks={benchmarks} />
      {/* Black Hero */}
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center text-sm text-white/50 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leaderboard
          </Link>

          {/* Model header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-white">{model.displayName}</h1>
                <span
                  className="inline-flex items-center h-6 px-2 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: familyColor }}
                >
                  {model.family}
                </span>
                {!model.inLibreYOLO && (
                  <span className="inline-flex items-center h-6 px-2 rounded text-xs font-medium bg-slate-700 text-slate-300">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-white/50">
                {model.architecture.type} detector with {model.architecture.backbone} backbone
              </p>
            </div>

            <div className="flex gap-2">
              {family?.paper.url && (
                <a
                  href={family.paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center h-9 px-3 rounded bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Paper
                </a>
              )}
              {family?.originalRepo && (
                <a
                  href={family.originalRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center h-9 px-3 rounded bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Code
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content zone - overlaps the hero */}
      <div className="-mt-16 mx-auto max-w-[1280px] px-4 pb-8">
        {/* Dark stats card (AA-style) */}
        <div className="bg-surface-dark-card rounded p-6 mb-6 grid grid-cols-2 md:grid-cols-5 gap-0">
          <StatCell
            label="Parameters"
            value={`${formatNumber(model.specs.paramsM, 1)}M`}
            borderRight
          />
          <StatCell
            label="GFLOPs"
            value={formatNumber(model.specs.flopsG, 1)}
            borderRight
          />
          <StatCell
            label="Input Size"
            value={`${model.specs.inputSizeDefault}px`}
            borderRight
          />
          <StatCell
            label="Best mAP"
            value={bestBenchmark?.result ? formatPercent(bestBenchmark.result.mAP_50_95) : "-"}
            borderRight
          />
          <StatCell
            label="License"
            value={model.license}
          />
        </div>

        {/* Architecture Details */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Architecture</h2>
          </div>
          <div className="section-group-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <SpecItem label="Type" value={model.architecture.type} />
              <SpecItem label="Backbone" value={model.architecture.backbone} />
              <SpecItem label="Neck" value={model.architecture.neck} />
              <SpecItem label="Head" value={model.architecture.head} />
            </div>
          </div>
        </div>

        {/* Benchmark Results */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Benchmark Results</h2>
            <p className="text-base text-foreground">
              Performance on COCO val2017 across different hardware configurations
            </p>
          </div>
          <div className="section-group-content">
            {benchmarks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-muted">
                      <th className="text-left px-3 py-2 font-medium text-foreground">Hardware</th>
                      <th className="text-left px-3 py-2 font-medium text-foreground">Runtime</th>
                      <th className="text-right px-3 py-2 font-medium text-foreground">mAP@50-95</th>
                      <th className="text-right px-3 py-2 font-medium text-foreground">FPS</th>
                      <th className="text-right px-3 py-2 font-medium text-foreground">Latency</th>
                      <th className="text-right px-3 py-2 font-medium text-foreground">VRAM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarks.map(({ hardware, runtime, coordinateKey, result }) => {
                      const hwMeta = getHardwareById(hardware);
                      const rtMeta = getRuntimeById(runtime);
                      return (
                        <tr key={coordinateKey} className="border-b border-border hover:bg-muted">
                          <td className="px-3 py-3 font-medium">{hwMeta?.displayName || hardware}</td>
                          <td className="px-3 py-3">{rtMeta?.displayName || runtime}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatPercent(result.mAP_50_95)}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatNumber(result.throughputFps, 1)}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatMs(result.totalMs)}</td>
                          <td className="px-3 py-3 text-right font-mono">
                            {result.peakVramMb > 0 ? `${formatNumber(result.peakVramMb, 0)} MB` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-2">No benchmarks yet</p>
                <p className="text-sm">This model has not been benchmarked with LibreYOLO. Benchmarks coming soon.</p>
              </div>
            )}
          </div>
        </div>

        {/* Speed Breakdown */}
        {benchmarkWithTiming?.result && (
          <div className="section-group">
            <div className="section-group-header">
              <h2>
                Speed Breakdown
                <span className="text-base font-normal text-muted-foreground ml-2">
                  ({getHardwareById(benchmarkWithTiming.hardware)?.displayName || benchmarkWithTiming.hardware})
                </span>
              </h2>
            </div>
            <div className="section-group-content">
              {(() => {
                const result = benchmarkWithTiming.result!;
                const total = result.totalMs;
                const preWidth = (result.preprocessMs / total) * 100;
                const infWidth = (result.inferenceMs / total) * 100;
                const postWidth = (result.postprocessMs / total) * 100;

                return (
                  <div className="space-y-4">
                    <div className="h-8 flex rounded-sm overflow-hidden">
                      <div
                        className="bg-blue-500 flex items-center justify-center text-white text-xs font-mono"
                        style={{ width: `${preWidth}%` }}
                      >
                        {result.preprocessMs.toFixed(1)}ms
                      </div>
                      <div
                        className="bg-brand flex items-center justify-center text-white text-xs font-mono"
                        style={{ width: `${infWidth}%` }}
                      >
                        {result.inferenceMs.toFixed(1)}ms
                      </div>
                      <div
                        className="bg-orange-500 flex items-center justify-center text-white text-xs font-mono"
                        style={{ width: `${postWidth}%` }}
                      >
                        {result.postprocessMs.toFixed(1)}ms
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-blue-500" />
                        <span className="text-muted-foreground">Preprocess</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-brand" />
                        <span className="text-muted-foreground">Inference</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-orange-500" />
                        <span className="text-muted-foreground">Postprocess (NMS)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Code Example */}
        {model.inLibreYOLO && libreyoloWeightsFile(model.family, model.variant) && (
          <div className="section-group">
            <div className="section-group-header">
              <h2>Usage with LibreYOLO</h2>
            </div>
            <div className="section-group-content">
              <pre className="bg-surface-dark-card text-white p-4 rounded text-sm overflow-x-auto font-mono">
                <code>{`from libreyolo import LibreYOLO

# Load model (auto-downloads from HuggingFace if not found locally)
model = LibreYOLO("${libreyoloWeightsFile(model.family, model.variant)}")

# Run inference
result = model("image.jpg", conf=0.25, iou=0.45)

# Process results
print(f"Found {len(result)} objects")
print(result.boxes.xyxy)   # bounding boxes (N, 4)
print(result.boxes.conf)   # confidence scores (N,)
print(result.boxes.cls)    # class IDs (N,)`}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Model metadata badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium bg-surface-muted text-muted-foreground">
            {model.detectionApproach}
          </span>
          <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium bg-surface-muted text-muted-foreground">
            {model.postprocessing}
          </span>
          {model.paperReportedMap && (
            <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium bg-brand-light text-brand">
              Paper: {model.paperReportedMap}% mAP
            </span>
          )}
        </div>

        {/* Related Models */}
        {relatedModels.length > 0 && (
          <div className="section-group">
            <div className="section-group-header">
              <h2>Related Models ({model.family})</h2>
            </div>
            <div className="section-group-content">
              <div className="flex flex-wrap gap-2">
                {relatedModels.map((related) => (
                  <Link
                    key={related.id}
                    href={`/model/${related.id}`}
                    className="inline-flex items-center h-9 px-4 rounded border border-border text-sm font-medium text-foreground hover:bg-brand-light hover:border-brand hover:text-brand transition-colors"
                  >
                    {related.displayName}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCell({
  label,
  value,
  borderRight = false,
}: {
  label: string;
  value: string;
  borderRight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 px-4 py-2 ${
        borderRight ? "border-r border-gray-700" : ""
      }`}
    >
      <span className="text-sm text-white/60">{label}</span>
      <span className="text-xl font-bold text-white">{value}</span>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function FamilyPage({
  family,
  variantData,
  familyColor,
}: {
  family: FamilyMetadata;
  variantData: Array<{
    model: ModelMetadata;
    best: ModelBenchmarkEntry | null;
    hwLabel: string | null;
    rtLabel: string | null;
  }>;
  familyColor: string;
}) {
  const paramNums = variantData.map((v) => v.model.specs.paramsM);
  const mapNums = variantData
    .filter((v) => v.model.paperReportedMap != null)
    .map((v) => v.model.paperReportedMap!);
  const firstModel = variantData[0].model;
  const anyInLibreYOLO = variantData.some((v) => v.model.inLibreYOLO);

  return (
    <>
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-white/50 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leaderboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-white">{family.displayName}</h1>
                <span
                  className="inline-flex items-center h-6 px-2 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: familyColor }}
                >
                  {family.id}
                </span>
                {anyInLibreYOLO && (
                  <span className="inline-flex items-center h-6 px-2 rounded text-xs font-medium bg-green-900 text-green-300">
                    In LibreYOLO
                  </span>
                )}
              </div>
              <p className="text-white/50">
                {family.organization} · {family.paper.venue}
              </p>
            </div>
            <div className="flex gap-2">
              {family.paper.url && (
                <a
                  href={family.paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center h-9 px-3 rounded bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Paper
                </a>
              )}
              {family.originalRepo && (
                <a
                  href={family.originalRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center h-9 px-3 rounded bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Code
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="-mt-16 mx-auto max-w-[1280px] px-4 pb-8">
        <div className="bg-surface-dark-card rounded p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-0">
          <StatCell label="Variants" value={`${variantData.length}`} borderRight />
          <StatCell
            label="Parameters"
            value={`${formatNumber(Math.min(...paramNums), 1)}M - ${formatNumber(Math.max(...paramNums), 1)}M`}
            borderRight
          />
          <StatCell
            label="Best Paper mAP"
            value={mapNums.length > 0 ? `${Math.max(...mapNums)}%` : "-"}
            borderRight
          />
          <StatCell label="License" value={firstModel.license} />
        </div>

        <div className="section-group">
          <div className="section-group-header">
            <h2>Model Variants</h2>
            <p className="text-base text-foreground">
              All variants benchmarked on COCO val2017. Click any variant for the full hardware breakdown.
            </p>
          </div>
          <div className="section-group-content">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted">
                    <th className="text-left px-3 py-2 font-medium text-foreground">Model</th>
                    <th className="text-right px-3 py-2 font-medium text-foreground">Params</th>
                    <th className="text-right px-3 py-2 font-medium text-foreground">GFLOPs</th>
                    <th className="text-right px-3 py-2 font-medium text-foreground">Paper mAP</th>
                    <th className="text-right px-3 py-2 font-medium text-foreground">Best FPS</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {variantData.map(({ model, best, hwLabel, rtLabel }) => (
                    <tr key={model.id} className="border-b border-border hover:bg-muted">
                      <td className="px-3 py-3">
                        <Link
                          href={`/model/${model.id}`}
                          className="font-medium text-foreground hover:text-brand"
                        >
                          {model.displayName}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatNumber(model.specs.paramsM, 1)}M
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatNumber(model.specs.flopsG, 1)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {model.paperReportedMap != null ? `${model.paperReportedMap}%` : "-"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {best ? (
                          <div>
                            <span className="font-mono">
                              {formatNumber(best.result.throughputFps, 0)} FPS
                            </span>
                            {hwLabel && (
                              <div className="text-xs text-muted-foreground">
                                {hwLabel}{rtLabel ? ` · ${rtLabel}` : ""}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/model/${model.id}`}
                          className="inline-flex items-center h-7 px-3 rounded border border-border text-xs font-medium text-foreground hover:bg-brand-light hover:border-brand hover:text-brand transition-colors"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="section-group">
          <div className="section-group-header">
            <h2>Architecture</h2>
          </div>
          <div className="section-group-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <SpecItem label="Type" value={firstModel.architecture.type} />
              <SpecItem label="Backbone" value={firstModel.architecture.backbone} />
              <SpecItem label="Neck" value={firstModel.architecture.neck} />
              <SpecItem label="Head" value={firstModel.architecture.head} />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium bg-surface-muted text-muted-foreground">
                {firstModel.detectionApproach}
              </span>
              <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium bg-surface-muted text-muted-foreground">
                {firstModel.postprocessing}
              </span>
              {family.trainingDataset && (
                <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium bg-surface-muted text-muted-foreground">
                  Trained on {family.trainingDataset}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
