#!/usr/bin/env npx tsx
/**
 * Draft Article Generator — Step 1 of the article pipeline
 *
 * Generates a data-only HTML comparison article from benchmark data.
 * No LLM involved — pure numbers, tables, and structured layout.
 *
 * Usage:
 *   npx tsx scripts/generate-draft.ts yolov9t yolox-s
 *   npx tsx scripts/generate-draft.ts yolov9c yolox-m --hardware a100
 *
 * Output:
 *   public/articles/draft-{modelA}-vs-{modelB}.html
 *
 * Step 2 (not implemented yet):
 *   Feed the draft to an LLM to write narrative prose, analysis, and FAQs.
 */

import * as fs from "fs";
import * as path from "path";

// ---------- Data loading ----------

const DATA_DIR = path.join(__dirname, "../src/data/metadata");
const BENCH_DIR = path.join(__dirname, "../benchmarks");

interface ModelMeta {
  id: string;
  displayName: string;
  family: string;
  variant: string;
  task: string;
  architecture: { type: string; backbone: string; neck: string; head: string };
  detectionApproach: string;
  postprocessing: string;
  specs: { paramsM: number; flopsG: number; inputSizeDefault: number; numClasses: number };
  paperReportedMap?: number;
  source: { originalWeightsUrl?: string; libreyoloWeightsUrl?: string };
  license: string;
  releaseDate: string;
  inLibreYOLO: boolean;
}

interface FamilyMeta {
  id: string;
  displayName: string;
  organization: string;
  paper: { title: string; authors: string[]; venue: string; url: string };
  originalRepo: string;
  trainingDataset: string;
}

interface BenchResult {
  model: string;
  mAP_50_95: number;
  mAP_50: number;
  precision?: number;
  recall?: number;
  throughputFps: number;
  totalMs: number;
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
  paramsM: number;
  flopsG: number;
  mAPPerGflop: number;
}

function loadModels(): ModelMeta[] {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "models.json"), "utf8")).models;
}

function loadFamilies(): FamilyMeta[] {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "families.json"), "utf8")).families;
}

function loadBenchmarks(hardware: string): Map<string, BenchResult> {
  const results = new Map<string, BenchResult>();
  const files = fs.readdirSync(BENCH_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(BENCH_DIR, file), "utf8"));

    // Detect hardware from file or content
    const gpuName = (raw.hardware?.gpu_name || raw.hardware?.cpu_name || "").toLowerCase();
    const isTarget =
      (hardware === "a100" && (gpuName.includes("a100") || file.includes("benchmark"))) ||
      (hardware === "rpi5" && (gpuName.includes("raspberry") || file.includes("rpi5")));

    if (!isTarget) continue;

    const modelName = (raw.model?.name || "").toLowerCase().replace(/-/g, "").replace(/\s/g, "");
    const mAP = raw.accuracy?.mAP_50_95 ?? 0;
    const mAP50 = raw.accuracy?.mAP_50 ?? 0;

    // Handle timing formats
    let totalMs = 0, preMs = 0, infMs = 0, postMs = 0;
    if (raw.timing?.ms_per_image) {
      totalMs = raw.timing.ms_per_image;
      preMs = raw.timing.preprocess_ms ?? 0;
      infMs = raw.timing.inference_ms ?? 0;
      postMs = raw.timing.postprocess_ms ?? 0;
    } else if (raw.timing?.total?.mean) {
      totalMs = raw.timing.total.mean;
      preMs = raw.timing.preprocess?.mean ?? 0;
      infMs = raw.timing.inference?.mean ?? 0;
      postMs = raw.timing.postprocess?.mean ?? 0;
    }

    const fps = raw.throughput?.fps ?? raw.throughput?.fps_mean ?? (totalMs > 0 ? 1000 / totalMs : 0);
    const paramsM = raw.model_stats?.params_millions ?? 0;
    const flopsG = raw.model_stats?.gflops ?? 0;

    results.set(modelName, {
      model: raw.model?.name || file,
      mAP_50_95: mAP > 1 ? mAP : mAP * 100,
      mAP_50: mAP50 > 1 ? mAP50 : mAP50 * 100,
      precision: raw.accuracy?.precision ? (raw.accuracy.precision > 1 ? raw.accuracy.precision : raw.accuracy.precision * 100) : undefined,
      recall: raw.accuracy?.recall ? (raw.accuracy.recall > 1 ? raw.accuracy.recall : raw.accuracy.recall * 100) : undefined,
      throughputFps: fps,
      totalMs,
      preprocessMs: preMs,
      inferenceMs: infMs,
      postprocessMs: postMs,
      paramsM,
      flopsG,
      mAPPerGflop: flopsG > 0 ? (mAP > 1 ? mAP : mAP * 100) / flopsG : 0,
    });
  }

  return results;
}

