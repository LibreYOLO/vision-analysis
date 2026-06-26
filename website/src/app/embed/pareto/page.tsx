import { getBenchmarkResults, getHardwareById, getRuntimeById, getModelById } from '@/lib/data';
import { getFamilyColor } from '@/lib/utils/colors';
import type { BenchmarkResult } from '@/lib/types';

interface Props {
  searchParams: Promise<{ models?: string; hw?: string; rt?: string }>;
}

const W = 640;
const H = 400;
const PX1 = 65;
const PX2 = 615;
const PY1 = 20;
const PY2 = 282;
const BG = '#f8fafc';
const GRID = 'rgba(8,145,178,0.13)';
const LABEL = '#64748b';

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

export default async function ParetoEmbed({ searchParams }: Props) {
  const sp = await searchParams;
  const modelsRaw = typeof sp.models === 'string' ? sp.models : '';
  const hw = typeof sp.hw === 'string' ? sp.hw : 'a100';
  const rt = typeof sp.rt === 'string' ? sp.rt : 'tensorrt_fp32';

  const requestedModels = modelsRaw.split(',').map(s => s.trim()).filter(Boolean);
  const allResults = getBenchmarkResults(hw, rt);
  const data: BenchmarkResult[] = requestedModels.length > 0
    ? allResults.filter(r => requestedModels.includes(r.model))
    : allResults;

  const hwMeta = getHardwareById(hw);
  const rtMeta = getRuntimeById(rt);

  if (data.length === 0) {
    return (
      <div
        style={{
          background: BG,
          color: LABEL,
          height: H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        No benchmark data for this configuration.
      </div>
    );
  }

  const displayNames: Record<string, string> = {};
  for (const r of data) {
    if (!displayNames[r.model]) {
      const meta = getModelById(r.model);
      displayNames[r.model] = meta?.displayName ?? r.model;
    }
  }

  const familyGroups = new Map<string, BenchmarkResult[]>();
  for (const r of data) {
    const g = familyGroups.get(r.family) ?? [];
    g.push(r);
    familyGroups.set(r.family, g);
  }
  familyGroups.forEach((pts, f) => {
    familyGroups.set(f, [...pts].sort((a, b) => a.throughputFps - b.throughputFps));
  });

  const families = Array.from(familyGroups.keys());

  const allFps = data.map(r => r.throughputFps);
  const allMap = data.map(r => r.mAP_50_95);
  const fpsMin = Math.min(...allFps);
  const fpsMax = Math.max(...allFps);
  const mapMin = Math.min(...allMap);
  const mapMax = Math.max(...allMap);
  const fpsPad = fpsMax === fpsMin ? (fpsMax || 1) * 0.2 : (fpsMax - fpsMin) * 0.12;
  const mapPad = mapMax === mapMin ? (mapMax || 1) * 0.15 : (mapMax - mapMin) * 0.12;
  const xD: [number, number] = [Math.max(0, fpsMin - fpsPad), fpsMax + fpsPad];
  const yD: [number, number] = [Math.max(0, mapMin - mapPad), mapMax + mapPad];

  const xTks = mkTicks(xD[0], xD[1]);
  const yTks = mkTicks(yD[0], yD[1]);

  const footerText = `visionanalysis.org · ${hwMeta?.displayName ?? hw} · ${rtMeta?.displayName ?? rt}`;
  const yMid = (PY1 + PY2) / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={W} height={H} fill={BG} />

      {yTks.map((t, i) => (
        <line key={`hg${i}`} x1={PX1} y1={ys(t, yD)} x2={PX2} y2={ys(t, yD)} stroke={GRID} strokeWidth={1} />
      ))}
      {xTks.map((t, i) => (
        <line key={`vg${i}`} x1={xs(t, xD)} y1={PY1} x2={xs(t, xD)} y2={PY2} stroke={GRID} strokeWidth={1} />
      ))}

      <line x1={PX1} y1={PY1} x2={PX1} y2={PY2} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={PX1} y1={PY2} x2={PX2} y2={PY2} stroke="#cbd5e1" strokeWidth={1} />

      {yTks.map((t, i) => (
        <g key={`yt${i}`}>
          <line x1={PX1 - 4} y1={ys(t, yD)} x2={PX1} y2={ys(t, yD)} stroke={LABEL} strokeWidth={1} />
          <text x={PX1 - 7} y={ys(t, yD) + 4} textAnchor="end" fill={LABEL} fontSize={9} fontFamily="'JetBrains Mono', monospace">
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {xTks.map((t, i) => (
        <g key={`xt${i}`}>
          <line x1={xs(t, xD)} y1={PY2} x2={xs(t, xD)} y2={PY2 + 4} stroke={LABEL} strokeWidth={1} />
          <text x={xs(t, xD)} y={PY2 + 14} textAnchor="middle" fill={LABEL} fontSize={9} fontFamily="'JetBrains Mono', monospace">
            {Math.round(t)}
          </text>
        </g>
      ))}

      <text x={(PX1 + PX2) / 2} y={PY2 + 28} textAnchor="middle" fill={LABEL} fontSize={10} fontFamily="'JetBrains Mono', monospace">
        Throughput (FPS)
      </text>
      <text
        x={11}
        y={yMid}
        textAnchor="middle"
        fill={LABEL}
        fontSize={10}
        fontFamily="'JetBrains Mono', monospace"
        transform={`rotate(-90, 11, ${yMid})`}
      >
        mAP@50-95
      </text>

      {families.map(family => {
        const pts = familyGroups.get(family)!;
        if (pts.length < 2) return null;
        const color = getFamilyColor(family);
        const pStr = pts
          .map(r => `${xs(r.throughputFps, xD).toFixed(1)},${ys(r.mAP_50_95, yD).toFixed(1)}`)
          .join(' ');
        return (
          <polyline
            key={`pl${family}`}
            points={pStr}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.55}
          />
        );
      })}

      {families.map(family => {
        const color = getFamilyColor(family);
        const pts = familyGroups.get(family)!;
        return pts.map(r => (
          <circle
            key={r.model}
            cx={xs(r.throughputFps, xD)}
            cy={ys(r.mAP_50_95, yD)}
            r={5}
            fill={color}
            stroke={BG}
            strokeWidth={1.5}
          >
            <title>{`${displayNames[r.model] ?? r.model} · ${r.throughputFps.toFixed(1)} FPS · ${r.mAP_50_95.toFixed(1)}% mAP`}</title>
          </circle>
        ));
      })}

      {families.map((family, i) => {
        const color = getFamilyColor(family);
        const col = i % 2;
        const row = Math.floor(i / 2);
        const lx = PX1 + col * 150;
        const ly = PY2 + 48 + row * 18;
        return (
          <g key={`leg${family}`}>
            <circle cx={lx + 5} cy={ly} r={4} fill={color} />
            <text x={lx + 14} y={ly + 4} fill={LABEL} fontSize={10} fontFamily="'JetBrains Mono', monospace">
              {family}
            </text>
          </g>
        );
      })}

      <text x={W / 2} y={H - 5} textAnchor="middle" fill={LABEL} fontSize={9} fontFamily="'JetBrains Mono', monospace" opacity={0.6}>
        {footerText}
      </text>
    </svg>
  );
}
