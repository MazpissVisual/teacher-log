import { describe, expect, it } from 'vitest';
import { normalize } from './store';
import { agendaFor } from './agenda';
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
  const sch = { id: '1', className: 'Matematika 8B', day: 1, start: '08:00', end: '09:40', room: 'R. 8B', until: '' };
  it('expands weekly lessons onto the right weekday only', () => {
    const db = base({ schedules: [sch] });
    expect(agendaFor(db, '2026-10-19').map((a) => a.title)).toEqual(['Matematika 8B']);
    expect(agendaFor(db, '2026-10-26')).toHaveLength(1);
    expect(agendaFor(db, '2026-10-20')).toHaveLength(0);
  });
  it('stops repeating after `until`', () => {
    const db = base({ schedules: [{ ...sch, until: '2026-10-19' }] });
    expect(agendaFor(db, '2026-10-19')).toHaveLength(1);
    expect(agendaFor(db, '2026-10-26')).toHaveLength(0);
  });
  it('a one-off lesson plan for the same class replaces the weekly slot', () => {
    const db = base({ schedules: [sch], plans: [{ title: 'Pelajaran pengganti', date: '2026-10-19', time: '13:00', className: 'Matematika 8B', kind: 'pelajaran' }] });
    expect(agendaFor(db, '2026-10-19').map((a) => a.title)).toEqual(['Pelajaran pengganti']);
  });
  it('a test on the same day does not replace the weekly slot', () => {
    const db = base({ schedules: [sch], plans: [{ title: 'Ulangan Bab 3', date: '2026-10-19', time: '08:00', className: 'Matematika 8B', kind: 'ulangan' }] });
    expect(agendaFor(db, '2026-10-19')).toHaveLength(2);
  });
});
