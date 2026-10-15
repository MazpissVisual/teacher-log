import type { LucideIcon } from 'lucide-preact';
import { Frown, Laugh, Meh, Smile } from 'lucide-preact';
import type { Mood } from './types';


/** All icons: thin 1.5 stroke, inherit colour, hidden from assistive tech (buttons carry their own labels). */
export function Icon({ as: C, size = 18, class: cls }: { as: LucideIcon; size?: number; class?: string }) {
  return <C size={size} strokeWidth={1.5} class={cls} aria-hidden="true" />;
}

const MOOD_ICON: Record<Mood, LucideIcon> = { great: Laugh, good: Smile, neutral: Meh, challenging: Frown };
export const MoodIcon = ({ m, size = 20 }: { m: Mood; size?: number }) => <Icon as={MOOD_ICON[m]} size={size} />;
