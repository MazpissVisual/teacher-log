import { useState } from 'preact/hooks';
import { actions, useDB } from './store';
import type { Journal, Mood, Plan, Priority, Resource, ResourceType, Task } from './types';
import { closeModal, openModal, toast } from './ui';
import { moodIcon, moodLabel, todayIn, uid } from './util';

const fd = (e: Event) => new FormData(e.currentTarget as HTMLFormElement);
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function Options({ list, current }: { list: string[]; current?: string }) {
  // Keep a value that was removed from Settings selectable so editing never silently drops it.
  const all = current && !list.includes(current) ? [...list, current] : list;
  return <>{all.map((v) => <option value={v} selected={v === current}>{v}</option>)}</>;
}

const Actions = ({ label }: { label: string }) => (
  <div class="compact-actions">
    <button class="btn" type="submit">💾 {label}</button>
    <button class="btn secondary" type="button" onClick={closeModal}>Batal</button>
  </div>
);

// ---------------- Journal ----------------
const MOODS: Mood[] = ['great', 'good', 'neutral', 'challenging'];

function JournalForm({ journal }: { journal?: Journal }) {
  const db = useDB();
  const [type, setType] = useState<Journal['type']>(journal?.type ?? 'quick');
  const [mood, setMood] = useState<Mood>(journal?.mood ?? 'good');

  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    const content = s(f, 'content');
    if (!content) return toast('Catatan tidak boleh kosong');
    const detailed = type === 'detailed';
    actions.upsert('journals', {
      id: journal?.id ?? uid(), date: s(f, 'date'), type, mood, content,
      title: s(f, 'title') || 'Catatan Mengajarku',
      className: s(f, 'className'), subject: s(f, 'subject'),
      topic: detailed ? s(f, 'topic') : '', worked: detailed ? s(f, 'worked') : '', improve: detailed ? s(f, 'improve') : '',
      pinned: journal?.pinned ?? false,
    });
    closeModal();
    toast('Jurnal berhasil disimpan ✨');
  };

  return (
    <form onSubmit={submit}>
      <div class="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={type === 'quick'} class={`tab ${type === 'quick' ? 'active' : ''}`} onClick={() => setType('quick')}>⚡ Catatan Cepat</button>
        <button type="button" role="tab" aria-selected={type === 'detailed'} class={`tab ${type === 'detailed' ? 'active' : ''}`} onClick={() => setType('detailed')}>📖 Jurnal Lengkap</button>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="j-date">Tanggal</label><input id="j-date" class="field" type="date" name="date" value={journal?.date ?? todayIn(db.profile.tz)} required /></div>
        <div class="form-group"><label for="j-title">Judul catatan</label><input id="j-title" class="field" name="title" placeholder="Judul singkat..." value={journal?.title ?? ''} /></div>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="j-class">Kelas (opsional)</label><select id="j-class" class="field" name="className"><option value="">Tanpa kelas</option><Options list={db.classes} current={journal?.className} /></select></div>
        <div class="form-group"><label for="j-subj">Mapel (opsional)</label><select id="j-subj" class="field" name="subject"><option value="">Tanpa mapel</option><Options list={db.subjects} current={journal?.subject} /></select></div>
      </div>
      <div class="form-group">
        <label id="mood-label">Bagaimana pembelajaranmu?</label>
        <div class="moods" role="group" aria-labelledby="mood-label">
          {MOODS.map((m) => (
            <button type="button" class={`mood ${mood === m ? 'selected' : ''}`} aria-pressed={mood === m} aria-label={moodLabel(m)} title={moodLabel(m)} onClick={() => setMood(m)}>{moodIcon(m)}</button>
          ))}
        </div>
      </div>
      <div class="form-group"><label for="j-content">Catatan bebas *</label><textarea id="j-content" class="field" name="content" required placeholder="Apa yang ingin kamu ingat dari hari ini?">{journal?.content ?? ''}</textarea></div>
      {type === 'detailed' && (
        <>
          <div class="form-group"><label for="j-topic">Topik pembelajaran</label><input id="j-topic" class="field" name="topic" value={journal?.topic ?? ''} /></div>
          <div class="form-group"><label for="j-worked">Apa yang berhasil?</label><textarea id="j-worked" class="field" name="worked">{journal?.worked ?? ''}</textarea></div>
          <div class="form-group"><label for="j-improve">Apa yang perlu diperbaiki?</label><textarea id="j-improve" class="field" name="improve">{journal?.improve ?? ''}</textarea></div>
        </>
      )}
      <Actions label="Simpan Jurnal" />
      <p class="legend" style="margin-top:15px">Data tersimpan di perangkat ini.</p>
    </form>
  );
}
export const openJournal = (j?: Journal) => openModal(j ? 'Ubah Jurnal' : 'Jurnal Mengajar Baru', <JournalForm journal={j} />);

