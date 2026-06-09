import { getModels, getModelById, getModelBenchmarks } from "@/lib/data";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getModels().map((model) => ({ slug: model.id }));
}

const FONT_STACK = "Verdana,Geneva,DejaVu Sans,sans-serif";
const CHAR_WIDTH = 6.7; // approx average char width at 11px Verdana
const PAD = 8;

function segmentWidth(text: string): number {
  return Math.round(text.length * CHAR_WIDTH + PAD * 2);
}

function badgeSvg(label: string, value: string, valueColor: string): string {
  const labelW = segmentWidth(label);
  const valueW = segmentWidth(value);
  const width = labelW + valueW;
  const title = `${label}: ${value}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${title}">
  <title>${title}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#0a0a0f"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${valueColor}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="${FONT_STACK}" font-size="11">
    <text x="${labelW / 2}" y="14">${label}</text>
    <text x="${labelW + valueW / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

function svgResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  // Accept both /badge/yolox-s and /badge/yolox-s.svg
  const slug = rawSlug.replace(/\.svg$/, "");
  const model = getModelById(slug);

  if (!model) {
    return svgResponse(badgeSvg("Vision Analysis", "unknown model", "#9f9f9f"), 404);
  }

  const benchmarks = getModelBenchmarks(slug);
  const best =
    benchmarks.find((b) => b.hardware === "a100" && b.result) ??
    benchmarks.find((b) => b.result);
  const result = best?.result;

  if (!result) {
    return svgResponse(badgeSvg("Vision Analysis", "benchmark pending", "#9f9f9f"));
  }

  const value = `mAP ${result.mAP_50_95.toFixed(1)} | ${Math.round(result.throughputFps)} FPS`;
  return svgResponse(badgeSvg("Vision Analysis", value, "#16a34a"));
}
