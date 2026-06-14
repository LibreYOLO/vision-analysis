import { ModelMetadata, FamilyMetadata, BenchmarkResult } from "@/lib/types";
import { siteConfig } from "@/config/site";
import { LIBREYOLO } from "@/config/libreyolo";

/**
 * Markdown twin of a model page — the clean, LLM-ingestible version served at
 * /model/[slug]/markdown and advertised via <link rel="alternate">. Pure /
 * client-safe (no fs); the route resolves hardware/runtime labels and passes
 * them in.
 */

export interface ModelBenchRow {
  hardwareLabel: string;
  runtimeLabel: string;
  result: BenchmarkResult;
}

/** Replicates the page's "Usage with LibreYOLO" weights filename. */
export function libreyoloWeightsFile(model: ModelMetadata): string {
  if (model.family === "yolox") return `libreyoloX${model.variant}.pt`;
  if (model.family === "yolov9") return `libreyolo9${model.variant}.pt`;
  return `libre${model.family}${model.variant}.pth`;
}

function fmt(n: number, d = 1): string {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

export function buildModelMarkdown(
  model: ModelMetadata,
  family: FamilyMetadata | undefined,
  rows: ModelBenchRow[]
): string {
  const url = siteConfig.url.replace(/\/$/, "");
  const availability = model.inLibreYOLO
    ? `Available in ${LIBREYOLO.name}, the ${LIBREYOLO.libraryLicense}-licensed open-source library (free for commercial use).`
    : `Planned for ${LIBREYOLO.name} (not yet packaged).`;

  const facts = [
    `- Family: ${family?.displayName ?? model.family}${family?.organization ? ` (${family.organization})` : ""}`,
    `- Parameters: ${fmt(model.specs.paramsM)}M`,
    `- GFLOPs: ${fmt(model.specs.flopsG)}`,
    `- Default input size: ${model.specs.inputSizeDefault}px`,
    `- Detection: ${model.detectionApproach} · ${model.postprocessing}`,
    `- Architecture: ${model.architecture.type} · ${model.architecture.backbone} backbone`,
    `- Weight license: ${model.license}`,
    model.paperReportedMap ? `- Paper-reported mAP@50-95: ${model.paperReportedMap}%` : null,
    family?.paper?.url ? `- Paper: ${family.paper.url}` : null,
    family?.originalRepo ? `- Original code: ${family.originalRepo}` : null,
  ].filter(Boolean);

  let benchSection: string;
  if (rows.length > 0) {
    const header =
      "| Hardware | Runtime | mAP@50-95 | FPS | Latency (ms) | VRAM (MB) |\n|---|---|---|---|---|---|";
    const body = rows
      .map((r) => {
        const v = r.result;
        const vram = v.peakVramMb > 0 ? fmt(v.peakVramMb, 0) : "—";
        return `| ${r.hardwareLabel} | ${r.runtimeLabel} | ${fmt(v.mAP_50_95)} | ${fmt(v.throughputFps)} | ${fmt(v.totalMs)} | ${vram} |`;
      })
      .join("\n");
    benchSection = `## Benchmarks (COCO val2017)\n\n${header}\n${body}`;
  } else {
    benchSection = `## Benchmarks (COCO val2017)\n\nNot yet benchmarked.`;
  }

  const usage = model.inLibreYOLO
    ? `## Usage with ${LIBREYOLO.name}\n\n\`\`\`python\nfrom libreyolo import LIBREYOLO\n\nmodel = LIBREYOLO("${libreyoloWeightsFile(model)}")\nresult = model("image.jpg", conf=0.25, iou=0.45)\n\`\`\``
    : "";

  return [
    `# ${model.displayName}`,
    "",
    `> ${model.displayName}: ${model.architecture.type} object detector from the ${family?.displayName ?? model.family} family. ${availability}`,
    "",
    facts.join("\n"),
    "",
    benchSection,
    usage ? "\n" + usage : "",
    "",
    `Source: ${url}/model/${model.id} — benchmarks produced with ${LIBREYOLO.name} (${LIBREYOLO.github}).`,
    "",
  ].join("\n");
}
