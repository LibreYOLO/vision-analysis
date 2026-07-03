// Renderer for v2 engine articles.
//
// Text blocks are the only LLM-written prose (validated upstream). Data blocks
// are resolved HERE, live, from the verified dataset: when new benchmark runs
// land, every table in every article updates on the next build. Prose never
// contains a number that the claims file did not allow.

import Link from "next/link";
import {
  getBenchmarkResults,
  getModelById,
  getHardwareById,
  getRuntimeById,
} from "@/lib/data";
import type { BenchmarkResult } from "@/lib/types";
import type {
  ArticleBlock,
  ArticleContent,
  ChartBlock,
  CodeBlock,
  ComparisonTableBlock,
  KvBlock,
  RankingTableBlock,
  SpeedupTableBlock,
} from "@/lib/types/article";

const PERMISSIVE = new Set(["Apache-2.0", "MIT", "BSD-3-Clause"]);

// ---------------------------------------------------------------- formatting

const fmtMap = (v: number) => (v * 100).toFixed(1);
const fmtFps = (v: number) => v.toFixed(1);
const fmtMs = (v: number) => v.toFixed(2);

function hwName(id: string): string {
  return getHardwareById(id)?.displayName ?? id;
}

function rtName(id: string): string {
  return getRuntimeById(id)?.displayName ?? id;
}

function modelName(id: string): string {
  return getModelById(id)?.displayName ?? id;
}

