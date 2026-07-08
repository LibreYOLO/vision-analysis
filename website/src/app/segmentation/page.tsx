import { Suspense } from "react";
import type { Metadata } from "next";
import { LeaderboardDashboard } from "@/components/leaderboard";
import { ChartDataTable } from "@/components/charts";
import {
  getAllBenchmarkResultsByTask,
  getHardwareOptions,
  getRuntimeOptions,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Instance Segmentation Leaderboard | Vision Analysis",
  description:
    "Compare real-time instance segmentation models by mask mAP, speed, and efficiency on COCO val2017, measured on real hardware.",
  alternates: { canonical: "/segmentation" },
};

export default function SegmentationPage() {
  // Segmentation rows report mask mAP as their headline metric. They are kept
  // out of the detection leaderboard because the two metrics are not comparable.
  const benchmarkData = getAllBenchmarkResultsByTask("segmentation");
  const hardwareOptions = getHardwareOptions(benchmarkData);
  const hasResults = Object.keys(benchmarkData).length > 0;

  const hwLabel = new Map(hardwareOptions.map((o) => [o.value, o.label]));
  const rtLabel = new Map(getRuntimeOptions().map((o) => [o.value, o.label]));

  return (
    <>
      <section className="hero-section">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="mb-2 text-2xl font-semibold text-white">
            Instance Segmentation Leaderboard
          </h1>
          <p className="max-w-2xl text-base text-white/60">
            Real-time instance segmentation models ranked by mask mAP on COCO
            val2017. Each run also records box mAP; masks are scored with COCO
            segm evaluation at source resolution.
          </p>
        </div>
      </section>

      <div className="hero-content-overlap mx-auto max-w-[1280px] px-4 pb-8">
        {hasResults ? (
          <>
            <Suspense>
              <LeaderboardDashboard
                benchmarkData={benchmarkData}
                hardwareOptions={hardwareOptions}
                mapLabel="mask mAP"
              />
            </Suspense>
            {/* Machine-readable data tables (sr-only), mirroring the homepage. */}
            <section className="sr-only">
              <h2>Segmentation benchmark data tables</h2>
              {Object.entries(benchmarkData).map(([key, rows]) => {
                const [hw, rt] = key.split("__");
                const hardwareLabel = hwLabel.get(hw) ?? hw;
                const runtimeLabel = rtLabel.get(rt) ?? rt;
                return (
                  <ChartDataTable
                    key={key}
                    data={rows}
                    xAxis="latencyMs"
                    title={`Mask accuracy vs Latency: ${hardwareLabel} · ${runtimeLabel}`}
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
              <h2>No Verified Segmentation Results Yet</h2>
              <p className="text-base text-foreground">
                Segmentation models are registered in the harness; the first
                reviewed submissions will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
