import { getModels, getModelById, getModelBenchmarks, getHardwareById } from '@/lib/data';
import { getFamilyColor } from '@/lib/utils/colors';
import { formatNumber, formatPercent, formatMs } from '@/lib/utils/format';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getModels().map(m => ({ slug: m.id }));
}

function StatBox({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: '#f1f5f9',
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: '#94a3b8',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
          marginBottom: 3,
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: accent ? '#0891b2' : '#1e293b',
      }}>
        {value}
      </div>
    </div>
  );
}

export default async function ModelCardEmbed({ params }: Props) {
  const { slug } = await params;
  const model = getModelById(slug);

  if (!model) {
    return (
      <div
        style={{
          background: '#f8fafc',
          color: '#94a3b8',
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        Model not found.
      </div>
    );
  }

  const benchmarks = getModelBenchmarks(slug);
  const best = [...benchmarks].sort((a, b) => {
    const mapDiff = b.result.mAP_50_95 - a.result.mAP_50_95;
    return mapDiff !== 0 ? mapDiff : b.result.throughputFps - a.result.throughputFps;
  })[0];

  const familyColor = getFamilyColor(model.family);
  const hwMeta = best ? getHardwareById(best.hardware) : undefined;

  const badge = (text: string, bg: string, color: string) => (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontWeight: 500,
        marginRight: 5,
        marginBottom: 5,
        border: '1px solid transparent',
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#1e293b',
        padding: '18px 20px',
        minHeight: 280,
        boxSizing: 'border-box' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        borderTop: '3px solid #0891b2',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, flex: 1 }}>
        <div>
          <h1
            style={{
              fontSize: 21,
              fontWeight: 700,
              marginBottom: 10,
              lineHeight: 1.2,
              fontFamily: "'Outfit', system-ui, sans-serif",
              color: '#0f172a',
            }}
          >
            {model.displayName}
          </h1>
          <div>
            {badge(model.family, familyColor, 'white')}
            {badge(model.task, '#f1f5f9', '#64748b')}
            {model.paperReportedMap !== undefined &&
              badge(`Paper: ${model.paperReportedMap}% mAP`, 'rgba(8,145,178,0.08)', '#0891b2')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <StatBox label="Best mAP" value={best ? formatPercent(best.result.mAP_50_95) : 'N/A'} accent />
          <StatBox label="Best FPS" value={best ? formatNumber(best.result.throughputFps, 1) : 'N/A'} />
          <StatBox label="Latency" value={best ? formatMs(best.result.totalMs) : 'N/A'} />
          <StatBox label="Params" value={`${formatNumber(model.specs.paramsM, 1)}M`} />
          <StatBox label="GFLOPs" value={formatNumber(model.specs.flopsG, 1)} />
          <StatBox label="License" value={model.license} />
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid #f1f5f9',
          fontSize: 10,
          color: '#94a3b8',
          fontFamily: "'Outfit', system-ui, sans-serif",
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{best ? `Measured on ${hwMeta?.displayName ?? best.hardware}` : 'Not yet benchmarked'}</span>
        <span style={{ color: '#0891b2', fontWeight: 500 }}>visionanalysis.org</span>
      </div>
    </div>
  );
}
