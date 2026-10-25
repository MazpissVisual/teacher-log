import { useState } from 'preact/hooks';
import { actions, useDB } from './store';
import type { Guidance, Journal, Mood, Plan, PlanKind, Priority, Resource, ResourceType, Schedule, Stage, StageStatus, Task } from './types';
import { MarkdownEditor } from './MarkdownEditor';
import { DAY_NAMES, KIND_LABEL, KINDS, WEEK_ORDER } from './agenda';
import { closeModal, openModal, toast } from './ui';
import { Check, Zap, BookOpen } from 'lucide-preact';
import { Icon, MoodIcon } from './icons';
import { moodLabel, todayIn, uid } from './util';

const fd = (e: Event) => new FormData(e.currentTarget as HTMLFormElement);
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function Options({ list, current }: { list: string[]; current?: string }) {
  // Keep a value that was removed from Settings selectable so editing never silently drops it.
  const all = current && !list.includes(current) ? [...list, current] : list;
  return <>{all.map((v) => <option value={v} selected={v === current}>{v}</option>)}</>;
}

const Actions = ({ label }: { label: string }) => (
  <div class="compact-actions">
    <button class="btn" type="submit"><Icon as={Check} size={16} /> {label}</button>
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
      title: s(f, 'title') || 'Catatan Kuliahku',
      className: s(f, 'className'), subject: s(f, 'subject'),
      topic: detailed ? s(f, 'topic') : '', worked: detailed ? s(f, 'worked') : '', improve: detailed ? s(f, 'improve') : '',
      pinned: journal?.pinned ?? false,
    });
    closeModal();
    toast('Jurnal berhasil disimpan');
  };

  return (
    <form onSubmit={submit}>
      <div class="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={type === 'quick'} class={`tab ${type === 'quick' ? 'active' : ''}`} onClick={() => setType('quick')}><Icon as={Zap} size={14} /> Catatan Cepat</button>
        <button type="button" role="tab" aria-selected={type === 'detailed'} class={`tab ${type === 'detailed' ? 'active' : ''}`} onClick={() => setType('detailed')}><Icon as={BookOpen} size={14} /> Jurnal Lengkap</button>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="j-date">Tanggal</label><input id="j-date" class="field" type="date" name="date" value={journal?.date ?? todayIn(db.profile.tz)} required /></div>
        <div class="form-group"><label for="j-title">Judul catatan</label><input id="j-title" class="field" name="title" placeholder="Judul singkat..." value={journal?.title ?? ''} /></div>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="j-class">Semester (opsional)</label><select id="j-class" class="field" name="className"><option value="">Tanpa semester</option><Options list={db.classes} current={journal?.className} /></select></div>
        <div class="form-group"><label for="j-subj">Mata kuliah (opsional)</label><select id="j-subj" class="field" name="subject"><option value="">Tanpa mata kuliah</option><Options list={db.subjects} current={journal?.subject} /></select></div>
      </div>
      <div class="form-group">
        <span class="group-label" id="mood-label">Seberapa paham kamu hari ini?</span>
        <div class="moods" role="group" aria-labelledby="mood-label">
          {MOODS.map((m) => (
            <button type="button" class={`mood ${mood === m ? 'selected' : ''}`} aria-pressed={mood === m} aria-label={moodLabel(m)} title={moodLabel(m)} onClick={() => setMood(m)}><MoodIcon m={m} size={22} /></button>
          ))}
        </div>
      </div>
      <div class="form-group"><label for="j-content">Catatan bebas *</label><MarkdownEditor id="j-content" name="content" rows={8} placeholder="Apa yang ingin kamu ingat dari kuliah hari ini?" value={journal?.content ?? ''} /></div>
      {type === 'detailed' && (
        <>
          <div class="form-group"><label for="j-topic">Topik kuliah</label><input id="j-topic" class="field" name="topic" value={journal?.topic ?? ''} /></div>
          <div class="form-group"><label for="j-worked">Apa yang sudah paham?</label><MarkdownEditor id="j-worked" name="worked" rows={4} value={journal?.worked ?? ''} /></div>
          <div class="form-group"><label for="j-improve">Apa yang masih bingung?</label><MarkdownEditor id="j-improve" name="improve" rows={4} value={journal?.improve ?? ''} /></div>
        </>
      )}
      <Actions label="Simpan Jurnal" />
      <p class="legend" style="margin-top:15px">Data tersimpan di perangkat ini.</p>
    </form>
  );
}
export const openJournal = (j?: Journal) => openModal(j ? 'Ubah Jurnal' : 'Jurnal Kuliah Baru', <JournalForm journal={j} />);

