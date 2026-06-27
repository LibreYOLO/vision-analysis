'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

export interface BuilderModel {
  id: string;
  displayName: string;
  family: string;
  color: string;
  paramsM: number;
}

interface Option {
  value: string;
  label: string;
}

interface Props {
  models: BuilderModel[];
  hardwareOptions: Option[];
  runtimesByHw: Record<string, Option[]>;
}

type Theme = 'light' | 'dark' | 'system';

const ACCENT = '#0891b2';
const PROD_ORIGIN = 'https://visionanalysis.org';

export function BuilderClient({ models, hardwareOptions, runtimesByHw }: Props) {
  const [highlight, setHighlight] = useState<string[]>(['yolonas-s', 'yolonas-m', 'yolonas-l']);
  const [dataSource, setDataSource] = useState<string>('paper'); // 'paper' | hardware id
  const [runtime, setRuntime] = useState<string>('');
  const [theme, setTheme] = useState<Theme>('light');
  const [maxWidth, setMaxWidth] = useState<number | 'full'>('full');
  const [copied, setCopied] = useState<'iframe' | 'url' | null>(null);
  const [origin, setOrigin] = useState<string>(PROD_ORIGIN);

  // Use the live origin when on a real domain; keep the prod domain on localhost
  // so copied snippets work when pasted elsewhere.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!/localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      setOrigin(window.location.origin);
    }
  }, []);

  // Keep runtime valid when hardware changes
  useEffect(() => {
    if (dataSource === 'paper') {
      setRuntime('');
      return;
    }
    const opts = runtimesByHw[dataSource] ?? [];
    if (opts.length && !opts.some(o => o.value === runtime)) {
      setRuntime(opts[0].value);
    }
  }, [dataSource, runtimesByHw, runtime]);

  const families = useMemo(() => {
    const map = new Map<string, BuilderModel[]>();
    for (const m of models) {
      const g = map.get(m.family) ?? [];
      g.push(m);
      map.set(m.family, g);
    }
    return Array.from(map.entries());
  }, [models]);

  const embedPath = useMemo(() => {
    const p = new URLSearchParams();
    if (highlight.length) p.set('highlight', highlight.join(','));
    if (dataSource !== 'paper') {
      p.set('hw', dataSource);
      if (runtime) p.set('rt', runtime);
    }
    if (theme !== 'light') p.set('theme', theme);
    return `/embed/scatter?${p.toString()}`;
  }, [highlight, dataSource, runtime, theme]);

  const snippetUrl = `${origin}${embedPath}`;
  // Responsive wrapper: the chart is a fixed 8:5 SVG, so a padding-top box keeps
  // the iframe height locked to its width (62.5% = 400/640). That removes the
  // scrollbar a fixed pixel height produces whenever the column width changes.
  const widthCap = maxWidth === 'full' ? '' : `max-width:${maxWidth}px;`;
  const iframeSnippet =
    `<div style="position:relative;width:100%;${widthCap}padding-top:62.5%">\n` +
    `  <iframe\n` +
    `    src="${snippetUrl}"\n` +
    `    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:12px"\n` +
    `    loading="lazy"\n` +
    `    title="Accuracy vs parameters - Vision Analysis">\n` +
    `  </iframe>\n` +
    `</div>`;

  function toggleModel(id: string) {
    setHighlight(h => (h.includes(id) ? h.filter(x => x !== id) : [...h, id]));
  }

  function toggleFamily(fam: string, famModels: BuilderModel[]) {
    const ids = famModels.map(m => m.id);
    const allOn = ids.every(id => highlight.includes(id));
    setHighlight(h => (allOn ? h.filter(x => !ids.includes(x)) : Array.from(new Set([...h, ...ids]))));
  }

  async function copy(text: string, which: 'iframe' | 'url') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked - ignore */
    }
  }

  const runtimeOpts = dataSource === 'paper' ? [] : runtimesByHw[dataSource] ?? [];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={{ marginBottom: 28 }}>
          <div style={styles.kicker}>EMBED BUILDER</div>
          <h1 style={styles.h1}>Build a benchmark chart for your article</h1>
          <p style={styles.lead}>
            Configure an accuracy-vs-parameters chart, pick a theme, and copy a snippet you can drop into any
            blog post, docs page or README. The chart renders live from Vision Analysis data and updates
            automatically as new benchmarks land.
          </p>
        </header>

        {/* Builder */}
        <div style={styles.builderGrid}>
          {/* Controls */}
          <div style={styles.controls}>
            <section style={styles.card}>
              <div style={styles.cardTitle}>1 · Highlight models</div>
              <p style={styles.hint}>
                Picked models are drawn in full colour with labels. Everything else stays as grey context dots.
                Pick a whole family to draw its scaling curve.
              </p>
              {families.map(([fam, famModels]) => {
                const color = famModels[0]?.color ?? ACCENT;
                const allOn = famModels.every(m => highlight.includes(m.id));
                return (
                  <div key={fam} style={{ marginBottom: 14 }}>
                    <div style={styles.familyRow}>
                      <span style={{ ...styles.familyName, color }}>{fam}</span>
                      <button
                        type="button"
                        onClick={() => toggleFamily(fam, famModels)}
                        style={styles.familyToggle}
                      >
                        {allOn ? 'Clear' : 'Select all'}
                      </button>
                    </div>
                    <div style={styles.chips}>
                      {famModels.map(m => {
                        const on = highlight.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleModel(m.id)}
                            style={{
                              ...styles.chip,
                              background: on ? m.color : 'white',
                              color: on ? 'white' : '#475569',
                              borderColor: on ? m.color : '#e2e8f0',
                            }}
                          >
                            {m.displayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            <section style={styles.card}>
              <div style={styles.cardTitle}>2 · Data source</div>
              <p style={styles.hint}>
                Paper-reported mAP covers every model. Pick a hardware + runtime to plot measured accuracy
                instead (only models benchmarked on that setup will appear).
              </p>
              <label style={styles.label}>Accuracy from</label>
              <select
                value={dataSource}
                onChange={e => setDataSource(e.target.value)}
                style={styles.select}
              >
                <option value="paper">Paper-reported (all models)</option>
                {hardwareOptions.map(h => (
                  <option key={h.value} value={h.value}>
                    Measured · {h.label}
                  </option>
                ))}
              </select>

              {dataSource !== 'paper' && (
                <>
                  <label style={{ ...styles.label, marginTop: 12 }}>Runtime</label>
                  <select
                    value={runtime}
                    onChange={e => setRuntime(e.target.value)}
                    style={styles.select}
                  >
                    {runtimeOpts.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.cardTitle}>3 · Appearance</div>
              <label style={styles.label}>Theme</label>
              <div style={styles.segment}>
                {(['light', 'dark', 'system'] as Theme[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    style={{
                      ...styles.segmentBtn,
                      background: theme === t ? ACCENT : 'transparent',
                      color: theme === t ? 'white' : '#64748b',
                    }}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <p style={styles.hint}>
                <strong>System</strong> follows each visitor&apos;s OS light/dark setting automatically.
              </p>

              <label style={{ ...styles.label, marginTop: 12 }}>Max width</label>
              <div style={styles.segment}>
                {(['full', 720, 560] as const).map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setMaxWidth(w)}
                    style={{
                      ...styles.segmentBtn,
                      background: maxWidth === w ? ACCENT : 'transparent',
                      color: maxWidth === w ? 'white' : '#64748b',
                    }}
                  >
                    {w === 'full' ? 'Full' : `${w}px`}
                  </button>
                ))}
              </div>
              <p style={{ ...styles.hint, marginTop: 8, marginBottom: 0 }}>
                The chart fills its container and keeps an 8:5 ratio, so its height follows the
                width automatically with no scrollbar. Cap the width if you do not want it to
                stretch across a wide column.
              </p>
            </section>
          </div>

          {/* Preview + snippet */}
          <div style={styles.previewCol}>
            <section style={styles.card}>
              <div style={styles.previewHead}>
                <div style={styles.cardTitle}>Live preview</div>
                <a href={embedPath} target="_blank" rel="noopener noreferrer" style={styles.openLink}>
                  Open in new tab ↗
                </a>
              </div>
              <div style={styles.previewFrame}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: maxWidth === 'full' ? undefined : maxWidth,
                    paddingTop: '62.5%',
                  }}
                >
                  <iframe
                    key={embedPath}
                    src={embedPath}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
                    title="Embed preview"
                  />
                </div>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.previewHead}>
                <div style={styles.cardTitle}>Embed snippet</div>
                <button
                  type="button"
                  onClick={() => copy(iframeSnippet, 'iframe')}
                  style={{
                    ...styles.copyBtn,
                    background: copied === 'iframe' ? '#16a34a' : ACCENT,
                  }}
                >
                  {copied === 'iframe' ? 'Copied ✓' : 'Copy snippet'}
                </button>
              </div>
              <pre style={styles.code}>{iframeSnippet}</pre>

              <div style={styles.urlRow}>
                <code style={styles.urlCode}>{snippetUrl}</code>
                <button
                  type="button"
                  onClick={() => copy(snippetUrl, 'url')}
                  style={styles.urlCopy}
                >
                  {copied === 'url' ? 'Copied ✓' : 'Copy URL'}
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Docs */}
        <Docs />
      </div>
    </div>
  );
}

function Docs() {
  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={styles.h2}>How it works</h2>
      <p style={styles.docP}>
        The widget is a plain URL under <code style={styles.inlineCode}>/embed/scatter</code> that renders a
        self-contained chart with no external scripts. You embed it with a standard{' '}
        <code style={styles.inlineCode}>&lt;iframe&gt;</code>, so it works in any CMS, Markdown renderer or
        static site that allows iframes. Because the data lives on Vision Analysis, the chart stays current:
        when a model is re-benchmarked, every embed of it updates with no action on your side.
      </p>

      <h2 style={styles.h2}>URL parameters</h2>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Parameter</th>
              <th style={styles.th}>Values</th>
              <th style={styles.th}>What it does</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['highlight', 'comma-separated model IDs', 'Models drawn in full colour with labels. e.g. yolonas-s,yolonas-m,yolonas-l. Highlighting a whole family draws its scaling curve.'],
              ['theme', 'light · dark · system', 'Colour scheme. system follows the viewer’s OS preference. Defaults to light.'],
              ['hw', 'hardware ID (optional)', 'Plot measured accuracy from this hardware instead of paper-reported mAP.'],
              ['rt', 'runtime ID (optional)', 'Runtime to read measured numbers from, e.g. tensorrt_fp32. Used together with hw.'],
              ['task', 'detection (default)', 'Which task pool to draw context dots from.'],
            ].map(([p, v, d]) => (
              <tr key={p}>
                <td style={styles.td}><code style={styles.inlineCode}>{p}</code></td>
                <td style={{ ...styles.td, color: '#64748b' }}>{v}</td>
                <td style={styles.td}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={styles.h2}>Theming</h2>
      <p style={styles.docP}>
        Three modes ship out of the box. <strong>Light</strong> matches most documentation sites,{' '}
        <strong>dark</strong> matches dark-themed blogs, and <strong>system</strong> reads each visitor&apos;s{' '}
        <code style={styles.inlineCode}>prefers-color-scheme</code> so a single embed adapts per reader. The
        background, grid, axes and tooltip all recolour together; model colours stay constant so a family is
        recognisable across themes.
      </p>

      <h2 style={styles.h2}>Sizing &amp; interactions</h2>
      <p style={styles.docP}>
        The snippet wraps the chart in a fixed 8:5 aspect-ratio box, so it fills the width of its
        container and computes its own height. There is no fixed pixel height to keep in sync, so no
        scrollbar appears whatever the column width. Hovering a dot shows the model name, parameter
        count and mAP; clicking a dot opens that model&apos;s page on Vision Analysis in a new tab.
      </p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    background: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Outfit', system-ui, sans-serif",
    color: '#1e293b',
    padding: '32px 20px 80px',
  },
  container: { maxWidth: 1120, margin: '0 auto' },
  kicker: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: ACCENT,
    marginBottom: 8,
  },
  h1: { fontSize: 30, fontWeight: 700, lineHeight: 1.15, margin: '0 0 12px', color: '#0f172a' },
  lead: { fontSize: 15, lineHeight: 1.6, color: '#475569', maxWidth: 720, margin: 0 },
  builderGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 360px) minmax(0, 1fr)',
    gap: 20,
    alignItems: 'start',
  },
  controls: { display: 'flex', flexDirection: 'column', gap: 16 },
  previewCol: { display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 },
  card: {
    background: 'white',
    border: '1px solid #e8edf3',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8 },
  hint: { fontSize: 12.5, lineHeight: 1.5, color: '#64748b', margin: '0 0 12px' },
  familyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  familyName: { fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  familyToggle: {
    fontSize: 11,
    color: ACCENT,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    padding: 0,
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    fontSize: 12.5,
    fontWeight: 600,
    padding: '5px 11px',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.12s',
    fontFamily: "'Outfit', system-ui, sans-serif",
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    padding: '9px 11px',
    borderRadius: 9,
    border: '1px solid #e2e8f0',
    fontSize: 13.5,
    fontFamily: "'Outfit', system-ui, sans-serif",
    color: '#334155',
    background: 'white',
    cursor: 'pointer',
  },
  segment: {
    display: 'flex',
    gap: 4,
    background: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    padding: '7px 8px',
    borderRadius: 7,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Outfit', system-ui, sans-serif",
    transition: 'all 0.12s',
  },
  previewHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  openLink: { fontSize: 12.5, color: ACCENT, textDecoration: 'none', fontWeight: 600 },
  previewFrame: {
    border: '1px solid #e8edf3',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#f8fafc',
  },
  copyBtn: {
    border: 'none',
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: 9,
    cursor: 'pointer',
    fontFamily: "'Outfit', system-ui, sans-serif",
    transition: 'background 0.15s',
  },
  code: {
    margin: 0,
    background: '#0f172a',
    color: '#e2e8f0',
    padding: '14px 16px',
    borderRadius: 10,
    fontSize: 12.5,
    lineHeight: 1.55,
    fontFamily: "'JetBrains Mono', monospace",
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
  urlRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 },
  urlCode: {
    flex: 1,
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#64748b',
    background: '#f8fafc',
    border: '1px solid #e8edf3',
    borderRadius: 8,
    padding: '8px 10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  urlCopy: {
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#475569',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: "'Outfit', system-ui, sans-serif",
  },
  h2: { fontSize: 19, fontWeight: 700, color: '#0f172a', margin: '28px 0 10px' },
  docP: { fontSize: 14.5, lineHeight: 1.65, color: '#475569', maxWidth: 760, margin: '0 0 8px' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e8edf3', borderRadius: 12, background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748b',
    background: '#f8fafc',
    borderBottom: '1px solid #e8edf3',
  },
  td: { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#334155', lineHeight: 1.5, verticalAlign: 'top' },
  inlineCode: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.9em',
    background: '#f1f5f9',
    padding: '1px 5px',
    borderRadius: 5,
    color: '#0e7490',
  },
};
