'use client';
import { useState, useRef } from 'react';
import { T, type EmbedTheme } from '@/lib/embedTheme';

export interface ChartPoint {
  id: string;
  displayName: string;
  family: string;
  params: number;
  mAP: number;
  cx: number;
  cy: number;
  fill: string;
  highlighted: boolean;
}

export interface FamilyLine {
  family: string;
  color: string;
  svgPoints: string;
}

interface AxisTick {
  pos: number;
  label: string;
}

interface Props {
  width: number;
  height: number;
  px1: number;
  px2: number;
  py1: number;
  py2: number;
  bgPoints: ChartPoint[];
  hlPoints: ChartPoint[];
  familyLines: FamilyLine[];
  xTicks: AxisTick[];
  yTicks: AxisTick[];
  hlFamilies: string[];
  hasBackground: boolean;
  title: string;
  subtitle: string;
  theme: EmbedTheme;
}

export function ScatterChart({
  width, height, px1, px2, py1, py2,
  bgPoints, hlPoints, familyLines,
  xTicks, yTicks,
  hlFamilies, hasBackground,
  title, subtitle, theme,
}: Props) {
  const [hovered, setHovered] = useState<ChartPoint | null>(null);
  const [brandHover, setBrandHover] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function openModel(id: string) {
    window.open(`/model/${id}`, '_blank', 'noopener,noreferrer');
  }

  const yMid = (py1 + py2) / 2;

  // Stagger highlighted labels above/below by x-order so neighbours don't collide.
  const hlOrder = new Map<string, number>();
  [...hlPoints].sort((a, b) => a.cx - b.cx).forEach((p, i) => hlOrder.set(p.id, i));

  const panelColor = hovered
    ? (hovered.highlighted ? hovered.fill : T.textStrong)
    : T.textStrong;

  // Centered legend: highlighted families, plus an "other models" swatch.
  // Widths are estimated from label length (~6px per monospace char at 10px)
  // so the whole row can be centered without measuring the DOM.
  const legendItems = [
    ...hlFamilies.map(f => ({
      label: f,
      color: hlPoints.find(p => p.family === f)?.fill ?? T.textMuted,
      faded: false,
    })),
    ...(hasBackground ? [{ label: 'other models', color: T.greyDot, faded: true }] : []),
  ];
  const LEG_GAP = 22;
  const legItemW = (label: string) => 10 + label.length * 6;
  const legTotal =
    legendItems.reduce((s, it) => s + legItemW(it.label), 0) +
    LEG_GAP * Math.max(0, legendItems.length - 1);
  const legY = py2 + 50;
  let legCursor = (width - legTotal) / 2;
  const legendPositioned = legendItems.map(it => {
    const x = legCursor;
    legCursor += legItemW(it.label) + LEG_GAP;
    return { ...it, x };
  });

  return (
    <div
      ref={wrapperRef}
      data-theme={theme}
      style={{ position: 'relative', lineHeight: 0, background: T.bg }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="tipshadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect width={width} height={height} fill={T.bg} />

        {/* Figure header: title + subtitle (left), source link (right) */}
        <text x={px1} y={27} fill={T.textStrong} fontSize={15} fontWeight={700} fontFamily="'Outfit', system-ui, sans-serif">
          {title}
        </text>
        <text x={px1} y={45} fill={T.textMuted} fontSize={10.5} fontFamily="'Outfit', system-ui, sans-serif">
          {subtitle}
        </text>
        <a
          href="https://visionanalysis.org"
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setBrandHover(true)}
          onMouseLeave={() => setBrandHover(false)}
        >
          <text
            x={px2}
            y={27}
            textAnchor="end"
            fill={T.accent}
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            style={{ cursor: 'pointer', textDecoration: brandHover ? 'underline' : 'none' }}
          >
            visionanalysis.org
          </text>
        </a>

        {yTicks.map((t, i) => (
          <line key={`hg${i}`} x1={px1} y1={t.pos} x2={px2} y2={t.pos} stroke={T.grid} strokeWidth={1} />
        ))}
        {xTicks.map((t, i) => (
          <line key={`vg${i}`} x1={t.pos} y1={py1} x2={t.pos} y2={py2} stroke={T.grid} strokeWidth={1} />
        ))}

        <line x1={px1} y1={py1} x2={px1} y2={py2} stroke={T.axis} strokeWidth={1} />
        <line x1={px1} y1={py2} x2={px2} y2={py2} stroke={T.axis} strokeWidth={1} />

        {yTicks.map((t, i) => (
          <g key={`yt${i}`}>
            <line x1={px1 - 4} y1={t.pos} x2={px1} y2={t.pos} stroke={T.textMuted} strokeWidth={1} />
            <text x={px1 - 7} y={t.pos + 4} textAnchor="end" fill={T.textMuted} fontSize={9} fontFamily="'JetBrains Mono', monospace">
              {t.label}
            </text>
          </g>
        ))}

        {xTicks.map((t, i) => (
          <g key={`xt${i}`}>
            <line x1={t.pos} y1={py2} x2={t.pos} y2={py2 + 4} stroke={T.textMuted} strokeWidth={1} />
            <text x={t.pos} y={py2 + 14} textAnchor="middle" fill={T.textMuted} fontSize={9} fontFamily="'JetBrains Mono', monospace">
              {t.label}
            </text>
          </g>
        ))}

        <text x={(px1 + px2) / 2} y={py2 + 28} textAnchor="middle" fill={T.textMuted} fontSize={10} fontFamily="'JetBrains Mono', monospace">
          Parameters (M)
        </text>
        <text
          x={11}
          y={yMid}
          textAnchor="middle"
          fill={T.textMuted}
          fontSize={10}
          fontFamily="'JetBrains Mono', monospace"
          transform={`rotate(-90, 11, ${yMid})`}
        >
          mAP@50-95
        </text>

        {familyLines.map(({ family, color, svgPoints }) => (
          <polyline
            key={`hl-line-${family}`}
            points={svgPoints}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeDasharray="4 3"
          />
        ))}

        {bgPoints.map(p => {
          const isHovered = hovered?.id === p.id;
          return (
            <circle
              key={`bg-${p.id}`}
              cx={p.cx}
              cy={p.cy}
              r={isHovered ? 6 : 4}
              fill={isHovered ? T.greyDotHover : T.greyDot}
              stroke={isHovered ? T.strokeDot : 'none'}
              strokeWidth={isHovered ? 1.5 : 0}
              opacity={isHovered ? 1 : 0.65}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(h => (h?.id === p.id ? null : h))}
              onClick={() => openModel(p.id)}
            />
          );
        })}

        {hlPoints.map(p => {
          const isHovered = hovered?.id === p.id;
          const below = (hlOrder.get(p.id) ?? 0) % 2 === 1;
          let labelY = below ? p.cy + 22 : p.cy - 13;
          if (!below && p.cy < py1 + 26) labelY = p.cy + 22;
          return (
            <g key={`hl-${p.id}`} style={{ cursor: 'pointer' }}>
              {isHovered && (
                <circle cx={p.cx} cy={p.cy} r={12} fill="none" stroke={p.fill} strokeWidth={1.5} opacity={0.5} />
              )}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={isHovered ? 8 : 7}
                fill={p.fill}
                stroke={T.strokeDot}
                strokeWidth={1.5}
                filter="url(#glow)"
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(h => (h?.id === p.id ? null : h))}
                onClick={() => openModel(p.id)}
              />
              <text
                x={p.cx}
                y={labelY}
                textAnchor="middle"
                fill={p.fill}
                fontSize={10}
                fontFamily="'Outfit', system-ui, sans-serif"
                fontWeight="600"
                opacity={isHovered ? 0 : 1}
                style={{ pointerEvents: 'none' }}
              >
                {p.displayName}
              </text>
            </g>
          );
        })}

        {legendPositioned.map(it => (
          <g key={`leg-${it.label}`}>
            <circle cx={it.x + 4} cy={legY} r={4} fill={it.color} opacity={it.faded ? 0.65 : 1} />
            <text x={it.x + 12} y={legY + 4} fill={T.textMuted} fontSize={10} fontFamily="'JetBrains Mono', monospace">
              {it.label}
            </text>
          </g>
        ))}

        {/* Tooltip anchored next to the hovered ball, flips to stay in-bounds */}
        {hovered && (() => {
          const PW = 150;
          const PH = 66;
          const off = 14;
          let bx = hovered.cx + off;
          if (bx + PW > width - 6) bx = hovered.cx - off - PW;
          let by = hovered.cy - PH / 2;
          if (by < py1 - 4) by = py1 - 4;
          if (by + PH > height - 16) by = height - 16 - PH;
          const tx = bx + 13;
          return (
            <g pointerEvents="none" filter="url(#tipshadow)">
              <rect x={bx} y={by} width={PW} height={PH} rx={7} fill={T.panel} stroke={T.border} strokeWidth={1} />
              <rect x={bx} y={by} width={4} height={PH} rx={2} fill={panelColor} />
              <text x={tx} y={by + 19} fontSize={12.5} fontWeight={700} fill={panelColor} fontFamily="'Outfit', system-ui, sans-serif">
                {hovered.displayName}
              </text>
              <text x={tx} y={by + 35} fontSize={11} fill={T.textBody} fontFamily="'JetBrains Mono', monospace">
                {hovered.params.toFixed(1)}M
                <tspan fill={T.textFaint} fontFamily="'Outfit', system-ui, sans-serif"> params</tspan>
              </text>
              <text x={tx} y={by + 49} fontSize={11} fill={T.textBody} fontFamily="'JetBrains Mono', monospace">
                {hovered.mAP.toFixed(1)}%
                <tspan fill={T.textFaint} fontFamily="'Outfit', system-ui, sans-serif"> mAP@50-95</tspan>
              </text>
              <text x={tx} y={by + 61} fontSize={8.5} fill={T.textFaint} fontFamily="'Outfit', system-ui, sans-serif">
                Click to open model page
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
