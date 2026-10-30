import { MONOGRAM, WORDMARK } from './logo-paths';

/** "TeacherNotes." — vector outlines of Host Grotesk ExtraBold. Ink follows `color`, the full stop stays accent blue. */
export function Wordmark({ class: cls, label = 'TeacherNotes' }: { class?: string; label?: string }) {
  return (
    <svg class={'wordmark ' + (cls ?? '')} viewBox={WORDMARK.viewBox} role="img" aria-label={label} focusable="false">
      <path d={WORDMARK.ink} fill="currentColor" />
      <path d={WORDMARK.dot} fill="var(--accent)" />
    </svg>
  );
}

/** Square "T." tile (same artwork as the favicon and app icon). */
export function Mark({ size = 40, class: cls }: { size?: number; class?: string }) {
  return (
    <svg class={'mark ' + (cls ?? '')} width={size} height={size} viewBox={MONOGRAM.viewBox} role="img" aria-label="TeacherNotes" focusable="false">
      <rect width="512" height="512" rx="96" fill="var(--accent)" />
      <path d={MONOGRAM.ink} fill="#fff" />
      <path d={MONOGRAM.dot} fill="#fff" />
    </svg>
  );
}
