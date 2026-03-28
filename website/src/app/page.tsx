import { getAllBenchmarkResults, getHardwareOptions, getFamilies, getModels, getAllFamilies } from "@/lib/data";
import { LeaderboardDashboard } from "@/components/leaderboard";
import { VAScoreChart, AccuracyTimeline } from "@/components/charts";
import { Logo } from "@/components/layout/Logo";

export default function HomePage() {
  const benchmarkData = getAllBenchmarkResults();
  const hardwareOptions = getHardwareOptions();
  const families = getFamilies();
  const models = getModels();
  const allFamilies = getAllFamilies();
  const familyCount = allFamilies.length;
  const totalModelsTracked = models.length;

  return (
    <>
      {/* Black Hero Section */}
      <section className="hero-section">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Object Detection Leaderboard
          </h1>
          <p className="text-white/60 text-base max-w-2xl">
            Credible and deep analysis of computer vision models. Compare accuracy, speed,
            and efficiency across {familyCount} model families and {totalModelsTracked} variants.
          </p>
        </div>
      </section>

      {/* Content zone - overlaps the hero */}
      <div className="hero-content-overlap mx-auto max-w-[1280px] px-4 pb-8">
        {/* VA v1 Score - the headline chart (like AA's Intelligence Index) */}
        <div className="section-group mb-6">
          <div className="section-group-header">
            <h2>VA v1 Score</h2>
            <p className="text-base text-foreground">
              Compound index ranking object detection models across accuracy, speed, and efficiency.
            </p>
          </div>
          <div className="section-group-content">
            <VAScoreChart />
          </div>
        </div>

        {/* VA v1 Score Over Time */}
        <div className="section-group mb-6">
          <div className="section-group-header">
            <h2>VA v1 Score Over Time</h2>
            <p className="text-base text-foreground">
              Best VA v1 Score per company over time. Each line represents a competing organization.
            </p>
          </div>
          <div className="section-group-content">
            <AccuracyTimeline />
          </div>
        </div>

        {/* CTA Banner */}
        <div className="cta-banner mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand text-white flex-shrink-0 overflow-hidden">
              <Logo size={32} />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                Vision Analysis - Artificial Analysis for Computer Vision
              </p>
              <p className="text-sm text-muted-foreground">
                Credible and deep benchmarks for object detection, segmentation, and pose estimation models.
              </p>
            </div>
          </div>
          <a href="/about" className="flex-shrink-0 h-9 px-4 flex items-center rounded bg-brand text-white text-sm font-medium hover:bg-cyan-800 transition-colors">
            Learn More
          </a>
        </div>

        {/* Main Dashboard */}
        <LeaderboardDashboard
          benchmarkData={benchmarkData}
          hardwareOptions={hardwareOptions}
          families={families}
        />
      </div>
    </>
  );
}
