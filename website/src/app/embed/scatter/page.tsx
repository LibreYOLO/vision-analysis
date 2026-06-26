import { getModels, getBenchmarkResults, getHardwareById, getRuntimeById } from '@/lib/data';
import { getFamilyColor } from '@/lib/utils/colors';
import { parseTheme, bodyBgStyle, T } from '@/lib/embedTheme';
import { ScatterChart, type ChartPoint, type FamilyLine } from './ScatterChart';

interface Props {
  searchParams: Promise<{ highlight?: string; hw?: string; rt?: string; task?: string; theme?: string }>;
}

const W = 640;
const H = 400;
const PX1 = 65;
const PX2 = 615;
const PY1 = 22;
const PY2 = 282;

function xs(v: number, domain: [number, number]): number {
  if (domain[1] === domain[0]) return (PX1 + PX2) / 2;
  return PX1 + ((v - domain[0]) / (domain[1] - domain[0])) * (PX2 - PX1);
}

function ys(v: number, domain: [number, number]): number {
  if (domain[1] === domain[0]) return (PY1 + PY2) / 2;
  return PY2 - ((v - domain[0]) / (domain[1] - domain[0])) * (PY2 - PY1);
}

function mkTicks(min: number, max: number, n = 5): number[] {
  return Array.from({ length: n }, (_, i) => min + (i * (max - min)) / (n - 1));
}

export default async function ScatterEmbed({ searchParams }: Props) {
  const sp = await searchParams;
  const highlightRaw = typeof sp.highlight === 'string' ? sp.highlight : '';
  const hw = typeof sp.hw === 'string' ? sp.hw : null;
  const rt = typeof sp.rt === 'string' ? sp.rt : null;
  const taskFilter = typeof sp.task === 'string' ? sp.task : 'detection';
  const theme = parseTheme(sp.theme);

  const highlightIds = new Set(
    highlightRaw.split(',').map(s => s.trim()).filter(Boolean)
  );

  const hwMeta = hw ? getHardwareById(hw) : null;
  const rtMeta = rt ? getRuntimeById(rt) : null;

  const allModels = getModels().filter(m => !taskFilter || m.task === taskFilter);

  const measuredMap = new Map<string, { mAP: number; params: number }>();
  if (hw && rt) {
    for (const r of getBenchmarkResults(hw, rt)) {
      measuredMap.set(r.model, { mAP: r.mAP_50_95, params: r.paramsM });
    }
  }

  type RawPoint = {
    id: string;
    displayName: string;
    family: string;
    params: number;
    mAP: number;
    highlighted: boolean;
  };

  const rawPoints: RawPoint[] = [];
  for (const m of allModels) {
    const measured = measuredMap.get(m.id);
    let mAP: number;
    if (measured) {
      mAP = measured.mAP;
    } else if (m.paperReportedMap !== undefined) {
      mAP = m.paperReportedMap;
    } else {
      continue;
    }
    const params = measured?.params ?? m.specs.paramsM;
    if (params <= 0 || mAP <= 0) continue;
    rawPoints.push({ id: m.id, displayName: m.displayName, family: m.family, params, mAP, highlighted: highlightIds.has(m.id) });
  }

  if (rawPoints.length === 0) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: bodyBgStyle(theme) }} />
        <div
          data-theme={theme}
          style={{
            background: T.bg,
            color: T.textMuted,
            height: H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: 13,
          }}
        >
          No data available for this configuration.
        </div>
      </>
    );
  }

  // Axis domains
  const allParams = rawPoints.map(p => p.params);
  const allMAP = rawPoints.map(p => p.mAP);
  const pMin = Math.min(...allParams);
  const pMax = Math.max(...allParams);
  const mMin = Math.min(...allMAP);
  const mMax = Math.max(...allMAP);
  const pPad = pMax === pMin ? pMax * 0.2 : (pMax - pMin) * 0.1;
  const mPad = mMax === mMin ? mMax * 0.15 : (mMax - mMin) * 0.12;
  const xD: [number, number] = [Math.max(0, pMin - pPad), pMax + pPad];
  const yD: [number, number] = [Math.max(0, mMin - mPad), mMax + mPad];

  // Pre-compute SVG positions + colors
  const toChartPoint = (p: RawPoint): ChartPoint => ({
    ...p,
    cx: xs(p.params, xD),
    cy: ys(p.mAP, yD),
    fill: p.highlighted ? getFamilyColor(p.family) : T.greyDot,
  });

  const bgPoints = rawPoints.filter(p => !p.highlighted).map(toChartPoint);
  const hlPoints = rawPoints.filter(p => p.highlighted).map(toChartPoint);

  // Group highlighted by family for connecting lines
  const hlFamilyMap = new Map<string, ChartPoint[]>();
  for (const p of hlPoints) {
    const g = hlFamilyMap.get(p.family) ?? [];
    g.push(p);
    hlFamilyMap.set(p.family, g);
  }

  const familyLines: FamilyLine[] = [];
  hlFamilyMap.forEach((pts, family) => {
    if (pts.length < 2) return;
    const sorted = [...pts].sort((a, b) => a.params - b.params);
    familyLines.push({
      family,
      color: getFamilyColor(family),
      svgPoints: sorted.map(p => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' '),
    });
  });

  // Axis ticks
  const xTickVals = mkTicks(xD[0], xD[1]);
  const yTickVals = mkTicks(yD[0], yD[1]);

  const xTicks = xTickVals.map(v => ({ pos: xs(v, xD), label: `${Math.round(v)}M` }));
  const yTicks = yTickVals.map(v => ({ pos: ys(v, yD), label: v.toFixed(1) }));

  const hlFamilies = Array.from(hlFamilyMap.keys());
  const sourceNote = hw && rt
    ? `${hwMeta?.displayName ?? hw} · ${rtMeta?.displayName ?? rt}`
    : 'paper-reported mAP';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: bodyBgStyle(theme) }} />
      <ScatterChart
        width={W}
        height={H}
        px1={PX1}
        px2={PX2}
        py1={PY1}
        py2={PY2}
        bgPoints={bgPoints}
        hlPoints={hlPoints}
        familyLines={familyLines}
        xTicks={xTicks}
        yTicks={yTicks}
        hlFamilies={hlFamilies}
        hasBackground={bgPoints.length > 0}
        sourceNote={sourceNote}
        footerText={`visionanalysis.org · COCO val2017 · ${sourceNote}`}
        theme={theme}
      />
    </>
  );
}
