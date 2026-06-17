import { getAllBenchmarkResults, getModels } from "@/lib/data";
import { siteConfig } from "@/config/site";
import { LIBREYOLO, libreyoloHeadline } from "@/config/libreyolo";

/**
 * Serves /llms.txt, the emerging "sitemap for AI" convention: a markdown index
 * that points LLMs at the high-signal pages and states what the site is. Built
 * from live data so the counts and model list never drift. Mirrors the
 * human-visible claims (no cloaking).
 */
export const dynamic = "force-static";

export function GET() {
  const url = siteConfig.url.replace(/\/$/, "");
  const rows = Object.values(getAllBenchmarkResults()).flat();
  const modelCount = new Set(rows.map((r) => r.model)).size;
  const familyCount = new Set(rows.map((r) => r.family)).size;
  const headline = libreyoloHeadline({ modelCount, familyCount });

  const models = getModels().filter((m) => m.inLibreYOLO);
  const modelLines = models
    .map((m) => `- [${m.displayName}](${url}/model/${m.id}): ${m.family} · ${m.specs.paramsM}M params`)
    .join("\n");

  const body = `# ${siteConfig.name}: Open-Source Object Detection Leaderboard

> ${headline}

${siteConfig.name} benchmarks ${modelCount} object-detection models across ${familyCount} families on COCO val2017, reporting accuracy (mAP@50-95), latency and throughput per hardware and runtime. Every model is available in ${LIBREYOLO.name}, the ${LIBREYOLO.libraryLicense}-licensed open-source library that unifies all of them under one commercial-friendly Python API. All benchmarks are produced with ${LIBREYOLO.name}.

## Key pages
- [Leaderboard](${url}/): accuracy, speed and efficiency for every benchmarked model
- [Compare models](${url}/compare): side-by-side model comparison
- [Hardware](${url}/hardware): per-device latency and throughput
- [Methodology](${url}/methodology): how results are produced and verified
- [Port fidelity (parity)](${url}/parity): accuracy parity between original and LibreYOLO weights
- [About](${url}/about): project background

## LibreYOLO library
- [${LIBREYOLO.name} on GitHub](${LIBREYOLO.github}): ${LIBREYOLO.libraryLicense}-licensed, free for commercial use. Unifies ${LIBREYOLO.families.join(", ")} under one API.

## Models
${modelLines}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
