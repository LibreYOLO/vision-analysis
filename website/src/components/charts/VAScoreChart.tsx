interface VAScoreEntry {
  model: string;
  score: number;
  color: string;
  logo: string;
}

const COMPANY_COLORS: Record<string, string> = {
  Ultralytics: "#0B23A9",
  Tsinghua: "#7c3aed",
  "Academia Sinica": "#E8590C",
  Megvii: "#06b6d4",
  Roboflow: "#22c55e",
  Baidu: "#de2910",
};

const VA_SCORES: VAScoreEntry[] = [
  { model: "RF-DETR-L", score: 72, color: COMPANY_COLORS.Roboflow, logo: "/logos/roboflow.png" },
  { model: "YOLO11-M", score: 71, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "YOLOv10-M", score: 69, color: COMPANY_COLORS.Tsinghua, logo: "/logos/tsinghua.webp" },
  { model: "YOLOv8-M", score: 67, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "RT-DETR-R50", score: 66, color: COMPANY_COLORS.Baidu, logo: "/logos/libreyolo.png" },
  { model: "YOLOv9-C", score: 65, color: COMPANY_COLORS["Academia Sinica"], logo: "/logos/academia-sinica.png" },
  { model: "RF-DETR-B", score: 64, color: COMPANY_COLORS.Roboflow, logo: "/logos/roboflow.png" },
  { model: "YOLO11-S", score: 63, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "YOLOv10-S", score: 61, color: COMPANY_COLORS.Tsinghua, logo: "/logos/tsinghua.webp" },
  { model: "YOLOv8-S", score: 59, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "RT-DETR-R18", score: 58, color: COMPANY_COLORS.Baidu, logo: "/logos/libreyolo.png" },
  { model: "YOLOv9-S", score: 57, color: COMPANY_COLORS["Academia Sinica"], logo: "/logos/academia-sinica.png" },
  { model: "YOLOX-L", score: 55, color: COMPANY_COLORS.Megvii, logo: "/logos/megvii.png" },
  { model: "YOLO11-L", score: 53, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "YOLOv8-L", score: 51, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "YOLOv10-L", score: 50, color: COMPANY_COLORS.Tsinghua, logo: "/logos/tsinghua.webp" },
  { model: "YOLOv9-M", score: 48, color: COMPANY_COLORS["Academia Sinica"], logo: "/logos/academia-sinica.png" },
  { model: "YOLOX-M", score: 46, color: COMPANY_COLORS.Megvii, logo: "/logos/megvii.png" },
  { model: "RT-DETR-R101", score: 44, color: COMPANY_COLORS.Baidu, logo: "/logos/libreyolo.png" },
  { model: "YOLOX-S", score: 43, color: COMPANY_COLORS.Megvii, logo: "/logos/megvii.png" },
  { model: "YOLOv9-T", score: 40, color: COMPANY_COLORS["Academia Sinica"], logo: "/logos/academia-sinica.png" },
  { model: "YOLO11-N", score: 37, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "YOLOv8-N", score: 35, color: COMPANY_COLORS.Ultralytics, logo: "/logos/ultralytics.jpeg" },
  { model: "YOLOv10-N", score: 33, color: COMPANY_COLORS.Tsinghua, logo: "/logos/tsinghua.webp" },
  { model: "YOLOX-Nano", score: 28, color: COMPANY_COLORS.Megvii, logo: "/logos/megvii.png" },
];

const BAR_WIDTH = 26;
const BAR_SPACING = 44;
const CHART_HEIGHT = 165;
const MAX_SCORE = 100;
const GRID_LINES = 7;

export function VAScoreChart() {
  const chartWidth = VA_SCORES.length * BAR_SPACING;
  const gridSpacing = CHART_HEIGHT / (GRID_LINES + 1);

  return (
    <div className="chart-card">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {VA_SCORES.length} of {VA_SCORES.length} models
          </span>
          <a
            href="/about#va-score"
            title="How the VA v1 Score is calculated"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand"
          >
            i
          </a>
        </div>
        <span className="text-xs italic text-muted-foreground">Vision Analysis</span>
      </div>

      <div className="overflow-x-auto px-4 pb-0">
        <svg
          width={chartWidth + 20}
          height={CHART_HEIGHT + 130}
          viewBox={`0 0 ${chartWidth + 20} ${CHART_HEIGHT + 130}`}
          className="w-full"
          style={{ minWidth: chartWidth + 20 }}
        >
          <g transform="translate(10, 5)">
            {Array.from({ length: GRID_LINES }).map((_, index) => {
              const y = gridSpacing * (index + 1);
              return (
                <line
                  key={index}
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  style={{ stroke: "var(--border)" }}
                  strokeWidth={1}
                />
              );
            })}

            {VA_SCORES.map((entry, index) => {
              const centerX = index * BAR_SPACING + BAR_SPACING / 2;
              const barHeight = Math.max(24, Math.round((entry.score / MAX_SCORE) * CHART_HEIGHT));
              const barX = centerX - BAR_WIDTH / 2;
              const barY = CHART_HEIGHT - barHeight;

              return (
                <g key={entry.model}>
                  <rect
                    x={barX}
                    y={barY}
                    width={BAR_WIDTH}
                    height={barHeight}
                    rx={3}
                    ry={3}
                    fill={entry.color}
                  />
                  <text
                    x={centerX}
                    y={barY + barHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    fontWeight={700}
                    fill="white"
                    style={{ pointerEvents: "none", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                  >
                    {entry.score}
                  </text>
                  <image
                    href={entry.logo}
                    x={centerX - 10}
                    y={CHART_HEIGHT + 6}
                    width={20}
                    height={15}
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <text
                    x={centerX}
                    y={CHART_HEIGHT + 30}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={11}
                    style={{ fill: "var(--muted-foreground)", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                    transform={`translate(-6, 24) rotate(-62, ${centerX}, ${CHART_HEIGHT + 30})`}
                  >
                    {entry.model}
                  </text>
                </g>
              );
            })}

            <line
              x1={0}
              y1={CHART_HEIGHT}
              x2={chartWidth}
              y2={CHART_HEIGHT}
              style={{ stroke: "var(--border)" }}
              strokeWidth={1}
            />
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border px-4 pt-1 pb-3">
        {[
          { label: "Ultralytics", sub: "YOLO11, YOLOv8", color: COMPANY_COLORS.Ultralytics },
          { label: "Roboflow", sub: "RF-DETR", color: COMPANY_COLORS.Roboflow },
          { label: "Tsinghua", sub: "YOLOv10", color: COMPANY_COLORS.Tsinghua },
          { label: "Baidu", sub: "RT-DETR", color: COMPANY_COLORS.Baidu },
          { label: "Academia Sinica", sub: "YOLOv9", color: COMPANY_COLORS["Academia Sinica"] },
          { label: "Megvii", sub: "YOLOX", color: COMPANY_COLORS.Megvii },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 flex-shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-muted-foreground">({item.sub})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
