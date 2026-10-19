import { describe, expect, it } from 'vitest';
import { normalize } from './store';
import { agendaFor } from './agenda';
import { computeReminders, DEFAULT_PREFS } from './notify';
import { countdown, minutesIn, toMinutes, weekdayOf } from './util';

const TZ = 'Asia/Jakarta';
const base = (extra: Record<string, unknown>) => normalize({ profile: { name: 'T', tz: TZ }, ...extra });
// 2026-10-19 is a Monday. 00:50 UTC = 07:50 WIB.
const MON_0750 = new Date('2026-10-19T00:50:00Z');

describe('countdown', () => {
  it('labels late, today, H-1 and H-n; stays quiet beyond 30 days', () => {
    expect(countdown('2026-10-17', '2026-10-19')).toEqual({ text: 'Terlambat 2 hari', urgent: true });
    expect(countdown('2026-10-19', '2026-10-19')).toEqual({ text: 'Hari ini', urgent: true });
    expect(countdown('2026-10-20', '2026-10-19')).toEqual({ text: 'H-1', urgent: true });
    expect(countdown('2026-10-24', '2026-10-19')).toEqual({ text: 'H-5', urgent: false });
    expect(countdown('2026-12-25', '2026-10-19')).toBeNull();
    expect(countdown('', '2026-10-19')).toBeNull();
  });
  it('time helpers', () => {
    expect(weekdayOf('2026-10-19')).toBe(1);
    expect(minutesIn(TZ, MON_0750)).toBe(7 * 60 + 50);
    expect(toMinutes('08:30')).toBe(510);
    expect(toMinutes('')).toBeNull();
  });
});

describe('agendaFor', () => {
  const sch = { id: '1', subject: 'Basis Data', day: 1, start: '08:00', end: '09:40', room: 'Lab 2', until: '' };
  it('expands weekly classes onto the right weekday only', () => {
    const db = base({ schedules: [sch] });
    expect(agendaFor(db, '2026-10-19').map((a) => a.title)).toEqual(['Basis Data']);
    expect(agendaFor(db, '2026-10-26')).toHaveLength(1);
    expect(agendaFor(db, '2026-10-20')).toHaveLength(0);
  });
  it('stops repeating after `until`', () => {
    const db = base({ schedules: [{ ...sch, until: '2026-10-19' }] });
    expect(agendaFor(db, '2026-10-19')).toHaveLength(1);
    expect(agendaFor(db, '2026-10-26')).toHaveLength(0);
  });
  it('a one-off class plan for the same subject replaces the weekly slot', () => {
    const db = base({ schedules: [sch], plans: [{ title: 'Kuliah pengganti', date: '2026-10-19', time: '13:00', subject: 'Basis Data', kind: 'kuliah' }] });
    expect(agendaFor(db, '2026-10-19').map((a) => a.title)).toEqual(['Kuliah pengganti']);
  });
});

describe('computeReminders', () => {
  const sch = { id: '1', subject: 'Basis Data', day: 1, start: '08:00', end: '09:40', room: 'Lab 2', until: '' };
  it('warns about a class starting within the lead time, not earlier', () => {
    const db = base({ schedules: [sch] });
    const soon = computeReminders(db, MON_0750, DEFAULT_PREFS);
    expect(soon).toHaveLength(1);
    expect(soon[0].title).toContain('10 menit');
    expect(computeReminders(db, new Date('2026-10-19T00:20:00Z'), DEFAULT_PREFS)).toHaveLength(0); // 07:20, 40 min before
    expect(computeReminders(db, new Date('2026-10-19T01:10:00Z'), DEFAULT_PREFS)).toHaveLength(0); // already started
  });
  it('reminds about tasks due today/tomorrow/late but not done or distant ones', () => {
    const db = base({ tasks: [
      { id: 'a', title: 'A', date: '2026-10-19' }, { id: 'b', title: 'B', date: '2026-10-20' }, { id: 'c', title: 'C', date: '2026-10-17' },
      { id: 'd', title: 'D', date: '2026-10-19', done: true }, { id: 'e', title: 'E', date: '2026-10-25' },
    ] });
    const titles = computeReminders(db, MON_0750, DEFAULT_PREFS).map((r) => r.title).sort();
    expect(titles).toHaveLength(3);
    expect(titles.join('|')).toMatch(/A/);
    expect(titles.join('|')).not.toMatch(/: [DE]\b/);
  });
  it('UTS gets early warnings at 7 and 3 days; ordinary classes never do', () => {
    const db = base({ plans: [
      { title: 'UTS BD', date: '2026-10-26', kind: 'uts' }, { title: 'UTS Stat', date: '2026-10-22', kind: 'uts' },
      { title: 'Kuis', date: '2026-10-22', kind: 'kuis' }, { title: 'Kuliah', date: '2026-10-20', kind: 'kuliah' },
    ] });
    expect(computeReminders(db, MON_0750, DEFAULT_PREFS).map((r) => r.title.split(':')[1].trim()).sort()).toEqual(['UTS BD', 'UTS Stat']);
  });
  it('flags unfinished guidance follow-ups once, and respects turned-off groups', () => {
    const db = base({ guidance: [{ date: '2026-10-10', followup: 'Revisi bab 1', followupDone: false }, { date: '2026-10-11', followup: 'x', followupDone: true }] });
    expect(computeReminders(db, MON_0750, DEFAULT_PREFS).map((r) => r.title)).toEqual(['1 tindak lanjut bimbingan belum selesai']);
    expect(computeReminders(db, MON_0750, { ...DEFAULT_PREFS, thesis: false })).toHaveLength(0);
  });
});

describe('normalize (new fields)', () => {
  it('defaults plan kind and drops bad schedule days', () => {
    const db = base({ plans: [{ title: 'x' }], schedules: [{ day: 9 }, { day: 3, subject: 'S' }] });
    expect(db.plans[0].kind).toBe('kuliah');
    expect(db.schedules.map((s) => s.day)).toEqual([1, 3]);
    expect(db.stages).toEqual([]);
  });
});
