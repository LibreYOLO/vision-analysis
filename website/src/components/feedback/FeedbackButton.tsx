/**
 * FeedbackButton - React drop-in for the issue-creator service.
 *
 * A floating button that opens a small panel with a textarea and POSTs feedback
 * to the issue-creator Worker, which files it as a GitHub issue. Self-contained
 * (inline styles, only needs React). Restyled to the Vision Analysis cyan.
 *
 * Source template: EHxuban11/issue-creator client/react/FeedbackButton.tsx
 */
'use client';
import { useCallback, useState, type CSSProperties } from 'react';

export interface FeedbackButtonProps {
  /** Worker base URL or full …/feedback URL. */
  endpoint: string;
  /** Target repo, "owner/name". */
  repo: string;
  /** Optional app name → `app:<name>` label + body row. */
  app?: string;
  /** Optional: extra metadata appended to the issue body. */
  getMeta?: () => Record<string, unknown>;
  /** Optional: bearer token, when the Worker has AUTH_TOKEN_SECRET enabled. */
  getAuthToken?: () => Promise<string | null | undefined> | string | null | undefined;
}

type Status = { kind: 'idle' | 'sending' } | { kind: 'ok'; url: string } | { kind: 'err'; msg: string };

export function FeedbackButton(props: FeedbackButtonProps) {
  const { endpoint, repo, app, getMeta, getAuthToken } = props;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  const url = endpoint.replace(/\/+$/, '');
  const postUrl = url.endsWith('/feedback') ? url : `${url}/feedback`;

  const submit = useCallback(async () => {
    const text = message.trim();
    if (!text) {
      setStatus({ kind: 'err', msg: 'Please write something first.' });
      return;
    }
    setStatus({ kind: 'sending' });
    setCopied(false);
    try {
      const token = getAuthToken ? await getAuthToken() : undefined;
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          repo,
          message: text,
          app,
          meta: getMeta ? getMeta() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && data.ok && data.url) {
        setStatus({ kind: 'ok', url: data.url });
        setMessage('');
      } else {
        setStatus({ kind: 'err', msg: data.error || `Something went wrong (HTTP ${res.status}).` });
      }
    } catch {
      setStatus({ kind: 'err', msg: 'Network error — could not reach the feedback service.' });
    }
  }, [message, postUrl, repo, app, getMeta, getAuthToken]);

  const copyUrl = useCallback(async (link: string) => {
    const ok = await copyText(link);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <div style={styles.root}>
      {open && (
        <div style={styles.panel} role="dialog" aria-label="Send feedback">
          <div style={styles.head}>
            <strong style={{ fontSize: 14 }}>Send feedback</strong>
            <button style={styles.close} onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <textarea
            style={styles.textarea}
            placeholder="Describe the bug or idea…"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <button style={styles.submit} onClick={submit} disabled={status.kind === 'sending'}>
            {status.kind === 'sending' ? 'Sending…' : 'Send'}
          </button>
          {status.kind === 'ok' && (
            <div style={{ ...styles.status, ...styles.filed }}>
              <span>
                Filed →{' '}
                <a href={status.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                  view issue
                </a>
              </span>
              <button
                type="button"
                style={styles.copy}
                onClick={() => copyUrl(status.url)}
                title={copied ? 'Copied' : 'Copy link'}
                aria-label="Copy issue link"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
          {status.kind === 'err' && <div style={{ ...styles.status, color: '#b91c1c' }}>{status.msg}</div>}
        </div>
      )}
      <button style={styles.launcher} onClick={() => setOpen(o => !o)}>
        Feedback
      </button>
    </div>
  );
}

// Copy the issue URL to the clipboard. The "view issue" link relies on the OS
// opening a browser, which can fail silently; a copyable URL is the fallback.
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API can reject (no permission / insecure context); fall back below.
  }
  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const iconProps = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  style: { display: 'block' } as CSSProperties,
};

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps} strokeWidth={2.5}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const styles: Record<string, CSSProperties> = {
  root: { position: 'fixed', bottom: 20, right: 20, zIndex: 2147483647 },
  launcher: {
    border: 'none',
    borderRadius: 9999,
    padding: '12px 18px',
    cursor: 'pointer',
    background: '#0891b2',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 6px 20px rgba(8,145,178,.30)',
  },
  panel: {
    position: 'absolute',
    bottom: 56,
    right: 0,
    width: 320,
    maxWidth: '90vw',
    background: '#fff',
    color: '#111827',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 12px 40px rgba(0,0,0,.25)',
    padding: 14,
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  close: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' },
  textarea: {
    width: '100%',
    minHeight: 110,
    resize: 'vertical',
    padding: 10,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  submit: {
    marginTop: 10,
    width: '100%',
    border: 'none',
    borderRadius: 8,
    padding: 10,
    background: '#0891b2',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  status: { marginTop: 10, fontSize: 13 },
  filed: { color: '#047857', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  copy: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '2px 8px',
    background: '#fff',
    color: '#047857',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.2,
    cursor: 'pointer',
  },
};

export default FeedbackButton;
