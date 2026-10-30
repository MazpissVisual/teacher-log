import { actions, useDB } from './store';
import type { Journal, Plan, PlanKind, Resource, ResourceType, Schedule } from './types';
import { MarkdownEditor } from './MarkdownEditor';
import { DAY_NAMES, KIND_LABEL, KINDS, WEEK_ORDER } from './agenda';
import { closeModal, go, openModal, toast } from './ui';
import { Check } from 'lucide-preact';
import { Icon } from './icons';
import { todayIn, uid } from './util';

const fd = (e: Event) => new FormData(e.currentTarget as HTMLFormElement);
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function Options({ list, current }: { list: string[]; current?: string }) {
  // Keep a value that was removed from Settings selectable so editing never silently drops it.
  const all = current && !list.includes(current) ? [...list, current] : list;
  return <>{all.map((v) => <option value={v} selected={v === current}>{v}</option>)}</>;
}

const NoClasses = () => (
  <p class="legend">Belum ada kelas. <button type="button" class="link" onClick={() => { closeModal(); go('settings'); }}>Tambahkan di Pengaturan</button></p>
);

const Actions = ({ label }: { label: string }) => (
  <div class="compact-actions">
    <button class="btn" type="submit"><Icon as={Check} size={16} /> {label}</button>
    <button class="btn secondary" type="button" onClick={closeModal}>Batal</button>
  </div>
);

// ---------------- Journal ----------------
/** Starting point for a new note; the reflection headings are what the journal is for. */
export const JOURNAL_TEMPLATE = '## Yang berjalan baik\n- \n\n## Yang perlu diperbaiki\n- \n\n## Tindak lanjut\n- [ ] \n';

function JournalForm({ journal }: { journal?: Journal }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    const content = s(f, 'content');
    if (!content || content === JOURNAL_TEMPLATE.trim()) return toast('Catatan tidak boleh kosong');
    actions.upsert('journals', {
      id: journal?.id ?? uid(), date: s(f, 'date'), title: s(f, 'title') || 'Catatan Mengajar', content, className: s(f, 'className'),
    });
    closeModal();
    toast('Jurnal berhasil disimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="cols-2">
        <div class="form-group"><label for="j-date">Tanggal</label><input id="j-date" class="field" type="date" name="date" value={journal?.date ?? todayIn(db.profile.tz)} required /></div>
        <div class="form-group"><label for="j-class">Kelas (opsional)</label><select id="j-class" class="field" name="className"><option value="">Tanpa kelas</option><Options list={db.classes} current={journal?.className} /></select></div>
      </div>
      {!db.classes.length && !journal && <NoClasses />}
      <div class="form-group"><label for="j-title">Judul catatan</label><input id="j-title" class="field" name="title" placeholder="Judul singkat..." value={journal?.title ?? ''} /></div>
      <div class="form-group"><label for="j-content">Catatan *</label><MarkdownEditor id="j-content" name="content" rows={12} placeholder="Apa yang terjadi di kelas hari ini?" value={journal?.content ?? JOURNAL_TEMPLATE} /></div>
      <Actions label="Simpan Jurnal" />
    </form>
  );
}
export const openJournal = (j?: Journal) => openModal(j ? 'Ubah Jurnal' : 'Jurnal Baru', <JournalForm journal={j} />);

// ---------------- Plan ----------------
function PlanForm({ plan }: { plan?: Plan }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    const kind = s(f, 'kind') as PlanKind;
    actions.upsert('plans', {
      id: plan?.id ?? uid(), title: s(f, 'title'), date: s(f, 'date'), time: s(f, 'time'),
      className: s(f, 'className'), notes: s(f, 'notes'), kind, done: kind === 'tugas' ? plan?.done ?? false : false,
    });
    closeModal();
    toast('Rencana tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="p-title">Judul *</label><input id="p-title" class="field" name="title" value={plan?.title ?? ''} required placeholder="Contoh: Ulangan Bab 3" /></div>
      <div class="form-group"><label for="p-kind">Jenis</label><select id="p-kind" class="field" name="kind">{KINDS.map((k) => <option value={k} selected={k === (plan?.kind ?? 'pelajaran')}>{KIND_LABEL[k]}</option>)}</select></div>
      <div class="cols-2">
        <div class="form-group"><label for="p-date">Tanggal</label><input id="p-date" class="field" type="date" name="date" value={plan?.date ?? todayIn(db.profile.tz)} required /></div>
        <div class="form-group"><label for="p-time">Jam</label><input id="p-time" class="field" type="time" name="time" value={plan?.time ?? '07:30'} /></div>
      </div>
      <div class="form-group"><label for="p-class">Kelas</label><select id="p-class" class="field" name="className"><option value="">Tidak ditentukan</option><Options list={db.classes} current={plan?.className} /></select></div>
      {!db.classes.length && !plan && <NoClasses />}
      <div class="form-group"><label for="p-notes">Catatan</label><textarea id="p-notes" class="field" name="notes" placeholder="Tujuan pembelajaran, kegiatan, atau hal yang perlu disiapkan">{plan?.notes ?? ''}</textarea></div>
      <Actions label="Simpan Rencana" />
    </form>
  );
}
export const openPlan = (p?: Plan, date?: string) =>
  openModal(p ? 'Ubah Rencana' : 'Rencana Baru', <PlanForm plan={p ?? (date ? ({ date } as Plan) : undefined)} />);

