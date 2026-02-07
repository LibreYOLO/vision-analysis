import { getAllBenchmarkResults, getHardwareOptions, getFamilies } from "@/lib/data";
import { LeaderboardDashboard } from "@/components/leaderboard";

export default function HomePage() {
  const benchmarkData = getAllBenchmarkResults();
  const hardwareOptions = getHardwareOptions();
  const families = getFamilies();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          LibreYOLO Benchmarks
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Comprehensive benchmarks for LibreYOLO models. Compare accuracy and efficiency across
          YOLOv9 and YOLOX model families.
        </p>
      </section>

      <LeaderboardDashboard
        benchmarkData={benchmarkData}
        hardwareOptions={hardwareOptions}
        families={families}
      />
    </div>
  );
}
