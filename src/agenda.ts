import type { DB, Plan, PlanKind, Schedule } from './types';
import { weekdayOf } from './util';

export const KIND_LABEL: Record<PlanKind, string> = { kuliah: 'Kuliah', kuis: 'Kuis', uts: 'UTS', uas: 'UAS', deadline: 'Deadline' };
export const KINDS = Object.keys(KIND_LABEL) as PlanKind[];
export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** Monday-first order for lists. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface AgendaItem {
  key: string; date: string; time: string; end: string; title: string; subject: string; className: string; room: string;
  kind: PlanKind; plan?: Plan; schedule?: Schedule;
}

export const sortSchedules = (list: Schedule[]) =>
  [...list].sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day) || a.start.localeCompare(b.start));

/** Everything happening on `date`: one-off plans plus the weekly classes that fall on that weekday. */
export function agendaFor(db: DB, date: string): AgendaItem[] {
  const plans = db.plans.filter((p) => p.date === date);
  const items: AgendaItem[] = plans.map((p) => ({
    key: 'plan:' + p.id, date, time: p.time, end: '', title: p.title, subject: p.subject, className: p.className, room: '', kind: p.kind, plan: p,
  }));
  const wd = weekdayOf(date);
  for (const s of db.schedules) {
    if (s.day !== wd || (s.until && date > s.until)) continue;
    // a one-off class plan for the same subject that day replaces the weekly slot (e.g. a moved class)
    if (s.subject && plans.some((p) => p.kind === 'kuliah' && p.subject === s.subject)) continue;
    items.push({
      key: 'sch:' + s.id, date, time: s.start, end: s.end, title: s.subject || 'Kuliah', subject: s.subject, className: s.className, room: s.room, kind: 'kuliah', schedule: s,
    });
  }
  return items.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}
