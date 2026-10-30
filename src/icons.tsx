import type { LucideIcon } from 'lucide-preact';

/** All icons: thin 1.5 stroke, inherit colour, hidden from assistive tech (buttons carry their own labels). */
export function Icon({ as: C, size = 18, class: cls }: { as: LucideIcon; size?: number; class?: string }) {
  return <C size={size} strokeWidth={1.5} class={cls} aria-hidden="true" />;
}
