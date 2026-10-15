import { MONOGRAM, WORDMARK } from './logo-paths';

/** "GuruLog." — vector outlines of Playfair Display Black. Ink follows `color`, the full stop stays editorial red. */
export function Wordmark({ class: cls, label = 'GuruLog' }: { class?: string; label?: string }) {
  return (
    <svg class={'wordmark ' + (cls ?? '')} viewBox={WORDMARK.viewBox} role="img" aria-label={label} focusable="false">
      <path d={WORDMARK.ink} fill="currentColor" />
      <path d={WORDMARK.dot} fill="var(--red)" />
    </svg>
  );
}

/** Square "G." tile (same artwork as the favicon and app icon). */
export function Mark({ size = 40, class: cls }: { size?: number; class?: string }) {
  return (
    <svg class={'mark ' + (cls ?? '')} width={size} height={size} viewBox={MONOGRAM.viewBox} role="img" aria-label="GuruLog" focusable="false">
      <rect width="512" height="512" fill="var(--paper)" />
      <rect x="30" y="30" width="452" height="452" fill="none" stroke="var(--ink)" stroke-width="10" />
      <path d={MONOGRAM.ink} fill="var(--ink)" />
      <path d={MONOGRAM.dot} fill="var(--red)" />
    </svg>
  );
}
