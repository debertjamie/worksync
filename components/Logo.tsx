/**
 * WorkSync logo. The `mark` is a self-contained "WS" glyph in the app's pastel
 * palette (lavender → blue → mint), usable on its own or beside the wordmark.
 * Pure SVG/markup, no client APIs, so it works in server or client components.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="WorkSync logo"
    >
      <defs>
        <linearGradient id="ws-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e7e3fb" />
          <stop offset="0.5" stopColor="#dcebfb" />
          <stop offset="1" stopColor="#d9f3e4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ws-bg)" />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="15.25"
        fill="none"
        stroke="#3a2f6b"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />
      {/* W */}
      <path
        d="M12 20 L18 44 L24 28 L30 44 L36 20"
        fill="none"
        stroke="#3a2f6b"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* S */}
      <path
        d="M52 24 C52 20, 48 19, 45 19 C41 19, 39 21, 39 24 C39 31, 52 29, 52 37 C52 41, 48 43, 44 43 C40 43, 37 41, 37 38"
        fill="none"
        stroke="#1f466e"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The full lockup: the WS mark plus the "WorkSync" wordmark. `markClassName`
 * sizes the glyph; omit `showWordmark` for the mark alone.
 */
export default function Logo({
  markClassName = 'h-8 w-8',
  wordmarkClassName = 'text-xl font-semibold tracking-tight',
  showWordmark = true,
}: {
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={markClassName} />
      {showWordmark && (
        <span className={wordmarkClassName}>
          Work<span className="text-pastel-blue-fg">Sync</span>
        </span>
      )}
    </span>
  );
}
