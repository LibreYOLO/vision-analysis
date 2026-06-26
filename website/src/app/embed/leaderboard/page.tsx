import type { CSSProperties } from 'react';
import { getBenchmarkResults, getHardwareById, getRuntimeById, getModelById } from '@/lib/data';
import { getFamilyColor } from '@/lib/utils/colors';
import { formatNumber, formatPercent, formatMs } from '@/lib/utils/format';

interface Props {
  searchParams: Promise<{ hw?: string; rt?: string; limit?: string; task?: string }>;
}

export default async function LeaderboardEmbed({ searchParams }: Props) {
  const sp = await searchParams;
  const hw = typeof sp.hw === 'string' ? sp.hw : 'a100';
  const rt = typeof sp.rt === 'string' ? sp.rt : 'pytorch_fp32';
  const limit = Math.max(1, parseInt(typeof sp.limit === 'string' ? sp.limit : '10') || 10);
  const task = typeof sp.task === 'string' ? sp.task : null;

  const hwMeta = getHardwareById(hw);
  const rtMeta = getRuntimeById(rt);

  let results = getBenchmarkResults(hw, rt);

  if (task) {
    results = results.filter(r => {
      const m = getModelById(r.model);
      return m?.task === task;
    });
  }

  const top = [...results]
    .sort((a, b) => b.mAP_50_95 - a.mAP_50_95)
    .slice(0, limit);

  const rows = top.map((r, i) => {
    const meta = getModelById(r.model);
    return { rank: i + 1, r, displayName: meta?.displayName ?? r.model };
  });

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

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
    padding: '8px 10px',
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
        minHeight: '100%',
        boxSizing: 'border-box' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        borderTop: '3px solid #0891b2',
      }}
    >
      <div
        style={{
          padding: '11px 14px 9px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, fontSize: 14, color: '#0891b2' }}>
          Leaderboard
        </span>
        <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 11, color: '#94a3b8' }}>
          {hwMeta?.displayName ?? hw} · {rtMeta?.displayName ?? rt}
        </span>
        <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
          As of {dateStr}
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
          No data for this configuration.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 32 }}>#</th>
                <th style={th}>Model</th>
                <th style={th}>Family</th>
                <th style={thR}>mAP</th>
                <th style={thR}>FPS</th>
                <th style={thR}>Latency</th>
                <th style={thR}>Params</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ rank, r, displayName }) => {
                const color = getFamilyColor(r.family);
                return (
                  <tr key={r.model}>
                    <td style={{ ...td, color: '#94a3b8' }}>{rank}</td>
                    <td style={td}>
                      <a
                        href={`/model/${r.model}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#e2e8f0', textDecoration: 'none' }}
                      >
                        {displayName}
                      </a>
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          display: 'inline-block',
                          background: color,
                          color: 'white',
                          padding: '2px 7px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontFamily: "'Outfit', system-ui, sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        {r.family}
                      </span>
                    </td>
                    <td style={{ ...tdR, color: '#0891b2', fontWeight: 700 }}>
                      {formatPercent(r.mAP_50_95)}
                    </td>
                    <td style={tdR}>{formatNumber(r.throughputFps, 1)}</td>
                    <td style={tdR}>{formatMs(r.totalMs)}</td>
                    <td style={{ ...tdR, color: '#94a3b8' }}>{formatNumber(r.paramsM, 1)}M</td>
                  </tr>
                );
              })}
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
        <span>COCO val2017 · ranked by mAP@50-95</span>
        <span style={{ color: '#0891b2', fontWeight: 500 }}>visionanalysis.org</span>
      </div>
    </div>
  );
}
