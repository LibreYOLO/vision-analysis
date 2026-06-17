import { BenchmarkResult } from "@/lib/types";
import { LIBREYOLO, libreyoloOneLiner } from "@/config/libreyolo";

/**
 * Client-safe helpers that turn a chart's data into text an LLM (or a human
 * pasting into one) can actually read: a one-sentence summary and a markdown
 * table. Used by the hidden accessible table behind each chart and by the
 * "Copy for LLM" button. NO fs / server-only imports.
 */

export type ChartXAxis = "paramsM" | "flopsG" | "latencyMs";

interface ChartContext {
  title: string;
  xAxis: ChartXAxis;
  /** Hardware label, only meaningful for the latency (hardware-specific) chart. */
  hardwareLabel?: string;
  /** Runtime/format label, only meaningful for the latency chart. */
  runtimeLabel?: string;
}

function fmt(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "-";
}

/** One plain-English sentence describing what the chart shows. */
export function summarizeChart(data: BenchmarkResult[], ctx: ChartContext): string {
  if (data.length === 0) return "No models match the current selection.";
  const byAcc = [...data].sort((a, b) => b.mAP_50_95 - a.mAP_50_95);
  const top = byAcc[0];
  const families = new Set(data.map((d) => d.family)).size;

  if (ctx.xAxis === "latencyMs") {
    const bySpeed = [...data].filter((d) => d.totalMs > 0).sort((a, b) => a.totalMs - b.totalMs);
    const fastest = bySpeed[0];
    const where = ctx.hardwareLabel
      ? ` on ${ctx.hardwareLabel}${ctx.runtimeLabel ? ` · ${ctx.runtimeLabel}` : ""}`
      : "";
    const fastBit = fastest
      ? ` Fastest is ${fastest.model} at ${fmt(fastest.totalMs)} ms (${fmt(fastest.throughputFps)} FPS).`
      : "";
    return (
      `Accuracy vs latency${where} for ${data.length} models across ${families} families. ` +
      `Highest accuracy: ${top.model} at ${fmt(top.mAP_50_95)} mAP@50-95.${fastBit}`
    );
  }

  const isFlops = ctx.xAxis === "flopsG";
  const cost = (d: BenchmarkResult) => (isFlops ? d.flopsG : d.paramsM);
  const unit = isFlops ? "GFLOPs" : "M params";
  const axisWord = isFlops ? "compute" : "model size";
  const bySize = [...data].filter((d) => cost(d) > 0).sort((a, b) => cost(a) - cost(b));
  const smallest = bySize[0];
  const smallBit = smallest
    ? ` Lightest is ${smallest.model} at ${fmt(cost(smallest))} ${unit} (${fmt(smallest.mAP_50_95)} mAP).`
    : "";
  return (
    `Accuracy vs ${axisWord} for ${data.length} models across ${families} families. ` +
    `Highest accuracy: ${top.model} at ${fmt(top.mAP_50_95)} mAP@50-95 (${fmt(cost(top))} ${unit}).${smallBit}`
  );
}

/** Markdown table of the plotted data, sorted by accuracy. */
export function chartMarkdownTable(data: BenchmarkResult[], xAxis: ChartXAxis): string {
  const rows = [...data].sort((a, b) => b.mAP_50_95 - a.mAP_50_95);
  if (xAxis === "latencyMs") {
    const header = "| Model | Family | mAP@50-95 | Latency (ms) | FPS | Params (M) |\n|---|---|---|---|---|---|";
    const body = rows
      .map(
        (d) =>
          `| ${d.model} | ${d.family} | ${fmt(d.mAP_50_95)} | ${fmt(d.totalMs)} | ${fmt(d.throughputFps)} | ${fmt(d.paramsM)} |`
      )
      .join("\n");
    return `${header}\n${body}`;
  }
  const header = "| Model | Family | mAP@50-95 | Params (M) | GFLOPs |\n|---|---|---|---|---|";
  const body = rows
    .map((d) => `| ${d.model} | ${d.family} | ${fmt(d.mAP_50_95)} | ${fmt(d.paramsM)} | ${fmt(d.flopsG)} |`)
    .join("\n");
  return `${header}\n${body}`;
}

/** Full markdown block for the clipboard: pitch + summary + table + provenance. */
export function buildChartMarkdown(data: BenchmarkResult[], ctx: ChartContext): string {
  const lines = [
    `## ${ctx.title}`,
    "",
    libreyoloOneLiner(),
    "",
    summarizeChart(data, ctx),
    "",
    chartMarkdownTable(data, ctx.xAxis),
    "",
    `Data: COCO val2017 · benchmarks produced with ${LIBREYOLO.name} (${LIBREYOLO.github}). Source: visionanalysis.org`,
  ];
  return lines.join("\n");
}
