import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vision Analysis - Computer Vision Benchmarks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          justifyContent: "space-between",
        }}
      >
        {/* Main Content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                marginRight: 24,
              }}
            />
            <span
              style={{
                fontSize: 56,
                fontWeight: "bold",
                color: "white",
              }}
            >
              Vision Analysis
            </span>
          </div>

          <span
            style={{
              fontSize: 32,
              color: "#888888",
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Credible and deep analysis of computer vision models.
            Compare YOLO, RT-DETR, and more across hardware.
          </span>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            gap: 48,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 56, fontWeight: "bold", color: "#3b82f6" }}>
              35+
            </span>
            <span style={{ fontSize: 20, color: "#888888" }}>Models</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 56, fontWeight: "bold", color: "#22c55e" }}>
              3
            </span>
            <span style={{ fontSize: 20, color: "#888888" }}>Hardware Configs</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 56, fontWeight: "bold", color: "#a855f7" }}>
              End-to-End
            </span>
            <span style={{ fontSize: 20, color: "#888888" }}>Timing</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: 20, color: "#666666" }}>
            visionanalysis.ai
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
