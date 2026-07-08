import { Suspense } from "react";
import type { Metadata } from "next";
import { LeaderboardDashboard } from "@/components/leaderboard";
import { ChartDataTable } from "@/components/charts";
import { getAllBenchmarkResultsByTask, getHardwareOptions, getRuntimeOptions } from "@/lib/data";
import type { BenchmarkResult } from "@/lib/types";

export const metadata: Metadata = {
  title: "RF100-VL Leaderboard (Preview) | Vision Analysis",
  description:
    "Preview of the RF100-VL benchmark category: fine-tuned accuracy averaged across the 100 Roboflow100-VL datasets. Placeholder data only.",
  alternates: { canonical: "/rf100-vl" },
  robots: { index: false, follow: false },
};

// PREVIEW ONLY — every accuracy value below is a hardcoded 0.123 placeholder.
// This page exists so the RF100-VL category layout can be reviewed before real
// harness submissions land. It must not ship to production with fake data.
const FAKE_METRIC = 0.123;

function toFakeRf100VlRows(
  real: Record<string, BenchmarkResult[]>
): Record<string, BenchmarkResult[]> {
  const grouped: Record<string, BenchmarkResult[]> = {};
  for (const [key, rows] of Object.entries(real)) {
    grouped[key] = rows.map((r) => ({
      ...r,
      dataset: "rf100_vl",
      datasetVariant: "full",
      mAP_50_95: FAKE_METRIC,
      mAP_50: FAKE_METRIC,
      mAP_75: FAKE_METRIC,
      mAP_small: FAKE_METRIC,
      mAP_medium: FAKE_METRIC,
      mAP_large: FAKE_METRIC,
      mAPPerGflop: FAKE_METRIC,
      mAPPerMParams: FAKE_METRIC,
    }));
  }
  return grouped;
}

function FakeDataBanner() {
  return (
    <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-500">
          Preview — fake data
        </span>
        <p className="text-sm text-foreground/80">
          Every accuracy value on this page is a <code>0.123</code> placeholder.
          Latency, hardware, and runtime coordinates are borrowed from the COCO
          leaderboard to preview the layout. Real RF100-VL submissions from the
          harness will replace this page.
        </p>
      </div>
    </div>
  );
}

export default function Rf100VlPage() {
  const benchmarkData = toFakeRf100VlRows(getAllBenchmarkResultsByTask("detection"));
  const hardwareOptions = getHardwareOptions(benchmarkData);
  const hasResults = Object.keys(benchmarkData).length > 0;

  const hwLabel = new Map(hardwareOptions.map((o) => [o.value, o.label]));
  const rtLabel = new Map(getRuntimeOptions().map((o) => [o.value, o.label]));

  return (
    <>
      <section className="hero-section">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="mb-2 text-2xl font-semibold text-white">
            RF100-VL Leaderboard
          </h1>
          <p className="max-w-2xl text-base text-white/60">
            Fine-tuned detection accuracy averaged across the 100 Roboflow100-VL
            datasets (AP50 and AP50:95, COCO evaluation per dataset), next to
            real-hardware latency. RF100-VL measures how well a model adapts to
            diverse real-world data, not just COCO.
          </p>
        </div>
      </section>

      <div className="hero-content-overlap mx-auto max-w-[1280px] px-4 pb-8">
        <FakeDataBanner />
        {hasResults ? (
          <>
            <Suspense>
              <LeaderboardDashboard
                benchmarkData={benchmarkData}
                hardwareOptions={hardwareOptions}
              />
            </Suspense>
            {/* Machine-readable data tables (sr-only), mirroring the homepage. */}
            <section className="sr-only">
              <h2>RF100-VL benchmark data tables (placeholder values)</h2>
              {Object.entries(benchmarkData).map(([key, rows]) => {
                const [hw, rt] = key.split("__");
                const hardwareLabel = hwLabel.get(hw) ?? hw;
                const runtimeLabel = rtLabel.get(rt) ?? rt;
                return (
                  <ChartDataTable
                    key={key}
                    data={rows}
                    xAxis="latencyMs"
                    title={`RF100-VL accuracy vs Latency: ${hardwareLabel} · ${runtimeLabel}`}
                    hardwareLabel={hardwareLabel}
                    runtimeLabel={runtimeLabel}
                  />
                );
              })}
            </section>
          </>
        ) : (
          <div className="section-group mb-6">
            <div className="section-group-header">
              <h2>No RF100-VL Results Yet</h2>
              <p className="text-base text-foreground">
                Run the harness with <code>va-bench rf100vl</code> and submit the
                emitted JSON to publish the first results.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
