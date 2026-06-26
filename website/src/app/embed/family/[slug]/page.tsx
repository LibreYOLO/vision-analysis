import type { CSSProperties } from 'react';
import {
  getAllFamilies,
  getModelsByFamily,
  getBenchmarkResults,
  getFamilyById,
  getHardwareById,
  getRuntimeById,
} from '@/lib/data';
import { getFamilyColor } from '@/lib/utils/colors';
import { formatNumber, formatPercent, formatMs } from '@/lib/utils/format';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ hw?: string; rt?: string }>;
}

export async function generateStaticParams() {
  return getAllFamilies().map(f => ({ slug: f.id }));
}

export default async function FamilyTableEmbed({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const hw = typeof sp.hw === 'string' ? sp.hw : 'a100';
  const rt = typeof sp.rt === 'string' ? sp.rt : 'pytorch_fp32';

  const family = getFamilyById(slug);
  const models = getModelsByFamily(slug).sort((a, b) => a.specs.paramsM - b.specs.paramsM);
  const results = getBenchmarkResults(hw, rt);
  const hwMeta = getHardwareById(hw);
  const rtMeta = getRuntimeById(rt);
  const familyColor = getFamilyColor(slug);

  const rows = models.map(m => ({
    model: m,
    result: results.find(r => r.model === m.id) ?? null,
  }));

  const th: CSSProperties = {
    textAlign: 'left',
    padding: '8px 10px',
    fontWeight: 600,
    fontSize: 11,
    color: '#64748b',
    fontFamily: "'Outfit', system-ui, sans-serif",
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  };
  const thR: CSSProperties = { ...th, textAlign: 'right' };
  const td: CSSProperties = {
    padding: '9px 10px',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
  };
  const tdR: CSSProperties = { ...td, textAlign: 'right' };

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#1e293b',
        padding: '0',
        minHeight: '100%',
        boxSizing: 'border-box' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        borderTop: `3px solid ${familyColor}`,
      }}
    >
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
      }}>
        <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
          {family?.displayName ?? slug}
        </span>
        <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 11, color: '#94a3b8' }}>
          {hwMeta?.displayName ?? hw} · {rtMeta?.displayName ?? rt}
        </span>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: 13,
          }}
        >
          No models found for this family.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Model</th>
                <th style={thR}>Params</th>
                <th style={thR}>GFLOPs</th>
                <th style={thR}>Paper mAP</th>
                <th style={thR}>Measured mAP</th>
                <th style={thR}>FPS</th>
                <th style={thR}>Latency</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ model: m, result }) => (
                <tr key={m.id} style={{ background: 'transparent' }}>
                  <td style={td}>
                    <a
                      href={`/model/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: familyColor, textDecoration: 'none', fontWeight: 600 }}
                    >
                      {m.displayName}
                    </a>
                  </td>
                  <td style={tdR}>{formatNumber(m.specs.paramsM, 1)}M</td>
                  <td style={tdR}>{formatNumber(m.specs.flopsG, 1)}</td>
                  <td style={tdR}>
                    {m.paperReportedMap !== undefined ? formatPercent(m.paperReportedMap) : '-'}
                  </td>
                  <td style={tdR}>{result ? formatPercent(result.mAP_50_95) : '-'}</td>
                  <td style={tdR}>{result ? formatNumber(result.throughputFps, 1) : '-'}</td>
                  <td style={tdR}>{result ? formatMs(result.totalMs) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          padding: '8px 14px',
          fontSize: 10,
          color: '#94a3b8',
          fontFamily: "'Outfit', system-ui, sans-serif",
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>COCO val2017 · {hwMeta?.displayName ?? hw} · {rtMeta?.displayName ?? rt}</span>
        <span style={{ color: '#0891b2', fontWeight: 500 }}>visionanalysis.org</span>
      </div>
    </div>
  );
}
