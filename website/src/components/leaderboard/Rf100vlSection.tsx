import Link from "next/link";
import { BenchmarkResult } from "@/lib/types";
import { ScatterPlot } from "@/components/charts";
import { getHardwareById, getRuntimeById } from "@/lib/data";
import { getFamilyColor } from "@/lib/utils/colors";
import { formatNumber, formatPercent } from "@/lib/utils/format";

interface Rf100vlSectionProps {
  results: BenchmarkResult[];
}

/**
 * RF100-VL results, deliberately kept in their own section rather than as
 * columns on the COCO leaderboard.
 *
 * RF100-VL measures something different from COCO: each of the 100 datasets
 * gets its own fine-tuned checkpoint, and the reported number is the unweighted
 * mean of the 100 per-dataset scores. Those values run well above a COCO mAP for
 * the same model, so putting them in adjacent columns would invite a comparison
 * the numbers do not support.
 */
export function Rf100vlSection({ results }: Rf100vlSectionProps) {
  if (results.length === 0) return null;

  const expectedDatasets = 100;

  // Where these numbers came from. The RF100-VL hardware has no COCO rows, so
  // it never appears in the leaderboard's hardware selector; naming it here is
  // the only place a reader learns what the campaign ran on.
  const provenance = Array.from(
    new Set(
      results.map((r) => {
        const hw = getHardwareById(r.hardware)?.displayName ?? r.hardware;
        const rt = getRuntimeById(r.runtime)?.displayName ?? r.runtime;
        return `${hw} · ${rt}`;
      })
    )
  );

  return (
    <div className="section-group mb-6">
      <div className="section-group-header">
        <h2>RF100-VL: fine-tuned transfer</h2>
        <p className="max-w-3xl text-base text-foreground">
          RF100-VL asks a different question than COCO: not how well a
          pre-trained checkpoint scores, but how well an architecture adapts. Each
          of the 100 Roboflow Universe datasets is fine-tuned separately and
          scored on its own test split with pycocotools at maxDets 500; the
          headline number is the unweighted mean across those 100 scores.
        </p>
        <p className="max-w-3xl text-sm text-muted-foreground">
          These values are not comparable to the COCO mAP in the leaderboard
          above, and not comparable to each other across a different protocol.
          Latency is not reported here because a run spans 100 separate
          checkpoints.
        </p>
        <p className="text-sm text-muted-foreground">
          Measured on {provenance.join(", ")}.
        </p>
      </div>

      <div className="section-group-content">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">Model</th>
                <th className="px-2 py-2 text-right font-medium">AP@50-95</th>
                <th className="px-2 py-2 text-right font-medium">AP@50</th>
                <th className="px-2 py-2 text-right font-medium">Params (M)</th>
                <th className="px-2 py-2 text-right font-medium">GFLOPs</th>
                <th className="px-2 py-2 text-right font-medium">Datasets</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => {
                const covered = row.rf100vlNumDatasets ?? 0;
                const complete = covered === expectedDatasets;
                return (
                  <tr key={row.model} className="border-b border-border/60">
                    <td className="px-2 py-2">
                      <Link
                        href={`/model/${row.model}`}
                        className="inline-flex items-center gap-2 hover:text-brand"
                      >
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: getFamilyColor(row.family) }}
                          aria-hidden
                        />
                        {row.model}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {formatPercent(row.mAP_50_95)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {formatPercent(row.mAP_50)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {formatNumber(row.paramsM, 1)}M
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {row.flopsG > 0 ? formatNumber(row.flopsG, 1) : "-"}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {covered}/{expectedDatasets}
                      {complete ? null : (
                        <span className="ml-1 text-xs text-muted-foreground">partial</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <h3 className="mb-1 text-sm font-medium text-foreground">
            RF100-VL AP@50-95 vs parameter count
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            How much transfer accuracy each model buys per parameter.
          </p>
          <ScatterPlot
            data={results}
            xAxis="paramsM"
            mapLabel="RF100-VL AP"
            exportCaption="RF100-VL · fine-tuned per dataset · mean of 100 datasets"
            emptyMessage="No RF100-VL results published yet."
            height={360}
          />
        </div>
      </div>
    </div>
  );
}