// ---------------- Weekly schedule ----------------
function ScheduleForm({ item }: { item?: Schedule }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    const start = s(f, 'start'), end = s(f, 'end');
    if (start && end && end <= start) return toast('Jam selesai harus setelah jam mulai');
    actions.upsert('schedules', {
      id: item?.id ?? uid(), className: s(f, 'className'), day: Number(s(f, 'day')), start, end, room: s(f, 'room'), until: s(f, 'until'),
    });
    closeModal();
    toast('Jadwal tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="sc-class">Kelas *</label>
        <select id="sc-class" class="field" name="className" required><option value="">Pilih kelas</option><Options list={db.classes} current={item?.className} /></select>
        {!db.classes.length && <NoClasses />}
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="sc-day">Hari</label><select id="sc-day" class="field" name="day">{WEEK_ORDER.map((d) => <option value={d} selected={d === (item?.day ?? 1)}>{DAY_NAMES[d]}</option>)}</select></div>
        <div class="form-group"><label for="sc-room">Ruang (opsional)</label><input id="sc-room" class="field" name="room" value={item?.room ?? ''} placeholder="Contoh: R. 8B" /></div>
      </div>
      <div class="cols-2">
        <div class="form-group"><label for="sc-start">Mulai</label><input id="sc-start" class="field" type="time" name="start" value={item?.start ?? '07:30'} required /></div>
        <div class="form-group"><label for="sc-end">Selesai</label><input id="sc-end" class="field" type="time" name="end" value={item?.end ?? '09:00'} /></div>
      </div>
      <div class="form-group"><label for="sc-until">Berulang sampai (opsional)</label><input id="sc-until" class="field" type="date" name="until" value={item?.until ?? ''} /></div>
      <Actions label="Simpan Jadwal" />
    </form>
  );
}
export const openSchedule = (item?: Schedule) => openModal(item ? 'Ubah Jadwal Mingguan' : 'Jadwal Mingguan Baru', <ScheduleForm item={item} />);

// ---------------- Resource ----------------
export const RESOURCE_TYPES: ResourceType[] = ['Materi', 'Ide', 'Link', 'Aktivitas'];
function ResourceForm({ resource }: { resource?: Resource }) {
  const db = useDB();
  const submit = (e: Event) => {
    e.preventDefault();
    const f = fd(e);
    actions.upsert('resources', {
      id: resource?.id ?? uid(), title: s(f, 'title'), type: s(f, 'type') as ResourceType, className: s(f, 'className'), description: s(f, 'description'), url: s(f, 'url'),
    });
    closeModal();
    toast('Bahan tersimpan');
  };
  return (
    <form onSubmit={submit}>
      <div class="form-group"><label for="r-title">Judul *</label><input id="r-title" class="field" required name="title" value={resource?.title ?? ''} placeholder="Contoh: LKPD Pecahan" /></div>
      <div class="cols-2">
        <div class="form-group"><label for="r-type">Jenis</label><select id="r-type" class="field" name="type">{RESOURCE_TYPES.map((t) => <option value={t} selected={t === (resource?.type ?? 'Materi')}>{t}</option>)}</select></div>
        <div class="form-group"><label for="r-class">Kelas (opsional)</label><select id="r-class" class="field" name="className"><option value="">Semua kelas</option><Options list={db.classes} current={resource?.className} /></select></div>
      </div>
      <div class="form-group"><label for="r-desc">Deskripsi / catatan</label><textarea id="r-desc" class="field" name="description">{resource?.description ?? ''}</textarea></div>
      <div class="form-group"><label for="r-url">Tautan (opsional)</label><input id="r-url" class="field" name="url" type="url" value={resource?.url ?? ''} placeholder="https://..." /></div>
      <Actions label="Simpan Bahan" />
    </form>
  );
}
export const openResource = (r?: Resource) => openModal(r ? 'Ubah Bahan' : 'Bahan Baru', <ResourceForm resource={r} />);
