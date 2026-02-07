import { Suspense } from "react";
import { getAllBenchmarkResults, getModels, getHardwareOptions, getRuntimeOptions } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { CompareContent } from "./CompareContent";

export default function ComparePage() {
  const benchmarkData = getAllBenchmarkResults();
  const allModels = getModels();
  const hardwareOptions = getHardwareOptions();
  const runtimeOptions = getRuntimeOptions();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Compare Models</h1>
      <p className="text-muted-foreground mb-8">
        Select up to 4 models to compare side-by-side
      </p>

      <Suspense
        fallback={
          <Card className="mb-8">
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading comparison tool...
            </CardContent>
          </Card>
        }
      >
        <CompareContent
          benchmarkData={benchmarkData}
          allModels={allModels}
          hardwareOptions={hardwareOptions}
          allRuntimeOptions={runtimeOptions}
        />
      </Suspense>
    </div>
  );
}