// ---------------- Plan ----------------
function PlanForm({ plan }: { plan?: Plan }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    actions.upsert('plans', {
      id: plan?.id ?? uid(), title: s(f, 'title'), date: s(f, 'date'), time: s(f, 'time'),
      className: s(f, 'className'), subject: s(f, 'subject'), objective: s(f, 'objective'), activities: s(f, 'activities'), kind: s(f, 'kind') as PlanKind,
    });
    closeModal();
    toast('Rencana tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="p-title">Judul rencana *</label><input id="p-title" class="field" name="title" value={plan?.title ?? ''} required placeholder="Contoh: UTS Basis Data" /></div>
      <div class="form-group"><label for="p-kind">Jenis</label><select id="p-kind" class="field" name="kind">{KINDS.map((k) => <option value={k} selected={k === (plan?.kind ?? 'kuliah')}>{KIND_LABEL[k]}</option>)}</select></div>
      <div class="cols-2">
        <div class="form-group"><label for="p-date">Tanggal</label><input id="p-date" class="field" type="date" name="date" value={plan?.date ?? todayIn(db.profile.tz)} required /></div>
        <div class="form-group"><label for="p-time">Jam</label><input id="p-time" class="field" type="time" name="time" value={plan?.time ?? '08:00'} /></div>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="p-class">Semester</label><select id="p-class" class="field" name="className"><option value="">Tidak ditentukan</option><Options list={db.classes} current={plan?.className} /></select></div>
        <div class="form-group"><label for="p-subj">Mata kuliah</label><select id="p-subj" class="field" name="subject"><option value="">Tidak ditentukan</option><Options list={db.subjects} current={plan?.subject} /></select></div>
      </div>
      <div class="form-group"><label for="p-obj">Target Belajar</label><textarea id="p-obj" class="field" name="objective">{plan?.objective ?? ''}</textarea></div>
      <div class="form-group"><label for="p-act">Rencana Kegiatan</label><textarea id="p-act" class="field" name="activities">{plan?.activities ?? ''}</textarea></div>
      <Actions label="Simpan Rencana" />
    </form>
  );
}
export const openPlan = (p?: Plan, date?: string) =>
  openModal(p ? 'Ubah Rencana Kuliah' : 'Rencana Kuliah Baru', <PlanForm plan={p ?? (date ? ({ date } as Plan) : undefined)} />);

// ---------------- Resource ----------------
const RTYPES: ResourceType[] = ['Materi', 'Ide', 'Link', 'Aktivitas'];
function ResourceForm({ resource }: { resource?: Resource }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    actions.upsert('resources', {
      id: resource?.id ?? uid(), title: s(f, 'title'), type: s(f, 'type') as ResourceType, subject: s(f, 'subject'), description: s(f, 'description'), url: s(f, 'url'),
    });
    closeModal();
    toast('Sumber tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="r-title">Judul *</label><input id="r-title" class="field" required name="title" value={resource?.title ?? ''} /></div>
      <div class="form-group"><label for="r-type">Jenis</label><select id="r-type" class="field" name="type">{RTYPES.map((t) => <option value={t} selected={t === (resource?.type ?? 'Materi')}>{t}</option>)}</select></div>
      <div class="form-group"><label for="r-subj">Mata kuliah (opsional)</label><select id="r-subj" class="field" name="subject"><option value="">Tanpa mata kuliah</option><Options list={db.subjects} current={resource?.subject} /></select></div>
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
      id: task?.id ?? uid(), title: s(f, 'title'), description: s(f, 'description'), subject: s(f, 'subject'), date: s(f, 'date'), priority: s(f, 'priority') as Priority, done: task?.done ?? false,
    });
    closeModal();
    toast('Tugas tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="t-title">Nama tugas *</label><input id="t-title" class="field" name="title" value={task?.title ?? ''} required placeholder="Apa yang ingin kamu selesaikan?" /></div>
      <div class="form-group"><label for="t-desc">Deskripsi</label><textarea id="t-desc" class="field" name="description" placeholder="Detail tugas, catatan, atau langkah-langkahnya">{task?.description ?? ''}</textarea></div>
      <div class="form-group"><label for="t-subj">Mata kuliah (opsional)</label><select id="t-subj" class="field" name="subject"><option value="">Tanpa mata kuliah</option><Options list={db.subjects} current={task?.subject} /></select></div>
      <div class="cols-2">
        <div class="form-group"><label for="t-date">Tenggat</label><input id="t-date" class="field" type="date" name="date" value={task?.date ?? todayIn(db.profile.tz)} /></div>
        <div class="form-group"><label for="t-prio">Prioritas</label><select id="t-prio" class="field" name="priority">{PRIOS.map((p) => <option value={p} selected={p === (task?.priority ?? 'medium')}>{PRIO_LABEL[p]}</option>)}</select></div>
      </div>
      <Actions label="Simpan Tugas" />
    </form>
  );
}
export const openTask = (t?: Task) => openModal(t ? 'Ubah Tugas' : 'Tugas Baru', <TaskForm task={t} />);


