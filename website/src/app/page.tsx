import { Suspense } from "react";
import { LeaderboardDashboard } from "@/components/leaderboard";
import { AccuracyTimeline, VAScoreChart } from "@/components/charts";
import { getAllBenchmarkResults, getHardwareOptions } from "@/lib/data";

const previewFamilies = ["D-FINE", "RF-DETR", "RT-DETR", "DEIM", "YOLOX"];

function PreviewFilters() {
  return (
    <div className="rounded-md border-b border-border bg-card p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 min-w-[168px] items-center rounded-md border border-border bg-card px-3 text-sm text-foreground">
            <span className="mr-2 text-muted-foreground">Hardware</span>
            <span>NVIDIA A100</span>
          </div>
          <div className="flex h-9 min-w-[160px] items-center rounded-md border border-border bg-card px-3 text-sm text-foreground">
            <span className="mr-2 text-muted-foreground">Runtime</span>
            <span>PyTorch FP32</span>
          </div>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="flex flex-wrap items-center gap-1.5">
            {previewFamilies.map((family) => (
              <span key={family} className="filter-chip cursor-default text-foreground/80">
                {family}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-full border border-brand/30 bg-brand-subtle px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-brand">
          Preview only
        </div>
      </div>
    </div>
  );
}

interface ComingSoonOverlayProps {
  title: string;
  description?: string;
  veilClassName?: string;
  panelClassName?: string;
}

function ComingSoonOverlay({
  title,
  description,
  veilClassName = "bg-background/40 backdrop-blur-[1px]",
  panelClassName = "bg-background/78",
}: ComingSoonOverlayProps) {
  return (
    <div className={`absolute inset-0 z-10 flex items-center justify-center ${veilClassName}`}>
      <div className={`mx-4 max-w-xl rounded-sm border border-border px-6 py-5 shadow-lg ${panelClassName}`}>
        <div className="inline-flex rounded-full border border-brand/30 bg-brand-subtle px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-brand">
          Coming soon
        </div>
        <h3 className="mt-3 text-2xl font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function HomePage() {
  const benchmarkData = getAllBenchmarkResults();
  const hardwareOptions = getHardwareOptions();
  const benchmarkCount = Object.values(benchmarkData).reduce((sum, results) => sum + results.length, 0);
  const hasVerifiedBenchmarks = benchmarkCount > 0;

  return (
    <>
      <section className="hero-section">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="mb-2 text-2xl font-semibold text-white">
            Object Detection Leaderboard
          </h1>
          <p className="max-w-2xl text-base text-white/60">
            Understand the computer vision landscape to select the best model and hardware for your use case.
          </p>
        </div>
      </section>

      <div className="hero-content-overlap mx-auto max-w-[1280px] px-4 pb-8">
        {hasVerifiedBenchmarks ? (
          <Suspense>
            <LeaderboardDashboard
              benchmarkData={benchmarkData}
              hardwareOptions={hardwareOptions}
            />
          </Suspense>
        ) : (
          <div className="section-group mb-6">
            <div className="section-group-header">
              <h2>No Verified Results Yet</h2>
              <p className="text-base text-foreground">
                Vision Analysis stays empty until real reviewed submissions land.
              </p>
            </div>
            <div className="section-group-content">
              <div className="rounded border border-border bg-card p-6">
                <p className="text-base text-foreground">
                  To publish the first results, run the harness from{" "}
                  <a
                    href="https://github.com/LibreYOLO/vision-analysis-benchmark"
                    className="text-brand hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <code>vision-analysis-benchmark</code>
                  </a>
                  , then submit the emitted JSON through a pull request.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="section-group mt-6 mb-6">
          <div className="section-group-header">
            <h2>VA v1 Score</h2>
            <p className="text-base text-foreground">
              The composite ranking is coming back, but it will stay unpublished until the reviewed submission set is broad enough to make the ranking credible.
            </p>
          </div>
          <div className="section-group-content">
            <PreviewFilters />
            <div className="relative mt-4 overflow-hidden rounded-[2px] [&_.chart-card]:mb-0">
              <div className="pointer-events-none opacity-75">
                <VAScoreChart />
              </div>
              <ComingSoonOverlay
                title="Composite ranking in progress"
              />
            </div>
          </div>
        </div>

        <div className="section-group mb-6">
          <div className="section-group-header">
            <h2>VA v1 Score Over Time</h2>
            <p className="text-base text-foreground">
              The historical timeline is returning as part of the same composite score rollout. The chart stays visible as a preview, but the live series is not published yet.
            </p>
          </div>
          <div className="section-group-content">
            <div className="relative overflow-hidden rounded-[2px]">
              <div className="pointer-events-none opacity-75">
                <AccuracyTimeline />
              </div>
              <ComingSoonOverlay
                title="Historical score view in progress"
                veilClassName="bg-background/10 backdrop-blur-[1px]"
                panelClassName="bg-background/72"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
