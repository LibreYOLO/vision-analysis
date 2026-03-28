/**
 * VA Logo - V and A overlapping with an eye in the center.
 * The V forms the lower shape, the A sits on top, and the
 * eye (almond + pupil) sits at their intersection.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* V shape */}
      <path
        d="M8 12L32 56L56 12"
        stroke="url(#va-grad)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* A shape */}
      <path
        d="M14 52L32 10L50 52"
        stroke="url(#va-grad)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* A crossbar / eye shape (almond) */}
      <path
        d="M20 36C20 36 26 28 32 28C38 28 44 36 44 36C44 36 38 44 32 44C26 44 20 36 20 36Z"
        fill="url(#va-grad)"
        opacity="0.15"
      />
      <path
        d="M20 36C20 36 26 28 32 28C38 28 44 36 44 36C44 36 38 44 32 44C26 44 20 36 20 36Z"
        stroke="url(#va-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Pupil */}
      <circle cx="32" cy="36" r="4.5" fill="url(#va-grad)" />

      <defs>
        <linearGradient id="va-grad" x1="8" y1="10" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
    </svg>
  );
}