// Minimal inline markdown: [text](href), `code`, **bold**. No headings, no
// lists, no raw HTML. Anything else renders literally.
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2];
      nodes.push(
        href.startsWith("/") ? (
          <Link key={key++} href={href} className="text-brand hover:underline">
            {m[1]}
          </Link>
        ) : (
          <a
            key={key++}
            href={href}
            className="text-brand hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            {m[1]}
          </a>
        )
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <code key={key++} className="rounded bg-surface-muted px-1 py-0.5 text-[0.9em]">
          {m[3]}
        </code>
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {m[4]}
        </strong>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ---------------------------------------------------------------- text blocks

function Prose({ text }: { text: string }) {
  return (
    <p className="my-4 text-base leading-relaxed text-foreground">{renderInline(text)}</p>
  );
}

function Verdict({ text }: { text: string }) {
  return (
    <div className="mb-8 rounded border border-border bg-surface-muted p-4">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Verdict
      </div>
      <p className="mt-2 text-base leading-relaxed text-foreground">{renderInline(text)}</p>
    </div>
  );
}

function Heading({ text }: { text: string }) {
  return <h2 className="mt-9 mb-2 text-xl font-semibold text-foreground">{text}</h2>;
}

function Callout({ text }: { text: string }) {
  return (
    <p className="my-6 rounded border-l-2 border-brand bg-brand-subtle px-4 py-3 text-sm text-muted-foreground">
      {renderInline(text)}
    </p>
  );
}

function Methodology() {
  return (
    <p className="my-4 text-base leading-relaxed text-foreground">
      Every number on this page comes from the verified dataset: same 500-image COCO val2017
      slice, conf 0.001, IoU 0.6, max 300 detections, pycocotools mAP, identical protocol across
      all hardware and runtimes. The full protocol is on the{" "}
      <Link href="/methodology" className="text-brand hover:underline">
        methodology
      </Link>{" "}
      page. To rerun this comparison with your own filters, open{" "}
      <Link href="/compare" className="text-brand hover:underline">
        compare
      </Link>
      . Accuracy is measured on LibreYOLO retrained checkpoints; other weight sources can yield
      different values.
    </p>
  );
}

function Chart({ block }: { block: ChartBlock }) {
  return (
    <figure className="my-7 overflow-hidden rounded border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Live chart
        </span>
        <span className="text-xs text-muted-foreground">verified data</span>
      </div>
      <iframe
        src={block.src}
        width="100%"
        height={block.height ?? 460}
        loading="lazy"
        className="block border-0"
        title={block.caption}
      />
      <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {block.caption}
      </figcaption>
    </figure>
  );
}

function Code({ block }: { block: CodeBlock }) {
  return (
    <pre className="my-6 overflow-x-auto rounded border border-border bg-surface-muted p-4 text-sm leading-relaxed">
      <code>{block.text}</code>
    </pre>
  );
}

function Kv({ block }: { block: KvBlock }) {
  return (
    <div className="my-6 rounded border border-border">
      <div className="border-b border-border bg-surface-muted px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {block.title}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 px-4 py-3 sm:grid-cols-2">
        {block.items.map((item, i) => (
          <div key={i} className="flex justify-between gap-4 border-b border-border/50 py-1.5 text-sm last:border-0 sm:[&:nth-last-child(2)]:border-0">
            <dt className="text-muted-foreground">{item.k}</dt>
            <dd className="text-right text-foreground">
              {item.href ? (
                <a
                  href={item.href}
                  className="text-brand hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.v}
                </a>
              ) : (
                item.v
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------- data tables

function TableShell({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-7 overflow-hidden rounded border border-border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
      {caption ? (
        <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground bg-surface-muted";
const td = "px-3 py-2 border-t border-border text-foreground";
const tdWin = `${td} font-semibold text-brand`;

function ModelLink({ id }: { id: string }) {
  return (
    <Link href={`/model/${id}`} className="text-brand hover:underline">
      {modelName(id)}
    </Link>
  );
}

function resultsFor(hardware: string, runtime: string): Map<string, BenchmarkResult> {
  const map = new Map<string, BenchmarkResult>();
  for (const r of getBenchmarkResults(hardware, runtime)) {
    map.set(r.model, r);
  }
  return map;
}

function ComparisonTable({ block }: { block: ComparisonTableBlock }) {
  const results = resultsFor(block.hardware, block.runtime);
  const cols = block.models
    .map((id) => ({ id, r: results.get(id) }))
    .filter((c): c is { id: string; r: BenchmarkResult } => Boolean(c.r));
  if (cols.length < 2) {
    return (
      <Callout
        text={`No verified data for this model set on ${hwName(block.hardware)} / ${rtName(block.runtime)}.`}
      />
    );
  }

  interface Row {
    label: string;
    values: (number | null)[];
    fmt: (v: number) => string;
    higherWins: boolean | null; // null = do not rank
  }
  const rows: Row[] = [
    { label: "mAP@50-95", values: cols.map((c) => c.r.mAP_50_95), fmt: fmtMap, higherWins: true },
    { label: "mAP@50", values: cols.map((c) => c.r.mAP_50), fmt: fmtMap, higherWins: true },
    { label: "mAP small", values: cols.map((c) => c.r.mAP_small || null), fmt: fmtMap, higherWins: true },
    { label: "FPS (mean)", values: cols.map((c) => c.r.throughputFps), fmt: fmtFps, higherWins: true },
    { label: "Total ms/image", values: cols.map((c) => c.r.totalMs), fmt: fmtMs, higherWins: false },
    { label: "Inference ms", values: cols.map((c) => c.r.inferenceMs), fmt: fmtMs, higherWins: false },
    { label: "Peak VRAM (MB)", values: cols.map((c) => c.r.peakVramMb || null), fmt: (v) => v.toFixed(0), higherWins: false },
    { label: "Params (M)", values: cols.map((c) => c.r.paramsM || null), fmt: fmtFps, higherWins: null },
    { label: "GFLOPs", values: cols.map((c) => c.r.flopsG || null), fmt: fmtFps, higherWins: null },
    { label: "Input size", values: cols.map((c) => c.r.inputSize || null), fmt: (v) => String(v), higherWins: null },
    { label: "License", values: [], fmt: (v) => String(v), higherWins: null },
  ];

  return (
    <TableShell
      caption={
        block.caption ??
        `${cols.map((c) => modelName(c.id)).join(" vs ")} on ${hwName(block.hardware)}, ${rtName(block.runtime)}, batch 1. mAP shown in percent form.`
      }
    >
      <thead>
        <tr>
          <th className={th}>Metric</th>
          {cols.map((c) => (
            <th key={c.id} className={th}>
              <ModelLink id={c.id} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          if (row.label === "License") {
            return (
              <tr key={row.label}>
                <td className={td}>License</td>
                {cols.map((c) => (
                  <td key={c.id} className={td}>
                    {getModelById(c.id)?.license ?? "?"}
                  </td>
                ))}
              </tr>
            );
          }
          if (row.values.every((v) => v === null || v === undefined)) return null;
          const ranked = row.values.filter((v): v is number => v !== null && v !== 0);
          let winIdx = -1;
          if (row.higherWins !== null && ranked.length === row.values.length) {
            const best = row.higherWins
              ? Math.max(...(row.values as number[]))
              : Math.min(...(row.values as number[]));
            winIdx = (row.values as number[]).indexOf(best);
          }
          return (
            <tr key={row.label}>
              <td className={td}>{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className={i === winIdx ? tdWin : td}>
                  {v === null || v === undefined ? "-" : row.fmt(v)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );
}

function RankingTable({ block }: { block: RankingTableBlock }) {
  let rows = getBenchmarkResults(block.hardware, block.runtime).slice();
  if (block.licenseFilter === "permissive") {
    rows = rows.filter((r) => PERMISSIVE.has(getModelById(r.model)?.license ?? ""));
  }
  if (block.maxParamsM) {
    rows = rows.filter((r) => r.paramsM && r.paramsM <= block.maxParamsM!);
  }
  rows.sort((a, b) =>
    block.metric === "mAP_50_95"
      ? b.mAP_50_95 - a.mAP_50_95
      : b.throughputFps - a.throughputFps
  );
  if (block.limit) rows = rows.slice(0, block.limit);
  if (rows.length === 0) {
    return (
      <Callout
        text={`No verified data for this slice on ${hwName(block.hardware)} / ${rtName(block.runtime)}.`}
      />
    );
  }
  return (
    <TableShell
      caption={
        block.caption ??
        `Ranked by ${block.metric === "mAP_50_95" ? "mAP@50-95" : "throughput"} on ${hwName(block.hardware)}, ${rtName(block.runtime)}, batch 1.${block.licenseFilter ? " Permissive licenses only." : ""}`
      }
    >
      <thead>
        <tr>
          <th className={th}>#</th>
          <th className={th}>Model</th>
          <th className={th}>mAP@50-95</th>
          <th className={th}>FPS</th>
          <th className={th}>ms/image</th>
          <th className={th}>Params (M)</th>
          <th className={th}>License</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.model}>
            <td className={td}>{i + 1}</td>
            <td className={td}>
              <ModelLink id={r.model} />
            </td>
            <td className={i === 0 && block.metric === "mAP_50_95" ? tdWin : td}>
              {fmtMap(r.mAP_50_95)}
            </td>
            <td className={i === 0 && block.metric === "throughputFps" ? tdWin : td}>
              {fmtFps(r.throughputFps)}
            </td>
            <td className={td}>{fmtMs(r.totalMs)}</td>
            <td className={td}>{r.paramsM ? r.paramsM.toFixed(1) : "-"}</td>
            <td className={td}>{getModelById(r.model)?.license ?? "?"}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function SpeedupTable({ block }: { block: SpeedupTableBlock }) {
  const base = resultsFor(block.hardware, block.baseline);
  const tgt = resultsFor(block.hardware, block.target);
  let rows = Array.from(base.entries())
    .map(([id, b]) => {
      const t = tgt.get(id);
      if (!t || !b.throughputFps) return null;
      return {
        id,
        baseFps: b.throughputFps,
        tgtFps: t.throughputFps,
        speedup: t.throughputFps / b.throughputFps,
        mapDelta: (t.mAP_50_95 - b.mAP_50_95) * 100,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.speedup - a.speedup);
  if (block.limit) rows = rows.slice(0, block.limit);
  if (rows.length === 0) {
    return (
      <Callout
        text={`No overlapping verified data for ${rtName(block.baseline)} and ${rtName(block.target)} on ${hwName(block.hardware)}.`}
      />
    );
  }
  return (
    <TableShell
      caption={
        block.caption ??
        `${rtName(block.target)} vs ${rtName(block.baseline)} on ${hwName(block.hardware)}, batch 1. mAP delta in percentage points.`
      }
    >
      <thead>
        <tr>
          <th className={th}>Model</th>
          <th className={th}>{rtName(block.baseline)} FPS</th>
          <th className={th}>{rtName(block.target)} FPS</th>
          <th className={th}>Speedup</th>
          <th className={th}>mAP delta (pts)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>
              <ModelLink id={r.id} />
            </td>
            <td className={td}>{fmtFps(r.baseFps)}</td>
            <td className={td}>{fmtFps(r.tgtFps)}</td>
            <td className={r.speedup >= 1 ? td : tdWin}>{r.speedup.toFixed(2)}x</td>
            <td className={Math.abs(r.mapDelta) >= 0.5 ? tdWin : td}>
              {r.mapDelta >= 0 ? "+" : ""}
              {r.mapDelta.toFixed(1)}
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

// ---------------------------------------------------------------- renderer

function renderBlock(block: ArticleBlock, i: number): React.ReactNode {
  switch (block.kind) {
    case "prose":
      return <Prose key={i} text={block.text} />;
    case "verdict":
      return <Verdict key={i} text={block.text} />;
    case "heading":
      return <Heading key={i} text={block.text} />;
    case "callout":
      return <Callout key={i} text={block.text} />;
    case "chart":
      return <Chart key={i} block={block} />;
    case "code":
      return <Code key={i} block={block} />;
    case "kv":
      return <Kv key={i} block={block} />;
    case "comparison-table":
      return <ComparisonTable key={i} block={block} />;
    case "ranking-table":
      return <RankingTable key={i} block={block} />;
    case "speedup-table":
      return <SpeedupTable key={i} block={block} />;
    case "methodology":
      return <Methodology key={i} />;
    default:
      return null;
  }
}

export function ArticleRenderer({ content }: { content: ArticleContent }) {
  return <>{content.blocks.map(renderBlock)}</>;
}
