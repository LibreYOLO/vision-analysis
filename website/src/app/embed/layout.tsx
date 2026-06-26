import type { ReactNode } from 'react';
import { EMBED_THEME_CSS } from '@/lib/embedTheme';

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

            body:has([data-embed]) header,
            body:has([data-embed]) footer,
            body:has([data-embed]) section.border-t {
              display: none !important;
            }
            body:has([data-embed]) main {
              background: transparent;
              padding: 0 !important;
              margin: 0 !important;
            }
            [data-embed] * { box-sizing: border-box; }
            ${EMBED_THEME_CSS}
          `,
        }}
      />
      <div
        data-embed="true"
        style={{
          minHeight: '100%',
          margin: 0,
          padding: 0,
          fontFamily: "'Outfit', system-ui, sans-serif",
        }}
      >
        {children}
      </div>
    </>
  );
}
