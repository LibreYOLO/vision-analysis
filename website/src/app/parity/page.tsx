import { Metadata } from "next";
import Link from "next/link";
import parity from "@/data/metadata/parity.json";
import onnxExportParity from "@/data/metadata/onnx-export-parity.json";

export const metadata: Metadata = {
  title: "Port Fidelity: Parity Check",
  description:
    "Independent LibreYOLO parity checks for original port fidelity and PyTorch-to-ONNX export fidelity on COCO validation data.",
};

type Variant = {
  id: string;
  measured: number;
  claimed: number | null;
  delta: number | null;
  dataset: string;
  source: string;
  sourceLabel: string;
  confidence: string;
  note: string;
};

type OnnxCount = {
  total: number;
  passed: number;
  failed: number;
  unavailable: number;
  error?: number;
};

type OnnxCase = {
  case: string;
  family: string;
  size: string;
  task: string;
  claim: string;
  status: string;
  worst_metric: string | null;
  pytorch: number | null;
  onnx: number | null;
  abs_delta: number | null;
  tolerance: number | null;
  metrics: {
    metric: string;
    pytorch: number | null;
    onnx: number | null;
    abs_delta: number | null;
    tolerance: number | null;
    passed: boolean;
  }[];
};

type OnnxFailedCase = {
  case: string;
  task: string;
  claim: string;
  worst_metric: string | null;
  pytorch: number | null;
  onnx: number | null;
  abs_delta: number | null;
  tolerance: number | null;
};

type OnnxUnavailableCase = {
  case: string;
  task: string;
  reason: string;
};

type OnnxParity = {
  checkedDate: string;
  sourcePr: string;
  dataset: string;
  datasetSource: string;
  hardware: string;
  runtime: string;
  scope: string;
  methodology: string;
  tolerances: { abs: number; rel: number };
  counts: OnnxCount;
  taskCounts: (OnnxCount & { task: string })[];
  claimCounts: (OnnxCount & { claim: string })[];
  failedCases: OnnxFailedCase[];
  unavailableCases: OnnxUnavailableCase[];
  cases: OnnxCase[];
};

function deltaClass(delta: number | null): string {
  if (delta === null) return "text-muted-foreground";
  const a = Math.abs(delta);
  if (a <= 0.3) return "text-green-500";
  if (a <= 1.0) return "text-yellow-500";
  return "text-red-500";
}

function fmt(n: number | null, d = 1): string {
  return typeof n === "number" ? n.toFixed(d) : "-";
}

function fmtSmall(n: number | null): string {
  if (typeof n !== "number") return "-";
  if (n === 0) return "0";
  return n.toPrecision(4);
}

