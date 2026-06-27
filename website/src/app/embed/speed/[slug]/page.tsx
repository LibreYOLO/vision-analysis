import { getModels, getBenchmarkResults, getModelById, getHardwareById, getRuntimeById } from '@/lib/data';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ hw?: string; rt?: string }>;
}

export async function generateStaticParams() {
  return getModels().map(m => ({ slug: m.id }));
}

export default async function SpeedEmbed({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const hw = typeof sp.hw === 'string' ? sp.hw : 'a100';
  const rt = typeof sp.rt === 'string' ? sp.rt : 'pytorch_fp32';

  const modelMeta = getModelById(slug);
  const hwMeta = getHardwareById(hw);
  const rtMeta = getRuntimeById(rt);
  const results = getBenchmarkResults(hw, rt);
  const result = results.find(r => r.model === slug);

  const noData = (msg: string) => (
    <div
      style={{
        background: '#f8fafc',
        color: '#94a3b8',
        height: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontSize: 13,
        padding: 16,
      }}
    >
      {msg}
    </div>
  );

  if (!result) return noData('No benchmark data found for this model and configuration.');

  const hasTiming = result.preprocessMs > 0 || result.inferenceMs > 0 || result.postprocessMs > 0;
  if (!hasTiming) return noData('Timing breakdown not available for this benchmark.');

  const barTotal = result.preprocessMs + result.inferenceMs + result.postprocessMs;
  const prePct = (result.preprocessMs / barTotal) * 100;
  const infPct = (result.inferenceMs / barTotal) * 100;
  const postPct = (result.postprocessMs / barTotal) * 100;

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#1e293b',
        padding: '16px 18px',
        minHeight: 220,
        boxSizing: 'border-box' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        fontFamily: "'Outfit', system-ui, sans-serif",
        borderTop: '3px solid #0891b2',
      }}
    >
      <div style={{ fontSize: 13, color: '#0f172a', marginBottom: 14, fontWeight: 600 }}>
        {modelMeta?.displayName ?? slug}
        <span style={{ marginLeft: 10, color: '#94a3b8', fontWeight: 400, fontSize: 11 }}>
          {hwMeta?.displayName ?? hw} · {rtMeta?.displayName ?? rt}
        </span>
      </div>

      <div
        style={{
          height: 28,
          display: 'flex',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 14,
          gap: 2,
        }}
      >
        {prePct > 0 && (
          <div
            title={`Preprocess: ${result.preprocessMs.toFixed(1)}ms`}
            style={{ width: `${prePct}%`, background: '#3b82f6', minWidth: 2 }}
          />
        )}
        {infPct > 0 && (
          <div
            title={`Inference: ${result.inferenceMs.toFixed(1)}ms`}
            style={{ width: `${infPct}%`, background: '#06b6d4', minWidth: 2 }}
          />
        )}
        {postPct > 0 && (
          <div
            title={`Postprocess: ${result.postprocessMs.toFixed(1)}ms`}
            style={{ width: `${postPct}%`, background: '#f97316', minWidth: 2 }}
          />
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { label: 'Preprocess', value: `${result.preprocessMs.toFixed(1)}ms`, color: '#3b82f6' },
          { label: 'Inference', value: `${result.inferenceMs.toFixed(1)}ms`, color: '#06b6d4' },
          { label: 'Postprocess', value: `${result.postprocessMs.toFixed(1)}ms`, color: '#f97316' },
          { label: 'Total', value: `${result.totalMs.toFixed(1)}ms`, color: '#0f172a' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{ background: '#f8fafc', padding: '7px 10px', borderRadius: 10, border: '1px solid #e2e8f0' }}
          >
            <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 3, fontWeight: 500 }}>
              {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#64748b', flexWrap: 'wrap' as const }}>
        {[
          { label: 'Preprocess', color: '#3b82f6' },
          { label: 'Inference', color: '#06b6d4' },
          { label: 'Postprocess (NMS)', color: '#f97316' },
        ].map(({ label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: color, display: 'inline-block', borderRadius: 3 }} />
            {label}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 10, fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ color: '#0891b2', fontWeight: 500 }}>visionanalysis.org</span>
      </div>
    </div>
  );
}
