import { Suspense } from "react";
import { getAllBenchmarkResults, getModels, getHardwareOptions, getRuntimeOptions } from "@/lib/data";
import { CompareContent } from "./CompareContent";

export default function ComparePage() {
  const benchmarkData = getAllBenchmarkResults();
  const allModels = getModels();
  const hardwareOptions = getHardwareOptions();
  const runtimeOptions = getRuntimeOptions();
  const benchmarkCount = Object.values(benchmarkData).reduce((sum, results) => sum + results.length, 0);
  const submissionsUrl = "https://github.com/LibreYOLO/vision-analysis/tree/main/submissions";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Compare Models</h1>
      <p className="text-muted-foreground mb-8">
        Select up to 4 models to compare side-by-side
      </p>

      {benchmarkCount === 0 ? (
        <div className="rounded border border-border bg-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No verified comparison data yet</p>
          <p className="mt-2">
            Comparison view becomes available after the first reviewed submissions are merged into{" "}
            <a href={submissionsUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
              <code>submissions/</code>
            </a>
            .
          </p>
        </div>
      ) : (
        <Suspense>
          <CompareContent
            benchmarkData={benchmarkData}
            allModels={allModels}
            hardwareOptions={hardwareOptions}
            allRuntimeOptions={runtimeOptions}
          />
        </Suspense>
      )}
    </div>
  );
}
