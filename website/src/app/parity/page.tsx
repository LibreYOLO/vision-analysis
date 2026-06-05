import { Metadata } from "next";
import Link from "next/link";
import parity from "@/data/metadata/parity.json";

export const metadata: Metadata = {
  title: "Port Fidelity: Parity Check",
  description:
    "Independent COCO val2017 verification of LibreYOLO's detection ports versus each model's original paper/repo claimed accuracy, with per-value sources.",
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

function fmtDate(iso: string): string {
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

export default function ParityPage() {
  const p = parity as typeof parity & { families: { family: string; displayName: string; variants: Variant[] }[] };

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

      <p className="text-xs text-muted-foreground mt-8 leading-relaxed">
        Claimed values are each model&apos;s own published number on COCO and are not LibreYOLO results; some are
        reported on test-dev rather than val2017 (see the Dataset column). A small residual is expected from fp16
        weight storage and minor pre/post-processing differences. Full per-variant results live in the{" "}
        <Link href="/" className="text-brand hover:underline">benchmark tables</Link>.
      </p>
    </div>
  );
}