// ---------------- Plan ----------------
function PlanForm({ plan }: { plan?: Plan }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    actions.upsert('plans', {
      id: plan?.id ?? uid(), title: s(f, 'title'), date: s(f, 'date'), time: s(f, 'time'),
      className: s(f, 'className'), subject: s(f, 'subject'), objective: s(f, 'objective'), activities: s(f, 'activities'),
    });
    closeModal();
    toast('Rencana tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="p-title">Judul rencana *</label><input id="p-title" class="field" name="title" value={plan?.title ?? ''} required placeholder="Contoh: Pengenalan Algoritma" /></div>
      <div class="cols-2">
        <div class="form-group"><label for="p-date">Tanggal</label><input id="p-date" class="field" type="date" name="date" value={plan?.date ?? todayIn(db.profile.tz)} required /></div>
        <div class="form-group"><label for="p-time">Jam</label><input id="p-time" class="field" type="time" name="time" value={plan?.time ?? '08:00'} /></div>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="p-class">Kelas</label><select id="p-class" class="field" name="className"><option value="">Tidak ditentukan</option><Options list={db.classes} current={plan?.className} /></select></div>
        <div class="form-group"><label for="p-subj">Mapel</label><select id="p-subj" class="field" name="subject"><option value="">Tidak ditentukan</option><Options list={db.subjects} current={plan?.subject} /></select></div>
      </div>
      <div class="form-group"><label for="p-obj">Tujuan Pembelajaran</label><textarea id="p-obj" class="field" name="objective">{plan?.objective ?? ''}</textarea></div>
      <div class="form-group"><label for="p-act">Rencana Aktivitas</label><textarea id="p-act" class="field" name="activities">{plan?.activities ?? ''}</textarea></div>
      <Actions label="Simpan Rencana" />
    </form>
  );
}
export const openPlan = (p?: Plan, date?: string) =>
  openModal(p ? 'Ubah Rencana Pembelajaran' : 'Rencana Pembelajaran Baru', <PlanForm plan={p ?? (date ? ({ date } as Plan) : undefined)} />);

// ---------------- Resource ----------------
const RTYPES: ResourceType[] = ['Materi', 'Ide', 'Link', 'Aktivitas'];
function ResourceForm({ resource }: { resource?: Resource }) {
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    actions.upsert('resources', {
      id: resource?.id ?? uid(), title: s(f, 'title'), type: s(f, 'type') as ResourceType, description: s(f, 'description'), url: s(f, 'url'),
    });
    closeModal();
    toast('Sumber tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="r-title">Judul *</label><input id="r-title" class="field" required name="title" value={resource?.title ?? ''} /></div>
      <div class="form-group"><label for="r-type">Jenis</label><select id="r-type" class="field" name="type">{RTYPES.map((t) => <option value={t} selected={t === (resource?.type ?? 'Materi')}>{t}</option>)}</select></div>
      <div class="form-group"><label for="r-desc">Deskripsi / Catatan</label><textarea id="r-desc" class="field" name="description">{resource?.description ?? ''}</textarea></div>
      <div class="form-group"><label for="r-url">URL (opsional)</label><input id="r-url" class="field" name="url" type="url" value={resource?.url ?? ''} placeholder="https://..." /></div>
      <Actions label="Simpan Sumber" />
    </form>
  );
}
export const openResource = (r?: Resource) => openModal(r ? 'Ubah Sumber' : 'Tambah Sumber', <ResourceForm resource={r} />);

// ---------------- Task ----------------
const PRIOS: Priority[] = ['low', 'medium', 'high'];
const PRIO_LABEL: Record<Priority, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };
export const prioLabel = (p: Priority) => PRIO_LABEL[p];
function TaskForm({ task }: { task?: Task }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    actions.upsert('tasks', {
      id: task?.id ?? uid(), title: s(f, 'title'), date: s(f, 'date'), priority: s(f, 'priority') as Priority, done: task?.done ?? false,
    });
    closeModal();
    toast('Tugas tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="t-title">Nama tugas *</label><input id="t-title" class="field" name="title" value={task?.title ?? ''} required placeholder="Apa yang ingin kamu selesaikan?" /></div>
      <div class="cols-2">
        <div class="form-group"><label for="t-date">Tenggat</label><input id="t-date" class="field" type="date" name="date" value={task?.date ?? todayIn(db.profile.tz)} /></div>
        <div class="form-group"><label for="t-prio">Prioritas</label><select id="t-prio" class="field" name="priority">{PRIOS.map((p) => <option value={p} selected={p === (task?.priority ?? 'medium')}>{PRIO_LABEL[p]}</option>)}</select></div>
      </div>
      <Actions label="Simpan Tugas" />
    </form>
  );
}
export const openTask = (t?: Task) => openModal(t ? 'Ubah Tugas' : 'Tugas Baru', <TaskForm task={t} />);
