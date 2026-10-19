import { describe, expect, it } from 'vitest';
import { diff, normalize } from './store';
import { sampleData } from './sample';
import { UUID_RE } from './util';

describe('normalize', () => {
  it('turns garbage into a valid empty DB', () => {
    for (const bad of [null, undefined, 42, 'x', [], {}]) {
      const db = normalize(bad);
      expect(db.journals).toEqual([]);
      expect(db.tasks).toEqual([]);
      expect(db.profile.name).toBe('Mahasiswa');
      expect(db.version).toBe(2);
    }
  });

  it('migrates v1 data: non-UUID ids are replaced, valid fields survive', () => {
    const db = normalize({
      profile: { name: 'Bu Sari', tz: 'Asia/Makassar' },
      classes: ['VII A', '', 7],
      journals: [{ id: 'j1', date: '2026-01-02', title: 'T', content: 'C', mood: 'great', type: 'detailed', className: 'VII A' }],
      tasks: [{ id: 't1', title: 'x', done: true, priority: 'high' }],
    });
    expect(db.classes).toEqual(['VII A']);
    expect(db.profile).toEqual({ name: 'Bu Sari', tz: 'Asia/Makassar' });
    expect(UUID_RE.test(db.journals[0].id)).toBe(true);
    expect(db.journals[0]).toMatchObject({ title: 'T', mood: 'great', type: 'detailed', className: 'VII A' });
    expect(db.tasks[0]).toMatchObject({ done: true, priority: 'high' });
  });

  it('coerces invalid enums and drops non-object rows', () => {
    const db = normalize({ journals: [{ mood: 'angry', type: 'weird', content: 5 }, null, 'str'], resources: [{ type: 'Nope' }], tasks: [{ priority: 'urgent' }] });
    expect(db.journals).toHaveLength(1);
    expect(db.journals[0]).toMatchObject({ mood: 'good', type: 'quick', content: '' });
    expect(db.resources[0].type).toBe('Materi');
    expect(db.tasks[0].priority).toBe('medium');
  });

  it('keeps valid UUIDs stable', () => {
    const a = normalize(sampleData());
    const b = normalize(a);
    expect(b.journals.map((j) => j.id)).toEqual(a.journals.map((j) => j.id));
  });

  it('sample data is already normalized', () => {
    const s = sampleData();
    expect(normalize(s).plans.map((p) => p.id)).toEqual(s.plans.map((p) => p.id));
  });
});

describe('diff (drives cloud sync)', () => {
  it('is empty when nothing changed', () => {
    const a = sampleData();
    expect(diff(a, structuredClone(a))).toEqual([]);
  });

  it('reports upserts for added and edited items', () => {
    const a = sampleData();
    const b = structuredClone(a);
    b.tasks[0].done = !b.tasks[0].done;
    b.resources.push({ id: '00000000-0000-4000-8000-000000000001', title: 'new', type: 'Ide', subject: '', description: '', url: '' });
    expect(diff(a, b)).toEqual([
      { t: 'upsert', kind: 'resources', id: '00000000-0000-4000-8000-000000000001' },
      { t: 'upsert', kind: 'tasks', id: a.tasks[0].id },
    ]);
  });

  it('reports deletes', () => {
    const a = sampleData();
    const b = structuredClone(a);
    const gone = b.journals.pop()!;
    expect(diff(a, b)).toEqual([{ t: 'delete', kind: 'journals', id: gone.id }]);
  });

  it('reports profile changes for name, tz, classes and subjects', () => {
    const a = sampleData();
    for (const mutate of [
      (d: typeof a) => { d.profile.name = 'Lain'; },
      (d: typeof a) => { d.profile.tz = 'Asia/Jayapura'; },
      (d: typeof a) => { d.classes.push('X'); },
      (d: typeof a) => { d.subjects = []; },
    ]) {
      const b = structuredClone(a);
      mutate(b);
      expect(diff(a, b)).toEqual([{ t: 'profile' }]);
    }
  });
});
