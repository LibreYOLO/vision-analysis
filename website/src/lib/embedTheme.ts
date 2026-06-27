// Shared theming for embeddable widgets.
// Widgets reference colors as CSS variables so a single `theme` query param
// (light | dark | system) can re-skin them, with `system` honouring the
// viewer's OS preference via prefers-color-scheme.

export type EmbedTheme = 'light' | 'dark' | 'system';

export function parseTheme(raw: string | undefined | null): EmbedTheme {
  return raw === 'dark' || raw === 'system' ? raw : 'light';
}

// Color tokens as CSS var() references. Use these in SVG fills and inline styles.
export const T = {
  bg: 'var(--embed-bg)',
  panel: 'var(--embed-panel)',
  border: 'var(--embed-border)',
  borderSoft: 'var(--embed-border-soft)',
  grid: 'var(--embed-grid)',
  axis: 'var(--embed-axis)',
  greyDot: 'var(--embed-grey-dot)',
  greyDotHover: 'var(--embed-grey-dot-hover)',
  text: 'var(--embed-text)',
  textStrong: 'var(--embed-text-strong)',
  textMuted: 'var(--embed-text-muted)',
  textFaint: 'var(--embed-text-faint)',
  textBody: 'var(--embed-text-body)',
  accent: 'var(--embed-accent)',
  strokeDot: 'var(--embed-stroke-dot)',
} as const;

// html/body background per theme, injected by the embed page so there is no
// light letterbox around the widget in dark/system mode.
export function bodyBgStyle(theme: EmbedTheme): string {
  const LIGHT = '#f8fafc';
  const DARK = '#0b1220';
  // Reset the default 8px body margin so the widget sits flush in the iframe;
  // a stray margin otherwise adds height and pushes a scrollbar into the frame.
  const reset = 'html,body{margin:0;padding:0;}';
  if (theme === 'dark') return `${reset}html,body{background:${DARK};}`;
  if (theme === 'system') {
    return `${reset}html,body{background:${LIGHT};}@media (prefers-color-scheme: dark){html,body{background:${DARK};}}`;
  }
  return `${reset}html,body{background:${LIGHT};}`;
}

const LIGHT_VARS = `
  --embed-bg: #f8fafc;
  --embed-panel: #ffffff;
  --embed-border: #e2e8f0;
  --embed-border-soft: #f1f5f9;
  --embed-grid: rgba(8,145,178,0.13);
  --embed-axis: #cbd5e1;
  --embed-grey-dot: #cbd5e1;
  --embed-grey-dot-hover: #94a3b8;
  --embed-text: #1e293b;
  --embed-text-strong: #0f172a;
  --embed-text-muted: #64748b;
  --embed-text-faint: #94a3b8;
  --embed-text-body: #475569;
  --embed-accent: #0891b2;
  --embed-stroke-dot: #ffffff;
`;

const DARK_VARS = `
  --embed-bg: #0b1220;
  --embed-panel: #111a2e;
  --embed-border: #243049;
  --embed-border-soft: #1b2742;
  --embed-grid: rgba(34,211,238,0.12);
  --embed-axis: #334155;
  --embed-grey-dot: #334155;
  --embed-grey-dot-hover: #64748b;
  --embed-text: #e2e8f0;
  --embed-text-strong: #f8fafc;
  --embed-text-muted: #94a3b8;
  --embed-text-faint: #64748b;
  --embed-text-body: #cbd5e1;
  --embed-accent: #22d3ee;
  --embed-stroke-dot: #0b1220;
`;

// Injected once in the embed layout. Variables resolve against whichever
// ancestor carries data-theme="light|dark|system".
export const EMBED_THEME_CSS = `
[data-theme="light"], [data-theme="system"] {${LIGHT_VARS}}
[data-theme="dark"] {${DARK_VARS}}
@media (prefers-color-scheme: dark) {
  [data-theme="system"] {${DARK_VARS}}
}
`;