// ---------------- Weekly schedule ----------------
function ScheduleForm({ item }: { item?: Schedule }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    const start = s(f, 'start'), end = s(f, 'end');
    if (start && end && end <= start) return toast('Jam selesai harus setelah jam mulai');
    actions.upsert('schedules', {
      id: item?.id ?? uid(), subject: s(f, 'subject'), className: s(f, 'className'), day: Number(s(f, 'day')),
      start, end, room: s(f, 'room'), until: s(f, 'until'),
    });
    closeModal();
    toast('Jadwal tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="sc-subj">Mata kuliah *</label>
        <select id="sc-subj" class="field" name="subject" required><option value="">Pilih mata kuliah</option><Options list={db.subjects} current={item?.subject} /></select>
        {!db.subjects.length && <p class="legend">Tambahkan mata kuliah dulu di Pengaturan.</p>}
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="sc-day">Hari</label><select id="sc-day" class="field" name="day">{WEEK_ORDER.map((d) => <option value={d} selected={d === (item?.day ?? 1)}>{DAY_NAMES[d]}</option>)}</select></div>
        <div class="form-group"><label for="sc-room">Ruang (opsional)</label><input id="sc-room" class="field" name="room" value={item?.room ?? ''} placeholder="Contoh: Lab 2" /></div>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="sc-start">Mulai</label><input id="sc-start" class="field" type="time" name="start" value={item?.start ?? '08:00'} required /></div>
        <div class="form-group"><label for="sc-end">Selesai</label><input id="sc-end" class="field" type="time" name="end" value={item?.end ?? '09:40'} /></div>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="sc-class">Semester (opsional)</label><select id="sc-class" class="field" name="className"><option value="">Tidak ditentukan</option><Options list={db.classes} current={item?.className} /></select></div>
        <div class="form-group"><label for="sc-until">Berulang sampai (opsional)</label><input id="sc-until" class="field" type="date" name="until" value={item?.until ?? ''} /></div>
      </div>
      <Actions label="Simpan Jadwal" />
    </form>
  );
}
export const openSchedule = (item?: Schedule, subject?: string) =>
  openModal(item ? 'Ubah Jadwal Mingguan' : 'Jadwal Mingguan Baru', <ScheduleForm item={item ?? (subject ? ({ subject } as Schedule) : undefined)} />);

// ---------------- Thesis stage ----------------
export const STAGE_LABEL: Record<StageStatus, string> = { todo: 'Belum', doing: 'Berjalan', done: 'Selesai' };
function StageForm({ item }: { item?: Stage }) {
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    actions.upsert('stages', { id: item?.id ?? uid(), title: s(f, 'title'), status: s(f, 'status') as StageStatus, date: s(f, 'date'), note: s(f, 'note') });
    closeModal();
    toast('Tahap tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="st-title">Nama tahap *</label><input id="st-title" class="field" name="title" required value={item?.title ?? ''} placeholder="Contoh: Seminar proposal" /></div>
      <div class="cols-2">
        <div class="form-group"><label for="st-status">Status</label><select id="st-status" class="field" name="status">{(Object.keys(STAGE_LABEL) as StageStatus[]).map((k) => <option value={k} selected={k === (item?.status ?? 'todo')}>{STAGE_LABEL[k]}</option>)}</select></div>
        <div class="form-group"><label for="st-date">Target tanggal (opsional)</label><input id="st-date" class="field" type="date" name="date" value={item?.date ?? ''} /></div>
      </div>
      <div class="form-group"><label for="st-note">Catatan</label><textarea id="st-note" class="field" name="note">{item?.note ?? ''}</textarea></div>
      <Actions label="Simpan Tahap" />
    </form>
  );
}
export const openStage = (item?: Stage) => openModal(item ? 'Ubah Tahap' : 'Tahap Baru', <StageForm item={item} />);

// ---------------- Thesis guidance ----------------
function GuidanceForm({ item }: { item?: Guidance }) {
  const db = useDB();
  const lastLecturer = [...db.guidance].sort((a, b) => b.date.localeCompare(a.date))[0]?.lecturer ?? '';
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    const followup = s(f, 'followup');
    actions.upsert('guidance', {
      id: item?.id ?? uid(), date: s(f, 'date'), lecturer: s(f, 'lecturer'), notes: s(f, 'notes'), followup,
      followupDone: followup ? f.get('followupDone') === 'on' : false,
    });
    closeModal();
    toast('Catatan bimbingan tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="cols-2">
        <div class="form-group"><label for="g-date">Tanggal</label><input id="g-date" class="field" type="date" name="date" value={item?.date ?? todayIn(db.profile.tz)} required /></div>
        <div class="form-group"><label for="g-lect">Dosen pembimbing</label><input id="g-lect" class="field" name="lecturer" value={item?.lecturer ?? lastLecturer} placeholder="Nama atau inisial" /></div>
      </div>
      <div class="form-group"><label for="g-notes">Saran dan catatan dosen</label><textarea id="g-notes" class="field" name="notes">{item?.notes ?? ''}</textarea></div>
      <div class="form-group"><label for="g-follow">Tindak lanjut</label><textarea id="g-follow" class="field" name="followup" placeholder="Apa yang harus dikerjakan setelah bimbingan ini?">{item?.followup ?? ''}</textarea></div>
      <label class="check-row"><input type="checkbox" name="followupDone" checked={item?.followupDone ?? false} /> Tindak lanjut sudah selesai</label>
      <Actions label="Simpan Bimbingan" />
    </form>
  );
}
export const openGuidance = (item?: Guidance) => openModal(item ? 'Ubah Catatan Bimbingan' : 'Catatan Bimbingan Baru', <GuidanceForm item={item} />);
