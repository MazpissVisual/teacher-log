import type { DB } from './types';
import { agendaFor, KIND_LABEL } from './agenda';
import { dayDiff, minutesIn, toMinutes, todayIn } from './util';

/**
 * What is worth telling the student right now. Pure and free of browser APIs: the app uses it for local
 * notifications and the dashboard, and `npm run functions:build` bundles it for the send-reminders Edge Function.
 */

export interface Prefs { enabled: boolean; deadlines: boolean; classes: boolean; thesis: boolean; leadMin: number }
export type ReminderGroup = 'deadlines' | 'classes' | 'thesis';
export interface Reminder { key: string; title: string; body: string; urgent: boolean; group: ReminderGroup; url: string }
export type ReminderInput = Pick<DB, 'profile' | 'tasks' | 'plans' | 'schedules' | 'stages' | 'guidance'>;

export const DEFAULT_PREFS: Prefs = { enabled: false, deadlines: true, classes: true, thesis: true, leadMin: 15 };
export { todayIn };

const GROUP_URL: Record<ReminderGroup, string> = { deadlines: '/tasks', classes: '/planner', thesis: '/thesis' };
const when = (d: number) => (d < 0 ? `terlambat ${-d} hari` : d === 0 ? 'hari ini' : d === 1 ? 'besok' : `${d} hari lagi`);

export function computeReminders(db: ReminderInput, now: Date, p: Prefs): Reminder[] {
  const tz = db.profile.tz;
  const today = todayIn(tz, now);
  const nowMin = minutesIn(tz, now);
  const out: Reminder[] = [];
  const add = (r: Omit<Reminder, 'url'>) => out.push({ ...r, url: GROUP_URL[r.group] });

  if (p.deadlines) {
    for (const t of db.tasks) {
      if (t.done || !t.date) continue;
      const d = dayDiff(t.date, today);
      if (d > 1) continue;
      add({
        key: `task:${t.id}:${d < 0 ? 'late:' + today : d}`, group: 'deadlines', urgent: true,
        title: d < 0 ? `Tugas terlambat: ${t.title}` : `Tugas ${d === 0 ? 'hari ini' : 'besok'}: ${t.title}`,
        body: [t.subject, d < 0 ? when(d) : ''].filter(Boolean).join(' · ') || 'Jangan lupa dikerjakan.',
      });
    }
    for (const pl of db.plans) {
      if (pl.kind === 'kuliah' || !pl.date) continue;
      const d = dayDiff(pl.date, today);
      const big = pl.kind === 'uts' || pl.kind === 'uas';
      if (d < 0 || !(d <= 1 || (big && (d === 3 || d === 7)))) continue;
      add({
        key: `plan:${pl.id}:${d}`, group: 'deadlines', urgent: d <= 1,
        title: `${KIND_LABEL[pl.kind]} ${when(d)}: ${pl.title}`,
        body: [pl.subject, pl.time && `Pukul ${pl.time}`].filter(Boolean).join(' · ') || 'Siapkan dirimu.',
      });
    }
  }

  if (p.classes) {
    for (const a of agendaFor(db, today)) {
      const start = toMinutes(a.time);
      if (start === null || nowMin > start || nowMin < start - p.leadMin) continue;
      const left = start - nowMin;
      add({
        key: `class:${a.key}:${today}`, group: 'classes', urgent: true,
        title: `${a.kind === 'kuliah' ? '' : KIND_LABEL[a.kind] + ': '}${a.title} ${left === 0 ? 'dimulai sekarang' : `mulai ${left} menit lagi`}`,
        body: [`Pukul ${a.time}`, a.room].filter(Boolean).join(' · '),
      });
    }
  }

  if (p.thesis) {
    for (const s of db.stages) {
      if (s.status === 'done' || !s.date) continue;
      const d = dayDiff(s.date, today);
      if (d > 3) continue;
      add({
        key: `stage:${s.id}:${d < 0 ? 'late:' + today : d}`, group: 'thesis', urgent: d <= 1,
        title: `Tahap tesis ${when(d)}: ${s.title}`, body: s.note ? s.note.slice(0, 100) : 'Cek progresmu.',
      });
    }
    for (const g of db.guidance) {
      if (!g.date) continue;
      const d = dayDiff(g.date, today);
      if (d === 0 || d === 1) {
        add({
          key: `guid:${g.id}:${d}`, group: 'thesis', urgent: true,
          title: `Bimbingan ${when(d)}${g.lecturer ? ' dengan ' + g.lecturer : ''}`, body: g.notes ? g.notes.slice(0, 100) : 'Siapkan bahan yang mau ditanyakan.',
        });
      }
    }
    const pending = db.guidance.filter((g) => g.followup && !g.followupDone).length;
    if (pending) {
      add({
        key: `followup:${today}`, group: 'thesis', urgent: false,
        title: `${pending} tindak lanjut bimbingan belum selesai`, body: 'Buka halaman Tesis untuk melihat daftarnya.',
      });
    }
  }
  return out;
}
