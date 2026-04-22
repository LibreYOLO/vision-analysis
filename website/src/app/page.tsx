import { getAllBenchmarkResults, getHardwareOptions, getFamilies, getModels, getAllFamilies } from "@/lib/data";
import { LeaderboardDashboard } from "@/components/leaderboard";
import { Logo } from "@/components/layout/Logo";

export default function HomePage() {
  const benchmarkData = getAllBenchmarkResults();
  const hardwareOptions = getHardwareOptions();
  const families = getFamilies();
  const models = getModels();
  const allFamilies = getAllFamilies();
  const familyCount = allFamilies.length;
  const totalModelsTracked = models.length;
  const benchmarkCount = Object.values(benchmarkData).reduce((sum, results) => sum + results.length, 0);
  const modelsWithBenchmarks = new Set(
    Object.values(benchmarkData).flat().map((result) => result.model),
  ).size;
  const hasVerifiedBenchmarks = benchmarkCount > 0;
  const submissionUrl = "https://github.com/LibreYOLO/vision-analysis/tree/main/submissions";

  return (
    <>
      {/* Black Hero Section */}
      <section className="hero-section">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Object Detection Leaderboard
          </h1>
          <p className="text-white/60 text-base max-w-2xl">
            Raw benchmark records for object detection models. Compare measured accuracy,
            latency, throughput, and memory across {familyCount} model families and {totalModelsTracked} tracked variants.
          </p>
        </div>
      </section>

      {/* Content zone - overlaps the hero */}
      <div className="hero-content-overlap mx-auto max-w-[1280px] px-4 pb-8">
        <div className="section-group mb-6">
          <div className="section-group-header">
            <h2>Data Status</h2>
            <p className="text-base text-foreground">
              Vision Analysis currently publishes atomic benchmark metrics, not a composite score.
            </p>
          </div>
          <div className="section-group-content">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Benchmark Records</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{benchmarkCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Loaded from the canonical verified dataset generated from reviewed submissions.
                </p>
              </div>
              <div className="rounded border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Benchmarked Models</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{modelsWithBenchmarks}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Each row in the leaderboard is backed by measured mAP, latency, throughput, and memory.
                </p>
              </div>
              <div className="rounded border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hardware Targets</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{hardwareOptions.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Support is tracked per backend, provider, and hardware combination.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded border border-border bg-surface-muted p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Submission flow</p>
              <p className="mt-1">
                Run the benchmark harness, open a pull request with the JSON result under{" "}
                <a href={submissionUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                  <code>submissions/</code>
                </a>
                , and let CI validate and rebuild the canonical dataset.
              </p>
            </div>
          </div>
        </div>

        {!hasVerifiedBenchmarks && (
          <div className="section-group mb-6">
            <div className="section-group-header">
              <h2>No Verified Results Yet</h2>
              <p className="text-base text-foreground">
                The mock benchmark corpus is gone. Vision Analysis will stay empty until real reviewed submissions land.
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

        {/* CTA Banner */}
        <div className="cta-banner mb-6">
          <div className="flex items-center gap-4">
            <Logo size={36} className="flex-shrink-0 rounded" />
            <div>
              <p className="font-semibold text-sm text-foreground">
                Vision Analysis — Artificial Analysis for Computer Vision
              </p>
              <p className="text-sm text-muted-foreground">
                Public benchmark records for object detection models, backed by LibreYOLO and reviewed through pull requests.
              </p>
            </div>
          </div>
          <a href="/about" className="flex-shrink-0 h-9 px-4 flex items-center rounded bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity">
            Learn More
          </a>
        </div>

        {hasVerifiedBenchmarks ? (
          <LeaderboardDashboard
            benchmarkData={benchmarkData}
            hardwareOptions={hardwareOptions}
            families={families}
          />
        ) : null}
      </div>
    </>
  );
}