function fmtDate(iso: string): string {
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

function statusPillClass(status: string): string {
  if (status === "passed") return "border-green-500/30 bg-green-500/10 text-green-600";
  if (status === "failed") return "border-red-500/30 bg-red-500/10 text-red-600";
  if (status === "unavailable") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-600";
  return "border-border bg-muted text-muted-foreground";
}

function metricDeltaClass(passed: boolean, delta: number | null): string {
  if (delta === null) return "text-muted-foreground";
  return passed ? "text-green-500" : "text-red-500";
}

function compactMetricName(metric: string): string {
  return metric.replace(/^metrics\//, "");
}

export default function ParityPage() {
  const p = parity as typeof parity & { families: { family: string; displayName: string; variants: Variant[] }[] };
  const onnx = onnxExportParity as OnnxParity;
  const unavailableByCase = new Map(onnx.unavailableCases.map((row) => [row.case, row.reason]));
  const onnxFamilies = onnx.cases.reduce((groups, row) => {
    const cases = groups.get(row.family);
    if (cases) {
      cases.push(row);
    } else {
      groups.set(row.family, [row]);
    }
    return groups;
  }, new Map<string, OnnxCase[]>());

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Port Fidelity: Parity Check</h1>
      <p className="text-muted-foreground mb-6">
        Does LibreYOLO reproduce each detection model&apos;s <em>original</em> reported accuracy? Below is an
        independent re-evaluation on COCO val2017, measured side-by-side with each model&apos;s claimed number
        (sourced from its paper, repo README, model zoo, or HF card).
      </p>

      <div className="rounded-md border border-border bg-card p-4 mb-6 text-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-1">
          <span><span className="text-muted-foreground">Parity checked:</span> <b>{fmtDate(p.checkedDate)}</b></span>
          <span><span className="text-muted-foreground">Hardware:</span> <b>{p.hardware}</b></span>
          <span><span className="text-muted-foreground">Dataset:</span> <b>{p.dataset}</b></span>
          <span><span className="text-muted-foreground">Variants:</span> <b>{p.variantCount}</b></span>
        </div>
        <p className="text-muted-foreground mt-3 leading-relaxed">{p.methodology}</p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <span><span className="text-green-500">●</span> |Δ| ≤ 0.3: faithful</span>
          <span><span className="text-yellow-500">●</span> ≤ 1.0: minor drift</span>
          <span><span className="text-red-500">●</span> &gt; 1.0: investigate</span>
          <span className="text-muted-foreground">Δ = measured − claimed (mAP@50-95 points)</span>
        </div>
      </div>

      <div className="space-y-6">
        {p.families.map((fam) => (
          <div key={fam.family} className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <h2 className="font-semibold">{fam.displayName}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border">
                    <th className="text-left font-medium px-4 py-2">Variant</th>
                    <th className="text-right font-medium px-3 py-2">LibreYOLO</th>
                    <th className="text-right font-medium px-3 py-2">Claimed</th>
                    <th className="text-right font-medium px-3 py-2">Δ</th>
                    <th className="text-left font-medium px-3 py-2">Dataset</th>
                    <th className="text-left font-medium px-4 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {fam.variants.map((v) => (
                    <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium" title={v.note}>{v.id}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(v.measured)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(v.claimed)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${deltaClass(v.delta)}`}>
                        {v.delta === null ? "-" : `${v.delta >= 0 ? "+" : ""}${v.delta.toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{v.dataset}</td>
                      <td className="px-4 py-2">
                        {v.source ? (
                          <a href={v.source} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline text-xs">
                            {v.sourceLabel}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-2">ONNX Export Fidelity</h2>
        <p className="text-muted-foreground mb-6">
          Does a LibreYOLO ONNX export preserve the same validation behavior as the PyTorch model? This run checks
          detection, segmentation, and pose exports that claim complete or experimental ONNX support.
        </p>

        <div className="rounded-md border border-border bg-card p-4 mb-6 text-sm">
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <span><span className="text-muted-foreground">Parity checked:</span> <b>{fmtDate(onnx.checkedDate)}</b></span>
            <span><span className="text-muted-foreground">Hardware:</span> <b>{onnx.hardware}</b></span>
            <span><span className="text-muted-foreground">Dataset:</span> <b>{onnx.dataset}</b></span>
            <span><span className="text-muted-foreground">Cases:</span> <b>{onnx.counts.total}</b></span>
          </div>
          <p className="text-muted-foreground mt-3 leading-relaxed">{onnx.methodology}</p>
          <div className="mt-3 text-xs text-muted-foreground">
            Runtime: {onnx.runtime}. Tolerances: abs {onnx.tolerances.abs}, rel {onnx.tolerances.rel}.
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 mb-6">
          <div className="rounded-md border border-border bg-card p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Passed</div>
            <div className="text-2xl font-semibold text-green-500">{onnx.counts.passed}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Failed</div>
            <div className="text-2xl font-semibold text-red-500">{onnx.counts.failed}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Unavailable</div>
            <div className="text-2xl font-semibold text-yellow-500">{onnx.counts.unavailable}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
            <div className="text-2xl font-semibold">{onnx.counts.total}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <h3 className="font-semibold">By task</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs border-b border-border">
                  <th className="text-left font-medium px-4 py-2">Task</th>
                  <th className="text-right font-medium px-3 py-2">Passed</th>
                  <th className="text-right font-medium px-3 py-2">Failed</th>
                  <th className="text-right font-medium px-4 py-2">Unavailable</th>
                </tr>
              </thead>
              <tbody>
                {onnx.taskCounts.map((row) => (
                  <tr key={row.task} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 font-medium">{row.task}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.passed}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.failed}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.unavailable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <h3 className="font-semibold">By support claim</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs border-b border-border">
                  <th className="text-left font-medium px-4 py-2">Claim</th>
                  <th className="text-right font-medium px-3 py-2">Passed</th>
                  <th className="text-right font-medium px-3 py-2">Failed</th>
                  <th className="text-right font-medium px-4 py-2">Unavailable</th>
                </tr>
              </thead>
              <tbody>
                {onnx.claimCounts.map((row) => (
                  <tr key={row.claim} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 font-medium">{row.claim}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.passed}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.failed}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.unavailable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          {Array.from(onnxFamilies, ([family, cases]) => {
            const familyCounts = cases.reduce(
              (acc, row) => {
                acc.total += 1;
                if (row.status === "passed") acc.passed += 1;
                if (row.status === "failed") acc.failed += 1;
                if (row.status === "unavailable") acc.unavailable += 1;
                return acc;
              },
              { total: 0, passed: 0, failed: 0, unavailable: 0 },
            );

            return (
              <section key={family}>
                <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{family}</h3>
                    <p className="text-xs text-muted-foreground">
                      {familyCounts.passed} passed, {familyCounts.failed} failed, {familyCounts.unavailable} unavailable
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">{familyCounts.total} cases</div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {cases.map((row) => (
                    <article key={row.case} className="rounded-md border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold leading-tight">{row.case}</h4>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{row.task}</span>
                            <span>{row.claim}</span>
                            {row.worst_metric ? <span>worst: {compactMetricName(row.worst_metric)}</span> : null}
                          </div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusPillClass(row.status)}`}>
                          {row.status}
                        </span>
                      </div>

                      {row.metrics.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground text-xs border-b border-border">
                                <th className="text-left font-medium px-4 py-2">Metric</th>
                                <th className="text-right font-medium px-3 py-2">PyTorch</th>
                                <th className="text-right font-medium px-3 py-2">ONNX</th>
                                <th className="text-right font-medium px-3 py-2">Delta</th>
                                <th className="text-right font-medium px-4 py-2">Tolerance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.metrics.map((metric) => {
                                const isWorst = metric.metric === row.worst_metric;
                                const isFailed = !metric.passed;

                                return (
                                  <tr
                                    key={metric.metric}
                                    className={`border-b border-border/50 last:border-0 ${
                                      isFailed ? "bg-red-500/5" : isWorst ? "bg-muted/20" : "hover:bg-muted/20"
                                    }`}
                                  >
                                    <td className="px-4 py-2 text-xs">
                                      <span className="font-medium">{compactMetricName(metric.metric)}</span>
                                      {isWorst ? <span className="ml-2 text-muted-foreground">worst</span> : null}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmtSmall(metric.pytorch)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmtSmall(metric.onnx)}</td>
                                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${metricDeltaClass(metric.passed, metric.abs_delta)}`}>
                                      {fmtSmall(metric.abs_delta)}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{fmtSmall(metric.tolerance)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          {unavailableByCase.get(row.case) ?? "No ONNX parity metrics were produced for this case."}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-muted-foreground mt-8 leading-relaxed">
        Claimed values are each model&apos;s own published number on COCO and are not LibreYOLO results; some are
        reported on test-dev rather than val2017 (see the Dataset column). A small residual is expected from fp16
        weight storage and minor pre/post-processing differences. Full per-variant results live in the{" "}
        <Link href="/" className="text-brand hover:underline">benchmark tables</Link>.
      </p>
    </div>
  );
}
