import { describe, expect, it } from 'vitest';
import { diff, normalize } from './store';
import { UUID_RE } from './util';

const ID = '00000000-0000-4000-8000-000000000001';

describe('normalize', () => {
  it('turns garbage into a valid empty DB', () => {
    for (const bad of [null, undefined, 42, 'x', [], {}]) {
      const db = normalize(bad);
      expect(db.journals).toEqual([]);
      expect(db.plans).toEqual([]);
      expect(db.schedules).toEqual([]);
      expect(db.resources).toEqual([]);
      expect(db.profile.name).toBe('Guru');
      expect(db.version).toBe(3);
    }
  });

  it('keeps valid fields and replaces non-UUID ids', () => {
    const db = normalize({
      profile: { name: 'Bu Sari', tz: 'Asia/Makassar' },
      classes: ['Matematika 8B', '', 7],
      journals: [{ id: 'j1', date: '2026-01-02', title: 'T', content: 'C', className: 'Matematika 8B' }],
    });
    expect(db.classes).toEqual(['Matematika 8B']);
    expect(db.profile).toEqual({ name: 'Bu Sari', tz: 'Asia/Makassar' });
    expect(UUID_RE.test(db.journals[0].id)).toBe(true);
    expect(db.journals[0]).toMatchObject({ title: 'T', content: 'C', className: 'Matematika 8B' });
  });

  it('coerces invalid enums and drops non-object rows', () => {
    const db = normalize({ journals: [{ content: 5 }, null, 'str'], plans: [{ kind: 'kuliah', done: 'yes' }], schedules: [{ day: 9 }, { day: 3 }], resources: [{ type: 'Nope' }] });
    expect(db.journals).toHaveLength(1);
    expect(db.journals[0]).toMatchObject({ title: 'Catatan Mengajar', content: '' });
    expect(db.plans[0]).toMatchObject({ kind: 'pelajaran', done: false });
    expect(db.schedules.map((s) => s.day)).toEqual([1, 3]);
    expect(db.resources[0].type).toBe('Materi');
  });

  it('keeps valid UUIDs stable', () => {
    const a = normalize({ journals: [{ id: ID }, {}] });
    const b = normalize(a);
    expect(b.journals.map((j) => j.id)).toEqual(a.journals.map((j) => j.id));
    expect(a.journals[0].id).toBe(ID);
  });
});

describe('diff (drives cloud sync)', () => {
  const base = () => normalize({ journals: [{ id: ID, title: 'A' }], plans: [{ id: '00000000-0000-4000-8000-000000000002', kind: 'tugas' }] });

  it('is empty when nothing changed', () => {
    const a = base();
    expect(diff(a, structuredClone(a))).toEqual([]);
  });

  it('reports upserts for added and edited items', () => {
    const a = base();
    const b = structuredClone(a);
    b.plans[0].done = true;
    b.schedules.push({ id: '00000000-0000-4000-8000-000000000003', className: 'X', day: 1, start: '', end: '', room: '', until: '' });
    expect(diff(a, b)).toEqual([
      { t: 'upsert', kind: 'plans', id: a.plans[0].id },
      { t: 'upsert', kind: 'schedules', id: '00000000-0000-4000-8000-000000000003' },
    ]);
  });

  it('reports deletes', () => {
    const a = base();
    const b = structuredClone(a);
    b.journals.pop();
    expect(diff(a, b)).toEqual([{ t: 'delete', kind: 'journals', id: ID }]);
  });

  it('reports profile changes for name, tz and classes', () => {
    const a = base();
    for (const mutate of [
      (d: typeof a) => { d.profile.name = 'Lain'; },
      (d: typeof a) => { d.profile.tz = 'Asia/Jayapura'; },
      (d: typeof a) => { d.classes.push('X'); },
    ]) {
      const b = structuredClone(a);
      mutate(b);
      expect(diff(a, b)).toEqual([{ t: 'profile' }]);
    }
  });
});