// ---------- Helpers ----------

function winner(a: number, b: number, lowerBetter = false): "a" | "b" | "tie" {
  if (Math.abs(a - b) < 0.01) return "tie";
  return lowerBetter ? (a < b ? "a" : "b") : (a > b ? "a" : "b");
}

function fmt(n: number, d = 1): string {
  return n.toFixed(d);
}

function wClass(w: "a" | "b" | "tie", side: "a" | "b"): string {
  return w === side ? ' class="wg"' : "";
}

function findModel(models: ModelMeta[], id: string): ModelMeta | undefined {
  const normalized = id.toLowerCase().replace(/-/g, "");
  return models.find((m) => m.id.toLowerCase().replace(/-/g, "") === normalized);
}

function findBench(benchmarks: Map<string, BenchResult>, id: string): BenchResult | undefined {
  const normalized = id.toLowerCase().replace(/-/g, "").replace(/\s/g, "");
  return benchmarks.get(normalized);
}

// ---------- HTML Generation ----------

function generateDraft(
  modelA: ModelMeta,
  modelB: ModelMeta,
  familyA: FamilyMeta,
  familyB: FamilyMeta,
  benchA: BenchResult | undefined,
  benchB: BenchResult | undefined,
  hardware: string
): string {
  const hwName = hardware === "a100" ? "NVIDIA A100" : hardware === "rpi5" ? "Raspberry Pi 5" : hardware;
  const date = new Date().toISOString().split("T")[0];
  const hasData = benchA && benchB;

  // Compute deltas if we have data
  const mapDelta = hasData ? benchB.mAP_50_95 - benchA.mAP_50_95 : 0;
  const fpsDelta = hasData ? benchB.throughputFps / benchA.throughputFps : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${modelA.displayName} vs ${modelB.displayName} Benchmark on ${hwName} | Vision Analysis</title>
    <meta name="description" content="${modelA.displayName} vs ${modelB.displayName} benchmark on ${hwName}. ${hasData ? `${benchA!.mAP_50_95 > benchB!.mAP_50_95 ? modelA.displayName : modelB.displayName} achieves ${fmt(Math.max(benchA!.mAP_50_95, benchB!.mAP_50_95))} mAP@50-95.` : "Benchmark data pending."} COCO val2017 results with LibreYOLO.">
    <link href="https://fonts.googleapis.com/css2?family=M+PLUS+2:wght@400;600;700;800&display=swap" rel="stylesheet">
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "${modelA.displayName} vs ${modelB.displayName}: Benchmark Comparison on ${hwName}",
        "author": {"@type": "Organization", "name": "Vision Analysis", "url": "https://visionanalysis.ai"},
        "datePublished": "${date}"
    }
    </script>
    <style>
        :root{--bg:#fafafa;--s:#ffffff;--s2:#f1f5f9;--b:#e2e8f0;--t:#04090b;--tm:#64748b;--g:#4f46e5;--gd:rgba(79,70,229,0.08);--bl:#22c55e;--bld:rgba(34,197,94,0.08)}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'M PLUS 2',Inter,-apple-system,sans-serif;background:var(--bg);color:var(--t);line-height:1.75}
        nav{position:sticky;top:0;z-index:100;background:#000;padding:.7rem 2rem;display:flex;align-items:center;justify-content:space-between}
        .brand{font-weight:700;color:#fff;text-decoration:none}.brand span{color:#818cf8}
        .links{display:flex;gap:1.5rem}.links a{color:rgba(255,255,255,0.6);text-decoration:none;font-size:.85rem}
        article{max-width:800px;margin:0 auto;padding:3rem 1.5rem 5rem}
        .bc{font-size:.78rem;color:var(--tm);margin-bottom:2rem}.bc a{color:var(--g);text-decoration:none}
        h1{font-size:2rem;font-weight:800;line-height:1.2;margin-bottom:.5rem;letter-spacing:-.02em}
        .meta{color:var(--tm);font-size:.85rem;margin-bottom:2rem}
        .meta a{color:var(--g);text-decoration:none}
        .summary{font-size:1rem;line-height:1.85;margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid var(--b)}
        .summary strong{color:var(--g)}
        .provenance{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:2rem}
        .prov-card{background:var(--s);border:1px solid var(--b);border-radius:10px;padding:1rem 1.25rem}
        .prov-card .model-name{font-size:1.1rem;font-weight:700;margin-bottom:.5rem}
        .prov-card .model-name.a{color:var(--g)}.prov-card .model-name.b{color:var(--bl)}
        .prov-card .detail{font-size:.8rem;color:var(--tm);line-height:1.6}
        .prov-card .detail a{color:var(--g);text-decoration:none}
        .prov-card .detail .label{color:var(--tm);font-weight:600}
        .kf{background:var(--s);border:1px solid var(--b);border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:2rem}
        .kf .kf-title{font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--tm);margin-bottom:.75rem}
        .kf dl{display:grid;grid-template-columns:auto 1fr;gap:.3rem 1rem;font-size:.9rem}
        .kf dt{color:var(--tm)}.kf dd{font-weight:600}
        .kf dd .w{color:var(--g)}
        h2{font-size:1.3rem;font-weight:700;margin:2.5rem 0 1rem;color:var(--g)}
        p{margin-bottom:1rem;font-size:.95rem}
        .tw{overflow-x:auto;margin:1.25rem 0;border-radius:8px;border:1px solid var(--b)}
        table{width:100%;border-collapse:collapse;font-size:.88rem}
        thead{background:var(--s2)}
        th{padding:.6rem .85rem;text-align:left;font-weight:600;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--tm);border-bottom:1px solid var(--b)}
        td{padding:.55rem .85rem;border-bottom:1px solid var(--b)}tr:last-child td{border-bottom:none}
        .wg{color:var(--g);font-weight:600}
        .no-data{background:var(--s2);border:1px solid var(--b);border-radius:10px;padding:2rem;text-align:center;color:var(--tm);margin:1.25rem 0}
        .insight{background:var(--gd);border-left:3px solid var(--g);padding:.75rem 1.25rem;margin:1.25rem 0;font-size:.92rem}
        .insight strong{color:var(--g)}
        .code{background:#111827;border-radius:10px;padding:1.25rem 1.5rem;margin:1.25rem 0;color:#e4e4f0}
        .code-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
        .code-t{font-size:.72rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
        .badge{font-size:.65rem;background:var(--gd);color:var(--g);padding:.15rem .5rem;border-radius:12px;font-weight:600}
        pre{font-family:'JetBrains Mono','SF Mono',monospace;font-size:.83rem;line-height:1.6;overflow-x:auto;color:#e2e8f0}
        .c{color:#94a3b8}.k{color:#a78bfa}.s{color:#4ade80}.f{color:#60a5fa}
        .cta{background:linear-gradient(135deg,var(--gd),var(--bld));border:1px solid #c7d2fe;border-radius:12px;padding:2rem;margin:2.5rem 0;text-align:center}
        .cta h3{font-size:1.15rem;margin-bottom:.4rem}.cta p{color:var(--tm);font-size:.88rem;margin-bottom:1rem}
        .btn{display:inline-block;background:var(--g);color:#fff;font-weight:700;font-size:.88rem;padding:.6rem 1.4rem;border-radius:7px;text-decoration:none}
        .meth{font-size:.78rem;color:var(--tm);line-height:1.65;margin-top:2.5rem;padding-top:1.25rem;border-top:1px solid var(--b)}
        .meth a{color:var(--g);text-decoration:none}
        footer{max-width:800px;margin:0 auto;padding:2rem 1.5rem;font-size:.78rem;color:var(--tm);display:flex;justify-content:space-between}
        footer a{color:var(--g);text-decoration:none}
        /* DRAFT BANNER */
        .draft-banner{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:.75rem 1.25rem;margin-bottom:2rem;font-size:.85rem;color:#92400e}
        .draft-banner strong{color:#d97706}
    </style>
</head>
<body>
<nav><a href="/" class="brand"><span>Vision</span>Analysis</a><div class="links"><a href="/compare">Compare</a><a href="/articles">Articles</a><a href="https://libreyolo.org">LibreYOLO</a></div></nav>
<article>
    <div class="bc"><a href="/">Home</a> / <a href="/articles">Articles</a> / ${modelA.displayName} vs ${modelB.displayName}</div>

    <div class="draft-banner">
        <strong>DRAFT — Step 1 (Data Only)</strong><br>
        This article was auto-generated from benchmark data. Narrative prose, analysis, and FAQs will be added in Step 2 (LLM enrichment).
    </div>

    <h1>${modelA.displayName} vs ${modelB.displayName}: Benchmark on ${hwName}</h1>
    <p class="meta">COCO val2017 · ${modelA.specs.numClasses} classes · PyTorch FP32 · ${date} · Benchmarked with <a href="https://libreyolo.org">LibreYOLO</a></p>

    <p class="summary">
${hasData ? `        <strong>${benchA!.mAP_50_95 > benchB!.mAP_50_95 ? modelA.displayName : modelB.displayName} achieves ${fmt(Math.max(benchA!.mAP_50_95, benchB!.mAP_50_95))} mAP@50-95</strong> while <strong>${benchA!.mAP_50_95 > benchB!.mAP_50_95 ? modelB.displayName : modelA.displayName} achieves ${fmt(Math.min(benchA!.mAP_50_95, benchB!.mAP_50_95))} mAP@50-95</strong> on ${hwName}.
        ${modelA.displayName} has ${fmt(modelA.specs.paramsM)}M parameters (${fmt(modelA.specs.flopsG)}G FLOPs), ${modelB.displayName} has ${fmt(modelB.specs.paramsM)}M parameters (${fmt(modelB.specs.flopsG)}G FLOPs).`
: `        Benchmark data not yet available for both models on ${hwName}. Specs: ${modelA.displayName} has ${fmt(modelA.specs.paramsM)}M params, ${modelB.displayName} has ${fmt(modelB.specs.paramsM)}M params.`}
    </p>

    <!-- Provenance cards -->
    <div class="provenance">
        <div class="prov-card">
            <div class="model-name a">${modelA.displayName}</div>
            <div class="detail">
                <span class="label">Paper:</span> <a href="${familyA.paper.url}">${familyA.paper.title}</a><br>
                <span class="label">Authors:</span> ${familyA.paper.authors.join(", ")}<br>
                <span class="label">Venue:</span> ${familyA.paper.venue}<br>
                <span class="label">Organization:</span> ${familyA.organization}<br>
                <span class="label">Repo:</span> <a href="${familyA.originalRepo}">${familyA.originalRepo.replace("https://github.com/", "")}</a><br>
                <span class="label">Approach:</span> ${modelA.detectionApproach} · ${modelA.postprocessing}<br>
                <span class="label">License:</span> ${modelA.license}
                ${modelA.paperReportedMap ? `<br><span class="label">Paper mAP:</span> ${modelA.paperReportedMap}%` : ""}
            </div>
        </div>
        <div class="prov-card">
            <div class="model-name b">${modelB.displayName}</div>
            <div class="detail">
                <span class="label">Paper:</span> <a href="${familyB.paper.url}">${familyB.paper.title}</a><br>
                <span class="label">Authors:</span> ${familyB.paper.authors.join(", ")}<br>
                <span class="label">Venue:</span> ${familyB.paper.venue}<br>
                <span class="label">Organization:</span> ${familyB.organization}<br>
                <span class="label">Repo:</span> <a href="${familyB.originalRepo}">${familyB.originalRepo.replace("https://github.com/", "")}</a><br>
                <span class="label">Approach:</span> ${modelB.detectionApproach} · ${modelB.postprocessing}<br>
                <span class="label">License:</span> ${modelB.license}
                ${modelB.paperReportedMap ? `<br><span class="label">Paper mAP:</span> ${modelB.paperReportedMap}%` : ""}
            </div>
        </div>
    </div>

${hasData ? `    <!-- Key Facts -->
    <div class="kf">
        <div class="kf-title">Key Facts</div>
        <dl>
            <dt>Best mAP@50-95</dt><dd><span class="w">${winner(benchA!.mAP_50_95, benchB!.mAP_50_95) === "a" ? modelA.displayName : modelB.displayName}: ${fmt(Math.max(benchA!.mAP_50_95, benchB!.mAP_50_95))}</span> (vs ${fmt(Math.min(benchA!.mAP_50_95, benchB!.mAP_50_95))})</dd>
            <dt>Best FPS</dt><dd><span class="w">${winner(benchA!.throughputFps, benchB!.throughputFps) === "a" ? modelA.displayName : modelB.displayName}: ${fmt(Math.max(benchA!.throughputFps, benchB!.throughputFps))}</span> (vs ${fmt(Math.min(benchA!.throughputFps, benchB!.throughputFps))})</dd>
            <dt>Fewest params</dt><dd><span class="w">${winner(modelA.specs.paramsM, modelB.specs.paramsM, true) === "a" ? modelA.displayName : modelB.displayName}: ${fmt(Math.min(modelA.specs.paramsM, modelB.specs.paramsM))}M</span> (vs ${fmt(Math.max(modelA.specs.paramsM, modelB.specs.paramsM))}M)</dd>
            <dt>Best mAP/GFLOP</dt><dd><span class="w">${winner(benchA!.mAPPerGflop, benchB!.mAPPerGflop) === "a" ? modelA.displayName : modelB.displayName}: ${fmt(Math.max(benchA!.mAPPerGflop, benchB!.mAPPerGflop))}</span> (vs ${fmt(Math.min(benchA!.mAPPerGflop, benchB!.mAPPerGflop))})</dd>
            <dt>Training data</dt><dd>${familyA.trainingDataset}</dd>
        </dl>
    </div>

    <h2>Accuracy</h2>
    <!-- LLM: Write analysis paragraph here -->
    <div class="tw"><table><thead><tr><th>Metric</th><th>${modelA.displayName}</th><th>${modelB.displayName}</th><th>Delta</th></tr></thead><tbody>
        <tr><td>mAP@50-95</td><td${wClass(winner(benchA!.mAP_50_95, benchB!.mAP_50_95), "a")}>${fmt(benchA!.mAP_50_95)}</td><td${wClass(winner(benchA!.mAP_50_95, benchB!.mAP_50_95), "b")}>${fmt(benchB!.mAP_50_95)}</td><td>${mapDelta > 0 ? "+" : ""}${fmt(mapDelta)}</td></tr>
        <tr><td>mAP@50</td><td${wClass(winner(benchA!.mAP_50, benchB!.mAP_50), "a")}>${fmt(benchA!.mAP_50)}</td><td${wClass(winner(benchA!.mAP_50, benchB!.mAP_50), "b")}>${fmt(benchB!.mAP_50)}</td><td>${fmt(benchB!.mAP_50 - benchA!.mAP_50, 1)}</td></tr>
${benchA!.precision !== undefined && benchB!.precision !== undefined ? `        <tr><td>Precision</td><td${wClass(winner(benchA!.precision!, benchB!.precision!), "a")}>${fmt(benchA!.precision!)}%</td><td${wClass(winner(benchA!.precision!, benchB!.precision!), "b")}>${fmt(benchB!.precision!)}%</td><td>${fmt(benchB!.precision! - benchA!.precision!)}%</td></tr>
        <tr><td>Recall</td><td${wClass(winner(benchA!.recall!, benchB!.recall!), "a")}>${fmt(benchA!.recall!)}%</td><td${wClass(winner(benchA!.recall!, benchB!.recall!), "b")}>${fmt(benchB!.recall!)}%</td><td>${fmt(benchB!.recall! - benchA!.recall!)}%</td></tr>` : ""}
    </tbody></table></div>
    <div class="insight"><!-- LLM: Write accuracy insight here --><strong>Insight placeholder:</strong> Analysis of accuracy differences to be written by LLM in Step 2.</div>

    <h2>Speed &amp; Latency</h2>
    <!-- LLM: Write speed analysis here -->
    <div class="tw"><table><thead><tr><th>Metric</th><th>${modelA.displayName}</th><th>${modelB.displayName}</th></tr></thead><tbody>
        <tr><td>FPS (mean)</td><td${wClass(winner(benchA!.throughputFps, benchB!.throughputFps), "a")}>${fmt(benchA!.throughputFps)}</td><td${wClass(winner(benchA!.throughputFps, benchB!.throughputFps), "b")}>${fmt(benchB!.throughputFps)}</td></tr>
        <tr><td>Total latency</td><td${wClass(winner(benchA!.totalMs, benchB!.totalMs, true), "a")}>${fmt(benchA!.totalMs)} ms</td><td${wClass(winner(benchA!.totalMs, benchB!.totalMs, true), "b")}>${fmt(benchB!.totalMs)} ms</td></tr>
${benchA!.preprocessMs > 0 ? `        <tr><td>Preprocess</td><td>${fmt(benchA!.preprocessMs)} ms</td><td>${fmt(benchB!.preprocessMs)} ms</td></tr>
        <tr><td>Inference</td><td>${fmt(benchA!.inferenceMs)} ms</td><td>${fmt(benchB!.inferenceMs)} ms</td></tr>
        <tr><td>Postprocess</td><td>${fmt(benchA!.postprocessMs)} ms</td><td>${fmt(benchB!.postprocessMs)} ms</td></tr>` : ""}
    </tbody></table></div>
    <div class="insight"><!-- LLM: Write speed insight here --><strong>Insight placeholder:</strong> Speed analysis to be written by LLM in Step 2.</div>

    <h2>Efficiency</h2>
    <!-- LLM: Write efficiency analysis here -->
    <div class="tw"><table><thead><tr><th>Metric</th><th>${modelA.displayName}</th><th>${modelB.displayName}</th></tr></thead><tbody>
        <tr><td>Parameters</td><td${wClass(winner(modelA.specs.paramsM, modelB.specs.paramsM, true), "a")}>${fmt(modelA.specs.paramsM)}M</td><td${wClass(winner(modelA.specs.paramsM, modelB.specs.paramsM, true), "b")}>${fmt(modelB.specs.paramsM)}M</td></tr>
        <tr><td>GFLOPs</td><td${wClass(winner(modelA.specs.flopsG, modelB.specs.flopsG, true), "a")}>${fmt(modelA.specs.flopsG)}</td><td${wClass(winner(modelA.specs.flopsG, modelB.specs.flopsG, true), "b")}>${fmt(modelB.specs.flopsG)}</td></tr>
        <tr><td>mAP / GFLOP</td><td${wClass(winner(benchA!.mAPPerGflop, benchB!.mAPPerGflop), "a")}>${fmt(benchA!.mAPPerGflop, 2)}</td><td${wClass(winner(benchA!.mAPPerGflop, benchB!.mAPPerGflop), "b")}>${fmt(benchB!.mAPPerGflop, 2)}</td></tr>
    </tbody></table></div>` : `    <div class="no-data">
        <strong>Benchmark data not available</strong><br>
        One or both models have not been benchmarked on ${hwName} yet. Run benchmarks with LibreYOLO to generate data.
    </div>

    <!-- Specs comparison (always available from metadata) -->
    <h2>Model Specs</h2>
    <div class="tw"><table><thead><tr><th>Spec</th><th>${modelA.displayName}</th><th>${modelB.displayName}</th></tr></thead><tbody>
        <tr><td>Parameters</td><td>${fmt(modelA.specs.paramsM)}M</td><td>${fmt(modelB.specs.paramsM)}M</td></tr>
        <tr><td>GFLOPs</td><td>${fmt(modelA.specs.flopsG)}</td><td>${fmt(modelB.specs.flopsG)}</td></tr>
        <tr><td>Input size</td><td>${modelA.specs.inputSizeDefault}px</td><td>${modelB.specs.inputSizeDefault}px</td></tr>
        <tr><td>Detection</td><td>${modelA.detectionApproach}</td><td>${modelB.detectionApproach}</td></tr>
        <tr><td>Post-processing</td><td>${modelA.postprocessing}</td><td>${modelB.postprocessing}</td></tr>
        <tr><td>License</td><td>${modelA.license}</td><td>${modelB.license}</td></tr>
        ${modelA.paperReportedMap ? `<tr><td>Paper mAP@50-95</td><td>${modelA.paperReportedMap}%</td><td>${modelB.paperReportedMap ?? "—"}%</td></tr>` : ""}
    </tbody></table></div>`}

    <h2>Frequently Asked Questions</h2>
    <p class="no-data" style="text-align:left;background:var(--gd)"><!-- LLM: Generate 4-5 FAQs in Step 2 based on the data above --><strong>FAQ placeholder</strong> — To be generated by LLM in Step 2.</p>

    <h2>Try Both Models</h2>
    <div class="code">
        <div class="code-h"><span class="code-t">Quick start</span><span class="badge">LibreYOLO</span></div>
<pre><span class="k">from</span> libreyolo <span class="k">import</span> <span class="f">LibreYOLO</span>

<span class="c"># ${modelA.displayName} — ${modelA.architecture.backbone}, ${fmt(modelA.specs.paramsM)}M params</span>
model = <span class="f">LibreYOLO</span>(<span class="s">"${modelA.id}"</span>)
results = model(<span class="s">"image.jpg"</span>)

<span class="c"># ${modelB.displayName} — ${modelB.architecture.backbone}, ${fmt(modelB.specs.paramsM)}M params</span>
model = <span class="f">LibreYOLO</span>(<span class="s">"${modelB.id}"</span>)
results = model(<span class="s">"image.jpg"</span>)</pre>
    </div>

    <div class="cta"><h3>Run your own benchmarks</h3><p>LibreYOLO is open-source. Reproduce any result on this page.</p><a href="https://libreyolo.org" class="btn">Get started with LibreYOLO</a></div>

    <div class="meth">
        <strong>Methodology.</strong> Benchmarked with <a href="https://libreyolo.org">LibreYOLO</a> on ${hwName}. Evaluation: COCO val2017 (5,000 images), ${modelA.specs.inputSizeDefault}×${modelA.specs.inputSizeDefault} input, batch size 1, PyTorch FP32.
        <br>Source: <a href="https://visionanalysis.ai">visionanalysis.ai</a>
    </div>
</article>
<footer><span>&copy; ${new Date().getFullYear()} Vision Analysis</span><a href="https://libreyolo.org">Powered by LibreYOLO</a></footer>
</body></html>`;
}

// ---------- Main ----------

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/generate-draft.ts <modelA> <modelB> [--hardware a100]");
    console.error("Example: npx tsx scripts/generate-draft.ts yolov9t yolox-s");
    process.exit(1);
  }

  const idA = args[0];
  const idB = args[1];
  const hwFlag = args.indexOf("--hardware");
  const hardware = hwFlag >= 0 && args[hwFlag + 1] ? args[hwFlag + 1] : "a100";

  const models = loadModels();
  const families = loadFamilies();

  const modelA = findModel(models, idA);
  const modelB = findModel(models, idB);

  if (!modelA) { console.error(`Model not found: ${idA}`); process.exit(1); }
  if (!modelB) { console.error(`Model not found: ${idB}`); process.exit(1); }

  const familyA = families.find((f) => f.id === modelA.family);
  const familyB = families.find((f) => f.id === modelB.family);

  if (!familyA) { console.error(`Family not found: ${modelA.family}`); process.exit(1); }
  if (!familyB) { console.error(`Family not found: ${modelB.family}`); process.exit(1); }

  const benchmarks = loadBenchmarks(hardware);
  const benchA = findBench(benchmarks, modelA.id);
  const benchB = findBench(benchmarks, modelB.id);

  if (!benchA) console.warn(`Warning: No benchmark data for ${modelA.id} on ${hardware}`);
  if (!benchB) console.warn(`Warning: No benchmark data for ${modelB.id} on ${hardware}`);

  const html = generateDraft(modelA, modelB, familyA, familyB, benchA, benchB, hardware);

  const outFile = path.join(__dirname, `../public/articles/draft-${modelA.id}-vs-${modelB.id}.html`);
  fs.writeFileSync(outFile, html);
  console.log(`Draft generated: ${outFile}`);
  console.log(`Models: ${modelA.displayName} vs ${modelB.displayName}`);
  console.log(`Hardware: ${hardware}`);
  console.log(`Benchmark data: ${benchA ? "yes" : "NO"} / ${benchB ? "yes" : "NO"}`);
  if (!benchA || !benchB) {
    console.log("\nNote: Missing benchmark data. Article includes specs comparison but no accuracy/speed tables.");
  }
}

main();
