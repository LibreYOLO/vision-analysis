import { ImageResponse } from "next/og";
import { getModelById, getModelBenchmarks } from "@/lib/data";
import { getFamilyColor } from "@/lib/utils/colors";

export const runtime = "nodejs";
export const alt = "Model Benchmark Results";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const model = getModelById(params.slug);

  if (!model) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#0a0a0a",
            color: "#ffffff",
            fontSize: 48,
          }}
        >
          Model Not Found
        </div>
      ),
      { ...size }
    );
  }

  const benchmarks = getModelBenchmarks(params.slug);
  const a100Result = benchmarks.find((b) => b.hardware === "a100")?.result;
  const familyColor = getFamilyColor(model.family);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0a0a0a",
          padding: 60,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 60,
              height: 60,
              borderRadius: 12,
              backgroundColor: familyColor,
              marginRight: 24,
            }}
          >
            <span style={{ fontSize: 28, color: "white" }}>
              {model.family.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 48, fontWeight: "bold", color: "white" }}>
              {model.displayName}
            </span>
            <span style={{ fontSize: 24, color: "#888888" }}>
              {model.architecture.type} detector
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 24,
          }}
        >
          {/* mAP */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#1a1a1a",
              borderRadius: 16,
              padding: 32,
            }}
          >
            <span style={{ fontSize: 20, color: "#888888", marginBottom: 8 }}>
              mAP@50-95
            </span>
            <span style={{ fontSize: 64, fontWeight: "bold", color: "#22c55e" }}>
              {a100Result ? a100Result.mAP_50_95.toFixed(1) : "N/A"}%
            </span>
          </div>

          {/* FPS */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#1a1a1a",
              borderRadius: 16,
              padding: 32,
            }}
          >
            <span style={{ fontSize: 20, color: "#888888", marginBottom: 8 }}>
              Throughput (A100)
            </span>
            <span style={{ fontSize: 64, fontWeight: "bold", color: "#3b82f6" }}>
              {a100Result ? Math.round(a100Result.throughputFps) : "N/A"} FPS
            </span>
          </div>

          {/* Params */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#1a1a1a",
              borderRadius: 16,
              padding: 32,
            }}
          >
            <span style={{ fontSize: 20, color: "#888888", marginBottom: 8 }}>
              Parameters
            </span>
            <span style={{ fontSize: 64, fontWeight: "bold", color: "#a855f7" }}>
              {model.specs.paramsM.toFixed(1)}M
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 40,
          }}
        >
          <span style={{ fontSize: 28, fontWeight: "bold", color: "white" }}>
            Vision Analysis
          </span>
          <span style={{ fontSize: 20, color: "#888888" }}>
            visionanalysis.ai
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
