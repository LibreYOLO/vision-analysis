'use client';

import { usePathname } from 'next/navigation';
import { FeedbackButton } from './FeedbackButton';

// Mounts the feedback button site-wide, but hides it on the /embed/* iframe
// widget routes so it never appears inside an embedded chart. (/embed-builder
// is a normal page and keeps the button.)
export function SiteFeedback() {
  const pathname = usePathname();
  if (pathname?.startsWith('/embed/')) return null;

  return (
    <FeedbackButton
      endpoint="https://issue-creator.xuban-ceccon.workers.dev"
      repo="LibreYOLO/vision-analysis"
      app="vision-analysis"
      getMeta={() => ({
        url: typeof location !== 'undefined' ? location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      })}
    />
  );
}

export default SiteFeedback;
